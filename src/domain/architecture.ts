import type { Layout, ReferenceDocument, Room } from "./models";

/**
 * The floorplan and architectural documentation define the architecture.
 * Astra and any image provider may never alter these.
 */
export const LOCKED_ARCHITECTURE = [
  "walls",
  "doors",
  "windows",
  "room dimensions",
  "structural elements",
  "fixed joinery",
  "ceiling geometry",
  "architectural layout",
] as const;

/** Only approved assets in these families may change a render. */
export const CONFIGURABLE_SCOPE = [
  "furniture",
  "rugs",
  "decorative objects",
  "materials",
  "finishes",
  "colours",
  "lighting fixtures",
  "other approved assets",
] as const;

// Catalog categories that describe architecture rather than configurable assets.
const LOCKED_CATEGORY_TERMS = ["architecture", "structure", "structural", "wall geometry", "door", "window", "joinery", "ceiling"];

export function isLockedCategory(category: string) {
  const value = category.trim().toLowerCase();
  return LOCKED_CATEGORY_TERMS.some(term => value === term || value === term + "s");
}

export interface ArchitecturalConstraints {
  roomId: string;
  layoutId: string;
  locked: readonly string[];
  configurable: readonly string[];
  /** Floorplans and documents the provider must treat as the architectural source of truth. */
  sourceDocumentIds: string[];
  /** Set when the only plan is illustrative, so providers never treat it as real geometry. */
  planIsIllustrative: boolean;
}

export function architecturalConstraints(room: Room, layout: Layout, documents: ReferenceDocument[]): ArchitecturalConstraints {
  return {
    roomId: room.id,
    layoutId: layout.id,
    locked: LOCKED_ARCHITECTURE,
    configurable: CONFIGURABLE_SCOPE,
    sourceDocumentIds: documents
      .filter(doc => doc.kind === "floorplan" || (doc.kind === "pdf" && !doc.moodboardId && (!doc.roomId || doc.roomId === room.id)))
      .map(doc => doc.id),
    planIsIllustrative: !layout.floorplanDocumentId,
  };
}
