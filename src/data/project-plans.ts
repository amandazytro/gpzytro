export const PLAN_WIDTH = 882;
export const PLAN_HEIGHT = 580;
export const projectPlans = {
  floor: { name: 'Planta baixa', display: '/plans/floorplan-aligned.svg', image: '/plans/floorplan-reference.png', original: '/plans/floorplan-source.svg', width: PLAN_WIDTH, height: PLAN_HEIGHT },
  ceiling: { name: 'Planta de teto', display: '/plans/ceiling-page-1.png', image: '/plans/ceiling-page-1.png', original: '/plans/ceiling-source.pdf', width: 3576, height: 2526 },
} as const;