import type { Asset, Building, Floor, HierarchyKind, Layout, Moodboard, Project, ProjectRule, ReferenceDocument, Room, RoomConfiguration, RoomRender, Unit } from "../domain/models";
export interface ProjectRepository {
  getProjects(): Promise<Project[]>;
  getBuildings(projectId?: string): Promise<Building[]>;
  getFloors(buildingId: string): Promise<Floor[]>;
  getUnits(buildingId: string, floorId?: string): Promise<Unit[]>;
  getLayouts(unitId: string): Promise<Layout[]>;
  getRooms(layoutId: string): Promise<Room[]>;
  getMoodboards(roomId: string): Promise<Moodboard[]>;
  getAssets(moodboardId: string): Promise<Asset[]>;
  getAsset(assetId: string): Promise<Asset | null>;
  getReferenceDocument(documentId: string): Promise<ReferenceDocument | null>;
  getReferenceDocuments(buildingId: string, layoutId?: string, roomId?: string): Promise<ReferenceDocument[]>;
  getRoomConfiguration(roomId: string): Promise<RoomConfiguration | null>;
  getRoomRenders(roomId: string): Promise<RoomRender[]>;
  getProjectRules(projectId: string): Promise<ProjectRule[]>;
  createHierarchyItem(kind: HierarchyKind, parentId: string | null, name: string): Promise<string>;
  saveRoomConfiguration(configuration: RoomConfiguration): Promise<RoomConfiguration>;
  updateAssetFlags(id: string, patch: Pick<Asset, "approved" | "canBeMixed">): Promise<void>;
  saveRoomRenders(renders: RoomRender[]): Promise<void>;
  selectRoomMoodboard(roomId: string, moodboardId: string): Promise<void>;
}
