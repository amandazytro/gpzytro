import type { Asset, Database, HierarchyKind, RoomConfiguration, RoomRender } from "../domain/models";
import { emptyDatabase } from "./empty";
import type { ProjectRepository } from "./repository";
import { validateDatabase } from "./validation";
import { validateConfiguration } from "../domain/catalog";
export interface DataSource { read(): Database; write(data: Database): void }
export class MemoryDataSource implements DataSource {
  private data: Database;
  constructor(initial = emptyDatabase()) { validateDatabase(initial); this.data = structuredClone(initial); }
  read() { return structuredClone(this.data); }
  write(data: Database) { this.data = structuredClone(data); }
}
export class BrowserDataSource implements DataSource {
  constructor(private storage: Storage, private key: string, private initial: () => Database = emptyDatabase) {}
  read() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return this.initial();
    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new Error("Stored workspace is unreadable. Your saved data has not been overwritten."); }
    validateDatabase(parsed); return parsed;
  }
  write(data: Database) { this.storage.setItem(this.key, JSON.stringify(data)); }
}
export class LocalProjectRepository implements ProjectRepository {
  constructor(private source: DataSource) {}
  private read() { const data = this.source.read(); validateDatabase(data); return data; }
  private commit(data: Database) { validateDatabase(data); this.source.write(data); }
  async getProjects() { return this.read().projects; }
  async getBuildings(projectId?: string) { return this.read().buildings.filter(b => !projectId || b.projectId === projectId); }
  async getFloors(buildingId: string) { return this.read().floors.filter(f => f.buildingId === buildingId); }
  async getUnits(buildingId: string, floorId?: string) { return this.read().units.filter(u => u.buildingId === buildingId && (!floorId || u.floorId === floorId)); }
  async getLayouts(unitId: string) { return this.read().layouts.filter(l => l.unitId === unitId); }
  async getRooms(layoutId: string) { return this.read().rooms.filter(r => r.layoutId === layoutId); }
  async getMoodboards(roomId: string) { return this.read().moodboards.filter(b => b.roomId === roomId); }
  async getAssets(moodboardId: string) { return this.read().assets.filter(a => a.moodboardId === moodboardId); }
  async getAsset(assetId: string) { return this.read().assets.find(a => a.id === assetId) ?? null; }
  async getReferenceDocument(documentId: string) { return this.read().referenceDocuments.find(d => d.id === documentId) ?? null; }
  async getReferenceDocuments(buildingId: string, layoutId?: string, roomId?: string) {
    return this.read().referenceDocuments.filter(d => d.buildingId === buildingId && (!layoutId || !d.layoutId || d.layoutId === layoutId) && (!roomId || !d.roomId || d.roomId === roomId));
  }
  async getRoomConfiguration(roomId: string) { return this.read().roomConfigurations.find(c => c.roomId === roomId) ?? null; }
  async getRoomRenders(roomId: string) { return this.read().roomRenders.filter(r => r.roomId === roomId); }
  async getProjectRules(projectId: string) { return this.read().projectRules.filter(r => r.projectId === projectId); }
  async createHierarchyItem(kind: HierarchyKind, parentId: string | null, name: string) {
    if (!name.trim()) throw new Error("Please enter a name.");
    const data = this.read(), id = kind.toUpperCase() + "_" + crypto.randomUUID();
    const base = { id, name: name.trim() };
    if (kind === "project") data.projects.push({ ...base, isDemo: false });
    if (kind === "building") data.buildings.push({ ...base, projectId: parentId ?? "", exteriorDocumentId: null });
    if (kind === "unit") data.units.push({ ...base, buildingId: parentId ?? "", floorId: null });
    if (kind === "layout") data.layouts.push({ ...base, unitId: parentId ?? "", name:base.name, floorplanDocumentId: null });
    if (kind === "room") data.rooms.push({ ...base, layoutId: parentId ?? "", kind: "unspecified", planRegion: null });
    this.commit(data); return id;
  }
  async saveRoomConfiguration(configuration: RoomConfiguration) {
    const data = this.read(), current = data.roomConfigurations.find(c => c.roomId === configuration.roomId);
    if ((current?.revision ?? 0) !== configuration.revision) throw new Error("This configuration changed elsewhere. Reload it before saving.");
    validateConfiguration(data, configuration);
    const saved = { ...structuredClone(configuration), id: current?.id ?? crypto.randomUUID(), revision: (current?.revision ?? 0) + 1, updatedAt: new Date().toISOString() };
    data.roomConfigurations = [...data.roomConfigurations.filter(c => c.roomId !== saved.roomId), saved];
    this.commit(data); return structuredClone(saved);
  }
  async updateAssetFlags(id: string, patch: Pick<Asset, "approved" | "canBeMixed">) {
    const data = this.read(), asset = data.assets.find(a => a.id === id);
    if (!asset) throw new Error("Asset not found.");
    Object.assign(asset,patch); this.commit(data);
  }
  async selectRoomMoodboard(roomId: string, moodboardId: string) {
    const data = this.read();
    const board = data.moodboards.find(b => b.id === moodboardId && b.roomId === roomId);
    const current = data.roomConfigurations.find(c => c.roomId === roomId);
    if (!board?.previewImageUrl || !board.composition?.length || !current) throw new Error('Composition unavailable for this room.');
    if (current.moodboardId === board.id) return;
    const now = new Date().toISOString();
    const configuration = {...current, moodboardId: board.id, selectedAssets: [], revision: current.revision + 1, updatedAt: now};
    validateConfiguration(data, configuration);
    data.roomConfigurations = data.roomConfigurations.map(c => c.roomId === roomId ? configuration : c);
    const source = data.roomRenders.filter(r => r.roomId === roomId).at(-1);
    data.roomRenders.push({id:crypto.randomUUID(),roomId,layoutId:board.layoutId,provider:'concept-preview',isPlaceholder:false,imageUrl:board.previewImageUrl,operation:'edit',parentRenderId:source?.id??null,configurationSnapshot:structuredClone(configuration),assetSnapshot:[],referenceDocumentIds:['PRISMAL_FLOORPLAN'],instructions:'Apply the complete '+board.name+' composition; preserve architecture and viewpoint.',createdAt:now});
    this.commit(data);
  }
  async saveRoomRenders(renders: RoomRender[]) {
    const data = this.read(); data.roomRenders.push(...structuredClone(renders)); this.commit(data);
  }
}
