import { BrowserDataSource, LocalProjectRepository, MemoryDataSource } from "../data/local-repository";
import { prismalDatabase, withPrismalBase } from "../data/prismal";
import { createApplicationServices } from "./application";
import { HttpImageGenerationService } from "./render-provider";
export type WorkspaceMode = "real" | "demo";
export function createBrowserServices(mode:WorkspaceMode) {
  const initial=prismalDatabase;
  // Old sample catalog keys are never read. Real and demo workspaces are separate.
  const key="astra-projects-png-20260923";
  let storage:Storage;
  try {
    storage=window.localStorage;
    storage.removeItem("astra-projects-empty-v1"); storage.removeItem("astra-projects-empty-v2");
    const probe=key+"-probe";storage.setItem(probe,"1");storage.removeItem(probe);
  } catch {
    return {services:createApplicationServices(new LocalProjectRepository(new MemoryDataSource(initial())),new HttpImageGenerationService()),notice:"Browser storage is unavailable. This workspace will last for this session."};
  }
  const source = new BrowserDataSource(storage,key,initial);
  const dataSource = { read: () => withPrismalBase(source.read()), write: source.write.bind(source) };
  return {services:createApplicationServices(new LocalProjectRepository(dataSource),new HttpImageGenerationService()),notice:""};
}
export function resetBrowserWorkspace(mode:WorkspaceMode) {
  try { window.localStorage.removeItem(mode==="demo"?"astra-demo-residence-v2":"astra-projects-png-20260923"); } catch {}
}
