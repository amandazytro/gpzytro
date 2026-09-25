import type { PlanDrawing, PlanPoint, PlanSymbol } from "../domain/models";

/**
 * DEMO ONLY. Illustrative apartment drawings used to demonstrate floorplan navigation.
 * They are not a real project, not to scale for construction, and must be replaced by supplied floorplans.
 */
export interface DemoPlanRoom { key: string; name: string; kind: string; polygon: PlanPoint[]; label: PlanPoint }
export interface DemoPlan { drawing: PlanDrawing; rooms: DemoPlanRoom[] }

const rect = (x1: number, y1: number, x2: number, y2: number): PlanPoint[] => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const W = 1400, H = 1000;

const layoutA: DemoPlan = {
  rooms: [
    { key: "LIVING_ROOM", name: "Living Room", kind: "living_room", polygon: rect(0, 0, 640, 540), label: [320, 120] },
    { key: "DINING_ROOM", name: "Dining Room", kind: "dining_room", polygon: rect(640, 0, 960, 540), label: [800, 420] },
    { key: "KITCHEN", name: "Kitchen", kind: "kitchen", polygon: rect(960, 0, 1400, 380), label: [1150, 150] },
    { key: "MASTER_BEDROOM", name: "Master Bedroom", kind: "bedroom", polygon: rect(0, 660, 620, 1000), label: [395, 830] },
    { key: "BATHROOM", name: "Bathroom", kind: "bathroom", polygon: rect(620, 660, 880, 1000), label: [750, 840] },
    { key: "BEDROOM", name: "Bedroom", kind: "bedroom", polygon: rect(880, 660, 1400, 1000), label: [1040, 800] },
  ],
  drawing: {
    width: W, height: H, isIllustrative: true,
    exterior: rect(0, 0, W, H),
    circulation: [{ label: "Entry", polygon: [[960, 380], [1400, 380], [1400, 660], [0, 660], [0, 540], [960, 540]] }],
    openings: [
      { from: [640, 70], to: [640, 470] },
      { from: [700, 540], to: [900, 540] },
      { from: [1010, 380], to: [1130, 380] },
      { from: [430, 540], to: [590, 540] },
    ],
    doors: [
      { hinge: [460, 660], jamb: [550, 660], swing: 1 },
      { hinge: [730, 660], jamb: [650, 660], swing: -1 },
      { hinge: [920, 660], jamb: [1010, 660], swing: 1 },
      { hinge: [1400, 430], jamb: [1400, 530], swing: 1 },
    ],
    windows: [
      { from: [80, 0], to: [560, 0] }, { from: [700, 0], to: [900, 0] }, { from: [1040, 0], to: [1320, 0] },
      { from: [0, 110], to: [0, 430] }, { from: [0, 740], to: [0, 920] },
      { from: [110, 1000], to: [500, 1000] }, { from: [690, 1000], to: [810, 1000] }, { from: [990, 1000], to: [1310, 1000] },
      { from: [1400, 90], to: [1400, 300] }, { from: [1400, 730], to: [1400, 930] },
    ],
    furniture: [
      { kind: "rug", x: 90, y: 160, w: 380, h: 300 },
      { kind: "sofa", x: 120, y: 400, w: 290, h: 95, rotate: 180 },
      { kind: "coffee_table", x: 205, y: 255, w: 120, h: 70 },
      { kind: "armchair", x: 500, y: 230, w: 85, h: 85, rotate: 270 },
      { kind: "console", x: 150, y: 30, w: 230, h: 45 },
      { kind: "plant", x: 560, y: 450, w: 55, h: 55 },
      { kind: "dining", x: 710, y: 170, w: 180, h: 100, seats: 6 },
      { kind: "counter", x: 980, y: 20, w: 400, h: 62 },
      { kind: "counter", x: 1318, y: 82, w: 62, h: 278 },
      { kind: "sink", x: 1080, y: 26, w: 70, h: 48 },
      { kind: "hob", x: 1322, y: 190, w: 54, h: 70 },
      { kind: "island", x: 1060, y: 200, w: 200, h: 85 },
      { kind: "bed", x: 30, y: 725, w: 210, h: 180, rotate: 90 },
      { kind: "nightstand", x: 30, y: 680, w: 45, h: 40 },
      { kind: "nightstand", x: 30, y: 910, w: 45, h: 40 },
      { kind: "wardrobe", x: 548, y: 690, w: 60, h: 290 },
      { kind: "bathtub", x: 640, y: 910, w: 220, h: 75 },
      { kind: "basin", x: 632, y: 690, w: 50, h: 120 },
      { kind: "wc", x: 800, y: 680, w: 50, h: 70 },
      { kind: "bed", x: 1180, y: 760, w: 200, h: 150, rotate: 270 },
      { kind: "nightstand", x: 1335, y: 710, w: 45, h: 40 },
      { kind: "desk", x: 900, y: 920, w: 150, h: 60, rotate: 180 },
    ],
  },
};

