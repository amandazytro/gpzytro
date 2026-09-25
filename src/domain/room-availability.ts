// Temporary project availability; geometry and saved data remain intact.
const lockedRooms = new Set(['PRISMAL_STAIR_NORTH','PRISMAL_STAIR_SOUTH','PRISMAL_WC1','PRISMAL_WC2']);
export function isRoomLocked(id: string) { return lockedRooms.has(id); }
