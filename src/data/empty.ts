import type { Database } from "../domain/models";
export function emptyDatabase(): Database {
  return { schemaVersion: 1, projects: [], buildings: [], floors: [], units: [], layouts: [], rooms: [],
    moodboards: [], assets: [], referenceDocuments: [], roomConfigurations: [], roomRenders: [], projectRules: [] };
}
