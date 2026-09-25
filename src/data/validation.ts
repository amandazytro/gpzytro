import type { Database } from "../domain/models";
import { validateConfiguration, roomContext } from "../domain/catalog";
const tables = ["projects","buildings","floors","units","layouts","rooms","moodboards","assets","referenceDocuments","roomConfigurations","roomRenders","projectRules"] as const;
export function validateDatabase(value: unknown): asserts value is Database {
  if (!value || typeof value !== "object" || (value as Database).schemaVersion !== 1) throw new Error("Unsupported workspace data. Existing data was not changed.");
  const data = value as Database;
  for (const table of tables) {
    if (!Array.isArray(data[table])) throw new Error("Invalid data table: " + table);
    const ids = new Set<string>();
    for (const row of data[table]) {
      if (!row || typeof row !== "object" || typeof row.id !== "string" || !row.id || ids.has(row.id)) throw new Error("Invalid or duplicate ID in " + table);
      ids.add(row.id);
    }
  }
  function link(found: unknown, name: string) { if (!found) throw new Error("Invalid relationship: " + name); }
  for (const p of data.projects) if (typeof p.name !== "string" || typeof p.isDemo !== "boolean") throw new Error("Invalid project.");
  for (const b of data.buildings) { link(data.projects.find(p => p.id === b.projectId), "building/project"); if (typeof b.name !== "string") throw new Error("Invalid building name."); }
  for (const f of data.floors) link(data.buildings.find(b => b.id === f.buildingId), "floor/building");
  for (const u of data.units) { link(data.buildings.find(b => b.id === u.buildingId), "unit/building"); if (u.floorId) link(data.floors.find(f => f.id === u.floorId && f.buildingId === u.buildingId), "unit/floor"); }
  for (const l of data.layouts) link(data.units.find(u => u.id === l.unitId), "layout/unit");
  for (const r of data.rooms) { link(data.layouts.find(l => l.id === r.layoutId), "room/layout"); if (typeof r.name !== "string") throw new Error("Invalid room name."); }
  for (const board of data.moodboards) {
    const ctx = roomContext(data, board.roomId);
    link(ctx.layout.id === board.layoutId && ctx.building.id === board.buildingId, "moodboard/context");
    if (board.referencePdfId) link(data.referenceDocuments.find(doc => doc.id === board.referencePdfId && doc.moodboardId === board.id), "moodboard/PDF");
  }
  for (const doc of data.referenceDocuments) {
    link(data.buildings.find(b => b.id === doc.buildingId), "document/building");
    if (doc.layoutId) {
      const layout = data.layouts.find(l => l.id === doc.layoutId);
      link(layout && data.units.find(u => u.id === layout.unitId && u.buildingId === doc.buildingId), "document/layout");
    }
    if (doc.roomId) link(data.rooms.find(r => r.id === doc.roomId && r.layoutId === doc.layoutId), "document/room");
    if (doc.moodboardId) link(data.moodboards.find(b => b.id === doc.moodboardId && b.roomId === doc.roomId && b.layoutId === doc.layoutId), "document/moodboard");
    if (typeof doc.fileName !== "string" || (doc.storageReference !== null && typeof doc.storageReference !== "string")) throw new Error("Invalid document metadata.");
  }
  for (const b of data.buildings) if (b.exteriorDocumentId) link(data.referenceDocuments.find(d => d.id === b.exteriorDocumentId && d.buildingId === b.id), "building/exterior");
  for (const l of data.layouts) if (l.floorplanDocumentId) link(data.referenceDocuments.find(d => d.id === l.floorplanDocumentId && d.layoutId === l.id), "layout/floorplan");
  for (const a of data.assets) {
    const ctx = roomContext(data, a.roomId);
    link(a.layoutId === ctx.layout.id && a.unitId === ctx.unit.id && a.buildingId === ctx.building.id, "asset/context");
    link(data.moodboards.find(b => b.id === a.moodboardId && b.roomId === a.roomId && b.layoutId === a.layoutId), "asset/moodboard");
    if (a.sourcePdfId) link(data.referenceDocuments.find(d => d.id === a.sourcePdfId && d.moodboardId === a.moodboardId && d.roomId === a.roomId && d.layoutId === a.layoutId), "asset/PDF");
    if ([a.category,a.element,a.referenceName,a.referenceType,a.notes].some(v => typeof v !== "string") || typeof a.approved !== "boolean" || typeof a.canBeMixed !== "boolean") throw new Error("Invalid asset fields.");
    if (a.referencePage !== null && (!Number.isInteger(a.referencePage) || a.referencePage < 1)) throw new Error("Invalid reference page.");
    if (a.quantity !== null && (!Number.isFinite(a.quantity) || a.quantity <= 0)) throw new Error("Invalid asset quantity.");
  }
  for (const rule of data.projectRules) {
    link(data.projects.find(p => p.id === rule.projectId), "rule/project");
    if (!rule.constraint || typeof rule.enabled !== "boolean") throw new Error("Invalid project rule.");
    const c = rule.constraint;
    if (!(c.type === "allow_mixing" && typeof c.value === "boolean") && !(c.type === "allowed_categories" && Array.isArray(c.value) && c.value.every(v => typeof v === "string")) && !(c.type === "max_quantity" && Number.isFinite(c.value) && c.value > 0)) throw new Error("Invalid rule constraint.");
  }
  const roomsWithConfig = new Set<string>();
  for (const c of data.roomConfigurations) {
    if (!Array.isArray(c.selectedAssets) || typeof c.notes !== "string" || !Number.isInteger(c.revision) || c.revision < 1) throw new Error("Invalid configuration.");
    if (roomsWithConfig.has(c.roomId)) throw new Error("Duplicate room configuration.");
    roomsWithConfig.add(c.roomId); validateConfiguration(data,c);
  }
  for (const render of data.roomRenders) {
    const ctx = roomContext(data, render.roomId);
    link(ctx.layout.id === render.layoutId && render.configurationSnapshot.roomId === render.roomId && render.configurationSnapshot.layoutId === render.layoutId, "render/context");
    if (typeof render.isPlaceholder !== "boolean" || !Array.isArray(render.assetSnapshot) || !Array.isArray(render.referenceDocumentIds)) throw new Error("Invalid render record.");
    if (render.parentRenderId) link(data.roomRenders.find(r => r.id === render.parentRenderId && r.roomId === render.roomId), "render/parent");
  }
}
