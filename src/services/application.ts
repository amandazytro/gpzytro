import type { ProjectRepository } from "../data/repository";
import type { AssetSelection, EditRoomRenderAction, RoomConfiguration, RoomRender } from "../domain/models";
import { architecturalConstraints } from "../domain/architecture";
import { computeAssetToggle } from "../domain/catalog";
import type { GeneratedRender, ImageGenerationService, RenderContext } from "./render-provider";

export interface Selection { projectId: string | null; buildingId: string | null; floorId: string | null; unitId: string | null; layoutId: string | null; roomId: string | null }
export const emptySelection = (): Selection => ({projectId:null,buildingId:null,floorId:null,unitId:null,layoutId:null,roomId:null});
const choose = <T extends {id:string}>(rows:T[], id:string|null) => rows.find(row=>row.id===id) ?? rows[0] ?? null;

/** Back-office loader used by the internal workspace. */
export async function loadWorkspace(repository: ProjectRepository, selection: Selection) {
  const projects=await repository.getProjects(), project=choose(projects,selection.projectId);
  const buildings=project?await repository.getBuildings(project.id):[], building=choose(buildings,selection.buildingId);
  const floors=building?await repository.getFloors(building.id):[], floor=floors.find(f=>f.id===selection.floorId)??null;
  const units=building?await repository.getUnits(building.id,floor?.id):[], unit=choose(units,selection.unitId);
  const layouts=unit?await repository.getLayouts(unit.id):[], layout=choose(layouts,selection.layoutId);
  const rooms=layout?await repository.getRooms(layout.id):[], room=choose(rooms,selection.roomId);
  const [moodboards,documents,configuration,renders,rules]=await Promise.all([
    room?repository.getMoodboards(room.id):[],
    building?repository.getReferenceDocuments(building.id,layout?.id,room?.id):[],
    room?repository.getRoomConfiguration(room.id):null,
    room?repository.getRoomRenders(room.id):[],
    project?repository.getProjectRules(project.id):[],
  ]);
  const assets=(await Promise.all(moodboards.map(b=>repository.getAssets(b.id)))).flat();
  return {projects,project,buildings,building,floors,floor,units,unit,layouts,layout,rooms,room,moodboards,documents,configuration,renders,rules,assets};
}
export type WorkspaceView = Awaited<ReturnType<typeof loadWorkspace>>;

/** Client experience: the residence as seen from the floorplan. */
export async function loadResidence(repository: ProjectRepository, unitId: string | null, layoutId: string | null) {
  const project=(await repository.getProjects())[0]??null;
  const building=project?(await repository.getBuildings(project.id))[0]??null:null;
  const units=building?await repository.getUnits(building.id):[], unit=choose(units,unitId);
  const floor=building&&unit?.floorId?(await repository.getFloors(building.id)).find(f=>f.id===unit.floorId)??null:null;
  const layouts=unit?await repository.getLayouts(unit.id):[], layout=choose(layouts,layoutId);
  const rooms=layout?(await repository.getRooms(layout.id)).filter(r=>r.id!=="PRISMAL_FULL_PLAN"):[];
  const floorplan=layout?.floorplanDocumentId?await repository.getReferenceDocument(layout.floorplanDocumentId):null;
  const configuredRoomIds=new Set((await Promise.all(rooms.map(async r=>(await repository.getMoodboards(r.id)).length?r.id:null))).filter(Boolean));
  return {project,building,floor,units,unit,layouts,layout,rooms,floorplan,configuredRoomIds};
}
export type ResidenceView = Awaited<ReturnType<typeof loadResidence>>;

/** Client experience: one room — its moodboards, approved assets, configuration and renders. */
export async function loadRoom(repository: ProjectRepository, residence: ResidenceView, roomId: string) {
  const room=residence.rooms.find(r=>r.id===roomId)??null;
  if(!room||!residence.building)return null;
  const [moodboards,documents,configuration,renders]=await Promise.all([
    repository.getMoodboards(room.id),
    repository.getReferenceDocuments(residence.building.id,room.layoutId,room.id),
    repository.getRoomConfiguration(room.id),
    repository.getRoomRenders(room.id),
  ]);
  const catalog=(await Promise.all(moodboards.map(b=>repository.getAssets(b.id)))).flat();
  return {room,moodboards,documents,configuration,renders,assets:catalog.filter(a=>a.approved)};
}
export type RoomView = NonNullable<Awaited<ReturnType<typeof loadRoom>>>;

