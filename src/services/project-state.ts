import {getMoodboardContext} from './moodboard-context';
import {COMPOSITION_REVISION} from './product-options';
import {registeredPlanContext} from './plan-product-catalog';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prismalRooms } from '../data/prismal-rooms';
import { loadCatalogPolicy, type MoodboardNumber } from './catalog-policy';
export interface RoomImage {id:string;url:string;createdAt:string;compositionRevision?:string;referenceRevision?:string;productIds?:string[]}
export interface SavedRoom {roomId:string;image:RoomImage;moodboardId:string|null;moodboardNumber?:MoodboardNumber;savedAt:string}
export interface CachedRoom {roomId:string;image:RoomImage;contextKey:string}
export interface ProjectDirection {prompt:string;references:{name:string;dataUrl:string}[];updatedAt:string}
export interface ProjectState {version:1;direction?:ProjectDirection;savedCompositions?:Record<string,Partial<Record<MoodboardNumber,SavedRoom>>>;savedRooms:Record<string,SavedRoom>;cachedRooms:Record<string,CachedRoom>}
const directory=()=>process.env.ASTRA_DATA_DIR || path.join(process.cwd(),'.render-data');
const statePath=()=>path.join(directory(),'project-state.json');
const empty=():ProjectState=>({version:1,savedCompositions:{},savedRooms:{},cachedRooms:{}});
let writeQueue:Promise<unknown>=Promise.resolve();
export async function saveProjectDirection(prompt:string,references:ProjectDirection['references']){return mutate(state=>{state.direction={prompt,references,updatedAt:new Date().toISOString()};state.cachedRooms={};});}
export function projectRoom(id:string){return prismalRooms.find(r=>'PRISMAL_'+r.key===id);}
export function baseRoomImage(roomId:string):RoomImage | null {
  const room=projectRoom(roomId);if(!room)throw new Error('Ambiente inválido.');
  return null;
}
export async function readProjectState():Promise<ProjectState>{
  let raw:string;
  try{raw=await readFile(statePath(),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return empty();throw e;}
  const state=JSON.parse(raw);
  if(state?.version!==1||!state.savedRooms||!state.cachedRooms)throw new Error('Estado salvo do projeto inválido.');
  state.savedCompositions??={};
  for(const saved of Object.values(state.savedRooms) as SavedRoom[]){state.savedCompositions[saved.roomId]??={};state.savedCompositions[saved.roomId][saved.moodboardNumber??'1']??=saved;}
  return state;
}
async function mutate(update:(state:ProjectState)=>void){
  const task=writeQueue.then(async()=>{const state=await readProjectState();update(state);await mkdir(directory(),{recursive:true});const temporary=path.join(directory(),'project-state-'+crypto.randomUUID()+'.tmp');await writeFile(temporary,JSON.stringify(state,null,2));await rename(temporary,statePath());return state;});
  writeQueue=task.catch(()=>undefined);return task;
}
/** Conservative visibility references: adjoining rooms, including spaces behind the Lounge glazing. */
export function visibleSavedRooms(roomId:string,state:ProjectState):SavedRoom[]{
  const current=projectRoom(roomId);if(!current)return [];
  const bounds=(points:number[][])=>({left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))});
  const a=bounds(current.polygon);
  return Object.values(state.savedRooms).filter(saved=>{
    if(saved.roomId===roomId)return false;
    const room=projectRoom(saved.roomId);if(!room)return false;
    const b=bounds(room.polygon);
    return Math.max(0,a.left-b.right,b.left-a.right)<=220&&Math.max(0,a.top-b.bottom,b.top-a.bottom)<=180;
  }).sort((a,b)=>a.roomId.localeCompare(b.roomId)).slice(0,8);
}
export function roomContextKey(roomId:string,state:ProjectState){return createHash('sha256').update(JSON.stringify(visibleSavedRooms(roomId,state).map(r=>[r.roomId,r.image.id,r.savedAt]))).digest('hex');}
export async function cacheRoomImage(roomId:string,image:RoomImage,contextKey:string){return mutate(state=>{state.cachedRooms[roomId]={roomId,image,contextKey};});}
export async function saveRoomComposition(input:{roomId:string;moodboardId?:string;moodboardNumber?:MoodboardNumber;imageId?:string}){
  if(!projectRoom(input.roomId))throw new Error('Ambiente inválido.');
  const number=input.moodboardNumber??(input.moodboardId?.endsWith('_2')?'2':input.moodboardId?.endsWith('_3')?'3':'1');
  if(!['1','2','3'].includes(number))throw new Error('Moodboard inválido.');
  const catalog=await loadCatalogPolicy(number);
  if(catalog.status==='pending'&&!(await registeredPlanContext(input.roomId)).references.length)throw new Error('Este moodboard aguarda a tabela de produtos.');
  let image:RoomImage;
  let moodboardId:string|null=null;
  if(input.imageId){
    if(!/^[a-f0-9-]{36}$/.test(input.imageId))throw new Error('Imagem inválida.');
    const provenance=JSON.parse(await readFile(path.join(directory(),input.imageId+'.json'),'utf8'));
    if(catalog.referenceStrategy==='instances'&&!(await renderReferencesCurrent(input.imageId,input.roomId,number)))throw new Error('As referências ou a planta mudaram. Gere uma nova composição antes de salvar.');
    if(provenance.roomId!==input.roomId||String(provenance.moodboardNumber??'1')!==number)throw new Error('Esta imagem não pertence ao ambiente.');
    await readFile(path.join(directory(),input.imageId+'.png'));
    image={id:input.imageId,url:'/api/renders/'+input.imageId,createdAt:provenance.createdAt,compositionRevision:provenance.compositionRevision,referenceRevision:provenance.referenceRevision,productIds:provenance.selectedProductIds??[]};
  }else{if(catalog.status==='ready'||number!=='1')throw new Error('Gere uma imagem com o catálogo aprovado antes de salvar.');throw new Error('Gere uma nova imagem antes de salvar.');}
  const saved:SavedRoom={roomId:input.roomId,image,moodboardId,moodboardNumber:number,savedAt:new Date().toISOString()};
  await mutate(state=>{state.savedRooms[input.roomId]=saved;state.savedCompositions??={};state.savedCompositions[input.roomId]??={};state.savedCompositions[input.roomId][number]=saved;});return saved;
}
/** Saved files remain available as history, but stale geometry is never an automatic generation source. */
export async function renderReferencesCurrent(id:string,roomId?:string,number:MoodboardNumber='1'){
 if(!/^[a-f0-9-]{36}$/.test(id))return false;
 const policy=await loadCatalogPolicy(number);
 if(policy.referenceStrategy!=='instances')return true;
 try{
  const provenance=JSON.parse(await readFile(path.join(directory(),id+'.json'),'utf8'));
  if((provenance.roomId??null)!==(roomId??null)||String(provenance.moodboardNumber??'1')!==number||provenance.compositionRevision!==COMPOSITION_REVISION)return false;
  const current=await getMoodboardContext(number,roomId,provenance.selectedProductIds??[],policy);
  return provenance.referenceRevision===current.revision;
 }catch{return false;}
}