const layoutB: DemoPlan = {
  rooms: [
    { key: "KITCHEN", name: "Kitchen", kind: "kitchen", polygon: rect(0, 0, 420, 360), label: [250, 150] },
    { key: "DINING_ROOM", name: "Dining Room", kind: "dining_room", polygon: rect(420, 0, 760, 360), label: [590, 322] },
    { key: "LIVING_ROOM", name: "Living Room", kind: "living_room", polygon: rect(760, 0, 1400, 560), label: [1080, 100] },
    { key: "BATHROOM", name: "Bathroom", kind: "bathroom", polygon: rect(0, 360, 300, 660), label: [215, 440] },
    { key: "BEDROOM", name: "Bedroom", kind: "bedroom", polygon: rect(0, 660, 700, 1000), label: [440, 790] },
    { key: "MASTER_BEDROOM", name: "Master Bedroom", kind: "bedroom", polygon: rect(700, 660, 1400, 1000), label: [970, 820] },
  ],
  drawing: {
    width: W, height: H, isIllustrative: true,
    exterior: rect(0, 0, W, H),
    circulation: [{ label: "Entry", polygon: [[300, 360], [760, 360], [760, 560], [1400, 560], [1400, 660], [300, 660]] }],
    openings: [
      { from: [420, 60], to: [420, 300] },
      { from: [760, 60], to: [760, 300] },
      { from: [480, 360], to: [700, 360] },
      { from: [830, 560], to: [1010, 560] },
    ],
    doors: [
      { hinge: [300, 420], jamb: [300, 505], swing: 1 },
      { hinge: [850, 660], jamb: [760, 660], swing: -1 },
      { hinge: [650, 660], jamb: [560, 660], swing: -1 },
      { hinge: [1400, 570], jamb: [1400, 652], swing: 1 },
    ],
    windows: [
      { from: [80, 0], to: [340, 0] }, { from: [480, 0], to: [700, 0] }, { from: [840, 0], to: [1320, 0] },
      { from: [0, 80], to: [0, 290] }, { from: [0, 440], to: [0, 580] },
      { from: [1400, 80], to: [1400, 480] }, { from: [1400, 730], to: [1400, 940] },
      { from: [110, 1000], to: [580, 1000] }, { from: [820, 1000], to: [1280, 1000] },
    ],
    furniture: [
      { kind: "counter", x: 20, y: 20, w: 380, h: 62 },
      { kind: "counter", x: 20, y: 82, w: 62, h: 258 },
      { kind: "sink", x: 180, y: 26, w: 70, h: 48 },
      { kind: "hob", x: 24, y: 170, w: 54, h: 70 },
      { kind: "island", x: 180, y: 180, w: 170, h: 80 },
      { kind: "round_dining", x: 520, y: 110, w: 140, h: 140, seats: 4 },
      { kind: "rug", x: 850, y: 150, w: 400, h: 320 },
      { kind: "sofa", x: 890, y: 420, w: 300, h: 95, rotate: 180 },
      { kind: "coffee_table", x: 980, y: 270, w: 130, h: 70 },
      { kind: "armchair", x: 1275, y: 250, w: 85, h: 85, rotate: 270 },
      { kind: "armchair", x: 850, y: 40, w: 80, h: 80 },
      { kind: "plant", x: 1320, y: 480, w: 55, h: 55 },
      { kind: "shower", x: 20, y: 380, w: 110, h: 110 },
      { kind: "basin", x: 20, y: 530, w: 50, h: 110 },
      { kind: "wc", x: 210, y: 575, w: 50, h: 70, rotate: 180 },
      { kind: "bed", x: 25, y: 760, w: 200, h: 150, rotate: 90 },
      { kind: "nightstand", x: 25, y: 710, w: 45, h: 40 },
      { kind: "desk", x: 360, y: 920, w: 160, h: 60, rotate: 180 },
      { kind: "wardrobe", x: 720, y: 690, w: 60, h: 290 },
      { kind: "bed", x: 1170, y: 740, w: 210, h: 180, rotate: 270 },
      { kind: "nightstand", x: 1335, y: 690, w: 45, h: 40 },
      { kind: "nightstand", x: 1335, y: 930, w: 45, h: 40 },
    ],
  },
};