export function blankConfiguration(roomId:string,layoutId:string):RoomConfiguration {
  return {id:"",roomId,layoutId,name:"Room configuration",notes:"",selectedAssets:[],revision:0,updatedAt:""};
}

export function createApplicationServices(repository: ProjectRepository, imageGeneration: ImageGenerationService) {
  async function context(roomId:string|null):Promise<RenderContext|null> {
    if(!roomId)return null;
    const configuration=await repository.getRoomConfiguration(roomId);
    if(!configuration)throw new Error("Save the room configuration before generating a render.");
    const assets=await Promise.all(configuration.selectedAssets.map(item=>repository.getAsset(item.assetId)));
    if(assets.some(asset=>!asset||!asset.approved))throw new Error("The selection contains an unavailable or unapproved asset.");
    for(const b of await repository.getBuildings())for(const u of await repository.getUnits(b.id)){
      const layout=(await repository.getLayouts(u.id)).find(l=>l.id===configuration.layoutId);
      const room=layout&&(await repository.getRooms(layout.id)).find(r=>r.id===roomId);
      if(!layout||!room)continue;
      const documents=await repository.getReferenceDocuments(b.id,layout.id,roomId);
      return {roomId,layoutId:layout.id,room,layout,configuration,documents,assets:assets.filter((a):a is NonNullable<typeof a>=>a!==null),architecture:architecturalConstraints(room,layout,documents)};
    }
    throw new Error("Room hierarchy is incomplete.");
  }
  async function generate(operation:"base"|"edit"|"variation", roomId:string|null, instructions:string, source?:GeneratedRender, count=2, signal?:AbortSignal, changes:EditRoomRenderAction[]=[]) {
    const ctx=await context(roomId); signal?.throwIfAborted();
    if(operation!=="base"&&!source)throw new Error("Generate or select a source render first.");
    if(source&&ctx&&!(await repository.getRoomRenders(ctx.roomId)).some(r=>r.id===source.id))throw new Error("The source render belongs to a different room.");
    const request={context:structuredClone(ctx),instructions,changes,signal};
    const results=operation==="base"?[await imageGeneration.generateBaseRoomRender(request)]
      :operation==="edit"?[await imageGeneration.editRoomRender({...request,source:source!})]
      :await imageGeneration.generateVariations({...request,source:source!,count});
    signal?.throwIfAborted();
    if(ctx) {
      const records:RoomRender[]=results.map(result=>({id:result.id,roomId:ctx.roomId,layoutId:ctx.layoutId,provider:result.provider,isPlaceholder:result.isPlaceholder,imageUrl:result.imageUrl,
        operation:result.operation,parentRenderId:result.parentRenderId,createdAt:result.createdAt,configurationSnapshot:structuredClone(ctx.configuration),assetSnapshot:structuredClone(ctx.assets),referenceDocumentIds:ctx.documents.map(d=>d.id),instructions}));
      await repository.saveRoomRenders(records);
    }
    return results;
  }
  async function saveSelection(view:WorkspaceView, selections:AssetSelection[]) {
    if(!view.room||!view.layout)throw new Error("Select a room first.");
    return repository.saveRoomConfiguration({...view.configuration??blankConfiguration(view.room.id,view.layout.id),selectedAssets:selections});
  }
  /**
   * The single entry point for changing a room's configuration — used by the tiles today and by Astra later.
   * Selecting an asset replaces the asset occupying the same element, whichever moodboard it came from.
   */
  async function applyAssetToggle(roomId:string, layoutId:string, assetId:string, toggle=true) {
    const current=(await repository.getRoomConfiguration(roomId))??blankConfiguration(roomId,layoutId);
    const roomAssets=(await Promise.all((await repository.getMoodboards(roomId)).map(b=>repository.getAssets(b.id)))).flat();
    // The repository re-validates approval, ownership, provenance, mixing and locked architecture on save.
    const {configuration,action}=computeAssetToggle(roomAssets,current,assetId,toggle);
    return {configuration:await repository.saveRoomConfiguration(configuration),action};
  }
  async function saveConfiguration(configuration:RoomConfiguration) {
    return repository.saveRoomConfiguration(configuration);
  }
  return {repository,imageGeneration,generate,saveSelection,applyAssetToggle,saveConfiguration};
}
export type ApplicationServices = ReturnType<typeof createApplicationServices>;
