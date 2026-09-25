import { emptyDatabase } from "./empty";
import { demoPlans } from "./demo-plans";
import type { Database } from "../domain/models";

/**
 * DEMO MODE dataset. Everything here is illustrative and labelled DEMO:
 * no real products, brands, files or project geometry. It exists only to demonstrate interactions
 * and is stored separately from real project data.
 */
const DEMO_NOTE = "DEMO — illustrative placeholder. Not a product and not project data.";

const palettes = [
  ["#b39674", "#e6dccd", "#7b6552", "#3f3730"],
  ["#d6d2ca", "#f0ede6", "#a9a499", "#6e6a63"],
  ["#6e706b", "#b9b3a8", "#2f312f", "#9b7c5d"],
];

interface DemoRoomCatalog { roomKey: string; code: string; label: string; sets: number; elements: { category: string; element: string; code: string }[] }
const catalogs: DemoRoomCatalog[] = [
  {
    roomKey: "LIVING_ROOM", code: "LIV", label: "Living", sets: 3,
    elements: [
      { category: "Furniture", element: "Sofa", code: "SOFA" },
      { category: "Furniture", element: "Coffee Table", code: "TABLE" },
      { category: "Furniture", element: "Armchair", code: "CHAIR" },
      { category: "Furniture", element: "Rug", code: "RUG" },
      { category: "Materials", element: "Floor", code: "FLOOR" },
      { category: "Materials", element: "Wall Finish", code: "WALL" },
      { category: "Lighting", element: "Pendant Light", code: "LIGHT" },
    ],
  },
  {
    roomKey: "MASTER_BEDROOM", code: "MBR", label: "Master_Bedroom", sets: 2,
    elements: [
      { category: "Furniture", element: "Bed", code: "BED" },
      { category: "Furniture", element: "Nightstand", code: "NIGHTSTAND" },
      { category: "Furniture", element: "Rug", code: "RUG" },
      { category: "Materials", element: "Floor", code: "FLOOR" },
      { category: "Lighting", element: "Bedside Lamp", code: "LAMP" },
    ],
  },
];

export function demoDatabase(): Database {
  const data = emptyDatabase();
  const buildingId = "DEMO_BUILDING", unitId = "DEMO_UNIT_1204";
  data.projects.push({ id: "DEMO_PROJECT", name: "Example Residence", isDemo: true });
  data.buildings.push({ id: buildingId, projectId: "DEMO_PROJECT", name: "Example Residence", exteriorDocumentId: null });
  data.floors.push({ id: "DEMO_FLOOR_12", buildingId, name: "Floor 12", level: 12, exteriorRegion: null });
  data.units.push({ id: unitId, buildingId, floorId: "DEMO_FLOOR_12", name: "Unit 1204" });

  for (const letter of ["A", "B", "C"] as const) {
    const plan = demoPlans[letter], layoutId = `DEMO_LAYOUT_${letter}`;
    data.layouts.push({ id: layoutId, unitId, name: `Layout ${letter}`, floorplanDocumentId: null, illustrativePlan: plan.drawing });
    for (const room of plan.rooms) {
      const roomId = `${layoutId}_${room.key}`;
      data.rooms.push({
        id: roomId, layoutId, name: room.name, kind: room.kind,
        planRegion: { points: room.polygon.map(([x, y]) => ({ x: x / plan.drawing.width, y: y / plan.drawing.height })) },
        planLabel: { x: room.label[0] / plan.drawing.width, y: room.label[1] / plan.drawing.height },
      });
      const catalog = catalogs.find(c => c.roomKey === room.key);
      if (!catalog) continue;
      for (let set = 1; set <= catalog.sets; set++) {
        const nn = String(set).padStart(2, "0"), nnn = String(set).padStart(3, "0");
        const moodboardId = `DEMO_${letter}_MB_${catalog.code}_${nn}`, docId = `DEMO_${letter}_DOC_${catalog.code}_${nn}`;
        const fileName = `DEMO_${catalog.label}_Set_${nn}.pdf`;
        data.moodboards.push({
          id: moodboardId, buildingId, layoutId, roomId, name: `Moodboard ${nn}`, optionNumber: nn,
          referencePdfId: docId, description: DEMO_NOTE, status: "ready", palette: palettes[set - 1],
        });
        data.referenceDocuments.push({
          id: docId, buildingId, layoutId, roomId, moodboardId, name: `Demo moodboard ${nn}`, fileName,
          fileType: "application/pdf", storageReference: null, kind: "pdf",
          description: "DEMO — no file attached. Stands in for the moodboard PDF a project will supply.", status: "draft",
        });
        catalog.elements.forEach((item, index) => data.assets.push({
          id: `DEMO_${letter}_AST_${catalog.code}_${item.code}_${nnn}`, buildingId, unitId, layoutId, roomId, moodboardId,
          category: item.category, element: item.element, referenceName: `${item.element} ${nn}`, referenceType: "Demo reference",
          finishMaterial: null, colour: null, quantity: null,
          sourcePdfId: docId, sourcePdfName: fileName, referencePage: index + 1,
          approved: true, canBeMixed: true, notes: DEMO_NOTE, previewImageUrl: null,
        }));
      }
    }
  }
  return data;
}
