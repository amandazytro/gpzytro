import type { Asset, Database, EditRoomRenderAction, RoomConfiguration, ReplaceAssetAction } from "./models";
import { isLockedCategory } from "./architecture";
export function roomContext(data: Database, roomId: string) {
  const room = data.rooms.find(item => item.id === roomId);
  const layout = data.layouts.find(item => item.id === room?.layoutId);
  const unit = data.units.find(item => item.id === layout?.unitId);
  const building = data.buildings.find(item => item.id === unit?.buildingId);
  if (!room || !layout || !unit || !building) throw new Error("Room hierarchy is incomplete.");
  return { room, layout, unit, building };
}
export function validateConfiguration(data: Database, config: RoomConfiguration) {
  const { room, layout, building } = roomContext(data, config.roomId);
  if (layout.id !== config.layoutId) throw new Error("Room does not belong to this layout.");
  if (config.moodboardId && !data.moodboards.some(b => b.id === config.moodboardId && b.roomId === config.roomId && b.layoutId === config.layoutId)) throw new Error('Moodboard does not belong to this room.');
  if (!config.name.trim()) throw new Error("A configuration name is required.");
  const ids = config.selectedAssets.map(item => item.assetId);
  if (new Set(ids).size !== ids.length) throw new Error("An asset may appear only once; adjust its quantity instead.");
  const assets = config.selectedAssets.map(selection => {
    const asset = data.assets.find(item => item.id === selection.assetId);
    if (!asset || !asset.approved) throw new Error("Only approved catalog assets can be selected.");
    if (asset.roomId !== room.id || asset.layoutId !== layout.id) throw new Error("Asset does not belong to this room and layout.");
    if (!Number.isFinite(selection.quantity) || selection.quantity <= 0) throw new Error("Quantity must be greater than zero.");
    const board = data.moodboards.find(item => item.id === asset.moodboardId);
    const pdf = data.referenceDocuments.find(item => item.id === asset.sourcePdfId);
    if (!board || board.roomId !== room.id || board.layoutId !== layout.id || !pdf || pdf.moodboardId !== board.id || pdf.roomId !== room.id || pdf.layoutId !== layout.id)
      throw new Error("Asset source PDF or moodboard provenance is incomplete.");
    if (isLockedCategory(asset.category)) throw new Error("Architectural elements are locked and cannot be configured.");
    return asset;
  });
  const elements = assets.map(elementKey);
  if (new Set(elements).size !== elements.length) throw new Error("Only one asset can be selected per element.");
  for (const asset of assets)
    if (assets.some(other => other.moodboardId !== asset.moodboardId && (!asset.canBeMixed || !other.canBeMixed)))
      throw new Error("Every asset in a cross-moodboard combination must allow mixing.");
  const rules = data.projectRules.filter(rule => rule.enabled && rule.projectId === building.projectId
    && (!rule.buildingId || rule.buildingId === building.id) && (!rule.layoutId || rule.layoutId === layout.id) && (!rule.roomId || rule.roomId === room.id));
  for (const rule of rules) {
    const c = rule.constraint;
    if (c.type === "allow_mixing" && !c.value && new Set(assets.map(item => item.moodboardId)).size > 1)
      throw new Error("Project rule disallows mixing moodboards.");
    if (c.type === "allowed_categories" && assets.some(asset => !c.value.includes(asset.category)))
      throw new Error("An asset category is disallowed by project rules.");
    if (c.type === "max_quantity" && config.selectedAssets.reduce((n, item) => n + item.quantity, 0) > c.value)
      throw new Error("Selection exceeds the project's quantity limit.");
  }
}
export function replaceConfigurationAsset(data: Database, config: RoomConfiguration, action: ReplaceAssetAction) {
  if (action.action !== "replace_asset" || action.room !== config.roomId || action.layout !== config.layoutId)
    throw new Error("Replacement context does not match this configuration.");
  if (!config.selectedAssets.some(item => item.assetId === action.current_asset)) throw new Error("Current asset is not selected.");
  const current = data.assets.find(item => item.id === action.current_asset);
  const next = data.assets.find(item => item.id === action.new_asset);
  if (!current || !next || current.category !== next.category || current.element !== next.element)
    throw new Error("Replacement must match the asset category and element.");
  const updated = { ...config, selectedAssets: config.selectedAssets.map(item => item.assetId === action.current_asset ? { ...item, assetId: action.new_asset } : item) };
  validateConfiguration(data, updated); return updated;
}

/** Stable key for a configurable slot in a room, e.g. "Coffee Table" → "coffee_table". */
export function elementKey(asset: Pick<Asset, "element">) {
  return asset.element.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
/** The set number a client sees ("Set 02") for a moodboard. */
export function setNumber(data: Pick<Database, "moodboards">, moodboardId: string) {
  const board = data.moodboards.find(item => item.id === moodboardId);
  const parsed = Number.parseInt(board?.optionNumber ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}
export function setLabel(data: Pick<Database, "moodboards">, moodboardId: string) {
  const n = setNumber(data, moodboardId);
  return n === null ? data.moodboards.find(item => item.id === moodboardId)?.name ?? "Set" : "Set " + String(n).padStart(2, "0");
}
/** Client-facing shape: one asset ID per element, which may come from different moodboards. */
export function selectedAssetsByElement(data: Pick<Database, "assets">, config: RoomConfiguration | null) {
  const result: Record<string, string> = {};
  for (const item of config?.selectedAssets ?? []) {
    const asset = data.assets.find(a => a.id === item.assetId);
    if (asset) result[elementKey(asset)] = asset.id;
  }
  return result;
}
/**
 * Selects one asset for its element, replacing whatever occupied that element (from any set).
 * With toggle, selecting the asset already chosen clears the element. Returns the edit action a render provider consumes.
 */
export function computeAssetToggle(assets: Asset[], config: RoomConfiguration, assetId: string, toggle = true): { configuration: RoomConfiguration; action: EditRoomRenderAction } {
  const data = { assets };
  const asset = data.assets.find(item => item.id === assetId);
  if (!asset) throw new Error("Asset not found in the approved catalog.");
  const key = elementKey(asset);
  const previous = config.selectedAssets.find(item => {
    const current = data.assets.find(a => a.id === item.assetId);
    return current && elementKey(current) === key;
  });
  const clearing = toggle && previous?.assetId === assetId;
  const selectedAssets = config.selectedAssets.filter(item => item !== previous);
  if (!clearing) selectedAssets.push({ assetId, quantity: asset.quantity ?? 1 });
  const configuration = { ...config, selectedAssets };
  return {
    configuration,
    action: { action: "edit_room_render", room: config.roomId, layout: config.layoutId, element: key, asset: clearing ? null : assetId, previous_asset: previous?.assetId ?? null },
  };
}
/** Pure toggle plus full catalog validation (approval, room ownership, provenance, mixing, locked architecture). */
export function toggleAssetSelection(data: Database, config: RoomConfiguration, assetId: string) {
  const result = computeAssetToggle(data.assets, config, assetId);
  validateConfiguration(data, result.configuration);
  return result;
}
export function clearElement(data: Database, config: RoomConfiguration, element: string) {
  const selected = selectedAssetsByElement(data, config)[element];
  return selected ? toggleAssetSelection(data, config, selected) : null;
}
