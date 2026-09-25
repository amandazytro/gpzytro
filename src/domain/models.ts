export type RecordStatus = "draft" | "pending" | "ready" | "archived";
export interface Project { id: string; name: string; isDemo: boolean }
export interface ImageRegion { points: { x: number; y: number }[] }
export interface Building { id: string; projectId: string; name: string; exteriorDocumentId: string | null }
export interface Floor { id: string; buildingId: string; name: string; level: number; exteriorRegion: ImageRegion | null }
export interface Unit { id: string; buildingId: string; floorId: string | null; name: string }
export interface Layout {
  id: string; unitId: string; name: string; floorplanDocumentId: string | null;
  /** Vector drawing used only when no floorplan document exists (demo / placeholder). Never a source of truth. */
  illustrativePlan?: PlanDrawing | null;
}
export interface Room {
  id: string; layoutId: string; name: string; kind: string; planRegion: ImageRegion | null;
  /** Optional label anchor on the plan (normalized 0–1). Defaults to the region centre. */
  planLabel?: { x: number; y: number } | null;
}
export interface Moodboard {
  id: string; buildingId: string; layoutId: string; roomId: string;
  name: string; optionNumber: string | null; referencePdfId: string | null;
  description: string; status: RecordStatus;
  /** Abstract colour swatches for presentation only. Not product data. */
  palette?: string[];
  previewImageUrl?: string;
  composition?: { element: string; description: string }[];
}
export interface Asset {
  id: string; buildingId: string; unitId: string; layoutId: string; roomId: string; moodboardId: string;
  category: string; element: string; referenceName: string; referenceType: string;
  finishMaterial: string | null; colour: string | null; quantity: number | null;
  sourcePdfId: string | null; sourcePdfName: string | null; referencePage: number | null;
  approved: boolean; canBeMixed: boolean; notes: string; previewImageUrl?: string | null;
}
export interface ReferenceDocument {
  id: string; buildingId: string; layoutId: string | null; roomId: string | null; moodboardId: string | null;
  name: string; fileName: string; fileType: string; storageReference: string | null;
  previewImageUrl?: string | null; previewWidth?: number; previewHeight?: number;
  kind: "pdf" | "floorplan" | "exterior" | "asset_reference" | "other";
  description: string; status: RecordStatus;
}
export interface AssetSelection { assetId: string; quantity: number }
export interface RoomConfiguration {
  id: string; roomId: string; layoutId: string; name: string; notes: string;
  moodboardId?: string;
  selectedAssets: AssetSelection[]; revision: number; updatedAt: string;
}
export type RenderOperation = "base" | "edit" | "variation";
export interface RoomRender {
  id: string; roomId: string; layoutId: string; provider: string; isPlaceholder: boolean;
  imageUrl: string | null; operation: RenderOperation; parentRenderId: string | null;
  configurationSnapshot: RoomConfiguration; assetSnapshot: Asset[];
  referenceDocumentIds: string[]; instructions: string; createdAt: string;
}
export interface ProjectRule {
  id: string; projectId: string; buildingId: string | null; layoutId: string | null; roomId: string | null;
  name: string; enabled: boolean;
  constraint: { type: "allow_mixing"; value: boolean } | { type: "allowed_categories"; value: string[] } | { type: "max_quantity"; value: number };
}
export interface Database {
  schemaVersion: 1; projects: Project[]; buildings: Building[]; floors: Floor[]; units: Unit[];
  layouts: Layout[]; rooms: Room[]; moodboards: Moodboard[]; assets: Asset[];
  referenceDocuments: ReferenceDocument[]; roomConfigurations: RoomConfiguration[];
  roomRenders: RoomRender[]; projectRules: ProjectRule[];
}
/** Placeholder architectural drawing in plan units (cm). Rooms come from Room.planRegion (normalized 0–1). */
export type PlanPoint = [number, number];
export interface PlanDrawing {
  width: number; height: number; isIllustrative: true;
  exterior: PlanPoint[];
  circulation: { label: string; polygon: PlanPoint[] }[];
  /** Passages with no door leaf. */
  openings: { from: PlanPoint; to: PlanPoint }[];
  doors: { hinge: PlanPoint; jamb: PlanPoint; swing: 1 | -1 }[];
  windows: { from: PlanPoint; to: PlanPoint }[];
  furniture: PlanSymbol[];
}
export interface PlanSymbol {
  kind: "sofa" | "armchair" | "coffee_table" | "rug" | "dining" | "round_dining" | "bed" | "nightstand" | "wardrobe" | "counter" | "island" | "hob" | "sink" | "bathtub" | "shower" | "wc" | "basin" | "desk" | "plant" | "console";
  /** Footprint box in plan units. rotate names the side the symbol's back faces: 0 top, 90 left, 180 bottom, 270 right. */
  x: number; y: number; w: number; h: number; rotate?: 0 | 90 | 180 | 270; seats?: number;
}
export interface EditRoomRenderAction { action: "edit_room_render"; room: string; layout: string; element: string; asset: string | null; previous_asset: string | null }
export type HierarchyKind = "project" | "building" | "unit" | "layout" | "room";
export interface ReplaceAssetAction { action: "replace_asset"; room: string; layout: string; current_asset: string; new_asset: string }