function mirror(plan: DemoPlan): DemoPlan {
  const p = ([x, y]: PlanPoint): PlanPoint => [W - x, y];
  const flipRotation: Record<number, 0 | 90 | 180 | 270> = { 0: 0, 90: 270, 180: 180, 270: 90 };
  const d = plan.drawing;
  return {
    rooms: plan.rooms.map(room => ({ ...room, polygon: room.polygon.map(p), label: p(room.label) })),
    drawing: {
      ...d,
      exterior: d.exterior.map(p),
      circulation: d.circulation.map(c => ({ ...c, polygon: c.polygon.map(p) })),
      openings: d.openings.map(o => ({ from: p(o.from), to: p(o.to) })),
      doors: d.doors.map(door => ({ hinge: p(door.hinge), jamb: p(door.jamb), swing: (door.swing * -1) as 1 | -1 })),
      windows: d.windows.map(o => ({ from: p(o.from), to: p(o.to) })),
      furniture: d.furniture.map((f): PlanSymbol => ({ ...f, x: W - f.x - f.w, rotate: flipRotation[f.rotate ?? 0] })),
    },
  };
}

// Layout C: mirrored arrangement with the second bedroom folded into a larger master suite.
const layoutC: DemoPlan = (() => {
  const base = mirror(layoutA);
  const rooms = base.rooms
    .filter(room => room.key !== "BEDROOM")
    .map(room => room.key === "MASTER_BEDROOM" ? { ...room, polygon: rect(620, 660, 1400, 1000), label: [980, 790] as PlanPoint }
      : room.key === "BATHROOM" ? { ...room, polygon: rect(0, 660, 260, 1000), label: [150, 800] as PlanPoint } : room);
  rooms.push({ key: "STUDY", name: "Study", kind: "study", polygon: rect(260, 660, 620, 1000), label: [420, 790] });
  const drawing = base.drawing;
  drawing.doors = drawing.doors.filter(door => door.hinge[1] !== 660);
  drawing.doors.push({ hinge: [300, 660], jamb: [385, 660], swing: 1 }, { hinge: [220, 660], jamb: [140, 660], swing: -1 }, { hinge: [790, 660], jamb: [700, 660], swing: -1 });
  drawing.furniture = drawing.furniture.filter(f => f.y < 660).concat([
    { kind: "bed", x: 1170, y: 740, w: 210, h: 180, rotate: 270 },
    { kind: "nightstand", x: 1335, y: 690, w: 45, h: 40 },
    { kind: "nightstand", x: 1335, y: 930, w: 45, h: 40 },
    { kind: "armchair", x: 770, y: 850, w: 80, h: 80, rotate: 0 },
    { kind: "wardrobe", x: 640, y: 690, w: 60, h: 250 },
    { kind: "shower", x: 20, y: 880, w: 110, h: 100 },
    { kind: "basin", x: 20, y: 690, w: 50, h: 120 },
    { kind: "wc", x: 180, y: 900, w: 50, h: 70, rotate: 180 },
    { kind: "desk", x: 290, y: 920, w: 180, h: 60, rotate: 180 },
    { kind: "console", x: 560, y: 700, w: 45, h: 200 },
  ]);
  drawing.windows = drawing.windows.filter(w => !(w.from[1] === 1000 && w.to[1] === 1000)).concat([
    { from: [40, 1000], to: [200, 1000] }, { from: [300, 1000], to: [560, 1000] }, { from: [720, 1000], to: [1300, 1000] },
  ]);
  return { rooms, drawing };
})();

export const demoPlans: Record<"A" | "B" | "C", DemoPlan> = { A: layoutA, B: layoutB, C: layoutC };
