import type { Asset, EditRoomRenderAction, Layout, ReferenceDocument, RenderOperation, Room, RoomConfiguration } from "../domain/models";
import type { ArchitecturalConstraints } from "../domain/architecture";

/** Everything a provider needs. The architecture block is non-negotiable input, not a suggestion. */
export interface RenderContext {
  roomId: string; layoutId: string;
  room: Room; layout: Layout;
  configuration: RoomConfiguration;
  /** Approved assets currently selected, one per element, possibly from different moodboards. */
  assets: Asset[];
  documents: ReferenceDocument[];
  architecture: ArchitecturalConstraints;
}
export interface RenderRequest {
  context: RenderContext | null;
  instructions: string;
  /** Element-level changes since the source render (edit operations). */
  changes?: EditRoomRenderAction[];
  signal?: AbortSignal;
}
export interface GeneratedRender {
  referenceRevision?:string;
  id: string; provider: string; isPlaceholder: boolean; imageUrl: string | null;
  operation: RenderOperation; parentRenderId: string | null; createdAt: string; message: string;
}
export interface ImageGenerationService {
  readonly providerName: string;
  /** True only when a real image model is connected. */
  readonly generatesImages: boolean;
  /** FLOORPLAN + ARCHITECTURAL DOCUMENTATION + ROOM INFORMATION + REFERENCES → base room render. */
  generateBaseRoomRender(request: RenderRequest): Promise<GeneratedRender>;
  /** BASE RENDER + SELECTED ASSETS → edited render. Only configurable elements may change. */
  editRoomRender(request: RenderRequest & { source: GeneratedRender }): Promise<GeneratedRender>;
  generateVariations(request: RenderRequest & { source: GeneratedRender; count: number }): Promise<GeneratedRender[]>;
}

/** Structured brief handed to a real provider. Kept provider-agnostic so any image model can consume it. */
export function buildRenderBrief(request: RenderRequest, operation: RenderOperation) {
  const ctx = request.context;
  return {
    operation,
    room: ctx ? { id: ctx.room.id, name: ctx.room.name, kind: ctx.room.kind, layout: ctx.layout.name } : null,
    architecture: ctx ? {
      locked: ctx.architecture.locked,
      configurable: ctx.architecture.configurable,
      sourceDocumentIds: ctx.architecture.sourceDocumentIds,
      planIsIllustrative: ctx.architecture.planIsIllustrative,
      rule: "Do not alter any locked architectural element. Modify only the configurable elements listed in selections or changes.",
    } : null,
    roomRegion: ctx?.room.planRegion ?? null,
    documents: ctx?.documents.map(doc => ({ id: doc.id, name: doc.name, kind: doc.kind, image: doc.previewImageUrl ?? doc.storageReference })) ?? [],
    selections: ctx?.assets.map(asset => ({
      material: asset.finishMaterial, colour: asset.colour, quantity: ctx?.configuration.selectedAssets.find(s => s.assetId === asset.id)?.quantity ?? asset.quantity, element: asset.element, category: asset.category, assetId: asset.id, reference: asset.referenceName,
      moodboardId: asset.moodboardId, sourceDocumentId: asset.sourcePdfId, sourcePage: asset.referencePage, image: asset.previewImageUrl ?? null,
    })) ?? [],
    changes: request.changes ?? [],
    instructions: request.instructions,
  };
}

const PLACEHOLDER_MESSAGE = "No image provider is configured. This is a schematic placeholder of the configuration — not an AI render.";

export class MockImageGenerationService implements ImageGenerationService {
  readonly providerName = "placeholder";
  readonly generatesImages = false;
  constructor(private delayMs = 900) {}
  private async result(request: RenderRequest, operation: RenderOperation, parentRenderId: string | null): Promise<GeneratedRender> {
    request.signal?.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const finish = () => { request.signal?.removeEventListener("abort", cancel); resolve(); };
      const timer = setTimeout(finish, this.delayMs);
      const cancel = () => { clearTimeout(timer); reject(new DOMException("Generation cancelled.", "AbortError")); };
      request.signal?.addEventListener("abort", cancel, { once: true });
    });
    request.signal?.throwIfAborted();
    return { id: crypto.randomUUID(), provider: this.providerName, isPlaceholder: true, imageUrl: null, operation, parentRenderId, createdAt: new Date().toISOString(), message: PLACEHOLDER_MESSAGE };
  }
  generateBaseRoomRender(request: RenderRequest) { return this.result(request, "base", null); }
  editRoomRender(request: RenderRequest & { source: GeneratedRender }) { return this.result(request, "edit", request.source.id); }
  async generateVariations(request: RenderRequest & { source: GeneratedRender; count: number }) {
    if (!Number.isInteger(request.count) || request.count < 1 || request.count > 4) throw new Error("Choose between 1 and 4 variations.");
    return Promise.all(Array.from({ length: request.count }, () => this.result(request, "variation", request.source.id)));
  }
}

/**
 * Calls the server route that owns provider credentials,
 * so the browser never holds API keys.
 */
export class HttpImageGenerationService implements ImageGenerationService {
  readonly providerName = "server";
  readonly generatesImages = true;
  constructor(private endpoint = "/api/renders") {}
  private async call(request: RenderRequest, operation: RenderOperation, source?: GeneratedRender, count?: number): Promise<GeneratedRender[]> {
    const response = await fetch(this.endpoint, {
      method: "POST", headers: { "content-type": "application/json" }, signal: request.signal,
      body: JSON.stringify({ brief: buildRenderBrief(request, operation), sourceRenderId: source?.id ?? null, sourceImageUrl: source?.imageUrl ?? null, count: count ?? 1 }),
    });
    const body = await response.json().catch(() => null) as { renders?: GeneratedRender[]; error?: string } | null;
    if (!response.ok || !body?.renders) throw new Error(body?.error ?? "The render service is unavailable.");
    return body.renders;
  }
  async generateBaseRoomRender(request: RenderRequest) { return (await this.call(request, "base"))[0]; }
  async editRoomRender(request: RenderRequest & { source: GeneratedRender }) { return (await this.call(request, "edit", request.source))[0]; }
  generateVariations(request: RenderRequest & { source: GeneratedRender; count: number }) { return this.call(request, "variation", request.source, request.count); }
}
