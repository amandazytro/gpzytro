import { createAstraImage } from './astra-images';
import { baseRoomImage,cacheRoomImage,projectRoom,readProjectState,roomContextKey,visibleSavedRooms,renderReferencesCurrent } from './project-state';
import { loadCatalogPolicy } from './catalog-policy';
const active=new Map<string,Promise<Awaited<ReturnType<typeof prepare>>>>();
async function prepare(roomId:string){
  if(!projectRoom(roomId))throw new Error('Ambiente inválido.');
  const state=await readProjectState();
  if(state.savedRooms[roomId]&&await renderReferencesCurrent(state.savedRooms[roomId].image.id,roomId,state.savedRooms[roomId].moodboardNumber??'1'))return {image:state.savedRooms[roomId].image,saved:state.savedRooms[roomId],automatic:false};
  const key=roomContextKey(roomId,state),cached=state.cachedRooms[roomId];
  if(cached?.contextKey===key&&await renderReferencesCurrent(cached.image.id,roomId))return {image:cached.image,saved:null,automatic:false};
  if((await loadCatalogPolicy()).status==='pending')return {image:null,saved:null,automatic:false};
  const neighbors=visibleSavedRooms(roomId,state);
  // Keep supplied previews for now. Refresh an unsaved neighbor only when saved context changes.
  if(!neighbors.length||!process.env.OPENAI_API_KEY||(await loadCatalogPolicy()).status==='ready')return {image:baseRoomImage(roomId),saved:null,automatic:false};
  const image=await createAstraImage({roomId,prompt:'Mostre este ambiente a partir da perspectiva de referência. Preserve a arquitetura e a decoração em primeiro plano. Nas áreas vizinhas visíveis, inclusive através do vidro, aplique as composições salvas fornecidas como referências. Não invente aberturas para mostrar espaços que não são visíveis.'});
  await cacheRoomImage(roomId,image,key);
  return {image,saved:null,automatic:true};
}
export function roomSession(roomId:string){
  const ongoing=active.get(roomId);if(ongoing)return ongoing;
  const task=prepare(roomId).finally(()=>active.delete(roomId));active.set(roomId,task);return task;
}