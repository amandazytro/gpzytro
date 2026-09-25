import {isRoomLocked} from '../domain/room-availability';
import {readPlanProductCatalog} from './plan-product-catalog';
import {readPlanAreas} from './plan-areas';
import {readPlanInstances} from './plan-instances';
import {registeredProductFor} from '../domain/plan-product-catalog';
import {COMPOSITION_REVISION,compositionPlan} from './composition-plan';
import { generateRenders, RenderError } from './openai-render';
import { loadCatalogPolicy } from './catalog-policy';
import { PROJECT_REFERENCE } from './project-reference';
import { prismalRooms } from '../data/prismal-rooms';
import { loungeMoodboards } from '../data/lounge-moodboards';
import { baseRoomImage, projectRoom, readProjectState, visibleSavedRooms, renderReferencesCurrent, saveProjectDirection } from './project-state';
export interface AstraInput {
  saveComposition?:boolean;
  prompt:string; applyProjectDirection?:boolean; fullComposition?:boolean; moodboardNumber?:'1'|'2'|'3'; useBasePreview?:boolean; roomId?:string; sourceMoodboardId?:string; sourceImageId?:string; history?:{prompt:string}[];
  references?:{name:string;dataUrl:string}[]; productIds?:string[];
}
export function validateAstraInput(value:unknown):AstraInput {
  const b=value as AstraInput;
  if(b?.saveComposition!==undefined&&(typeof b.saveComposition!=='boolean'||b.saveComposition&&!b.roomId))throw new RenderError('Informe o ambiente para salvar a composição.');
  if(b?.applyProjectDirection!==undefined&&typeof b.applyProjectDirection!=='boolean')throw new RenderError('Direção visual inválida.');
  if(b?.fullComposition!==undefined&&typeof b.fullComposition!=='boolean')throw new RenderError('Composição inválida.');
  if(!b||typeof b.prompt!=='string'||!b.prompt.trim()||b.prompt.length>6000)throw new RenderError('Escreva um prompt de até 6.000 caracteres.');
  if(b.moodboardNumber!==undefined&&!['1','2','3'].includes(b.moodboardNumber))throw new RenderError('Moodboard inválido.');
  if(b.useBasePreview!==undefined&&typeof b.useBasePreview!=='boolean')throw new RenderError('Referência inválida.');
  if(b.roomId!==undefined&&(typeof b.roomId!=='string'||!projectRoom(b.roomId)))throw new RenderError('Ambiente inválido.');
  if(b.sourceMoodboardId!==undefined&&!loungeMoodboards.some(m=>m.id===b.sourceMoodboardId&&m.roomId===b.roomId&&m.optionNumber==='1'))throw new RenderError('Moodboard inválido para este ambiente.');
  if(b.sourceImageId!==undefined&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(b.sourceImageId))throw new RenderError('A imagem de referência é inválida.');
  if(b.history!==undefined&&(!Array.isArray(b.history)||b.history.length>8||b.history.some(t=>!t||typeof t.prompt!=='string'||t.prompt.length>6000)))throw new RenderError('O histórico da conversa é inválido.');
  if(b.references!==undefined&&(!Array.isArray(b.references)||b.references.length>2||b.references.some(r=>!r||typeof r.name!=='string'||r.name.length>180||typeof r.dataUrl!=='string'||r.dataUrl.length>8_000_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.dataUrl))))throw new RenderError('Envie até duas referências PNG, JPEG ou WebP de até 5 MB cada.');
  if(b.productIds!==undefined&&(!Array.isArray(b.productIds)||b.productIds.length>16||b.productIds.some(id=>typeof id!=='string'||id.length>120)))throw new RenderError('Seleção de produtos inválida.');
  return {...b,prompt:b.prompt.trim()};
}
export async function createAstraImage(value:unknown,signal?:AbortSignal){
  const input=validateAstraInput(value);
  if(input.roomId&&isRoomLocked(input.roomId))throw new RenderError('Este ambiente está bloqueado para criação.');
  const policy=await loadCatalogPolicy(input.moodboardNumber??'1');
  if(policy.status==='ready'&&policy.referenceStrategy!=='instances'&&input.references?.length)throw new RenderError('Este moodboard aceita apenas as imagens da tabela.');
  const fullComposition=policy.status==='ready'&&(input.fullComposition===true||input.useBasePreview===true);
  const plan=policy.status==='ready'&&policy.referenceStrategy!=='instances'?compositionPlan(input.roomId,policy,input.productIds??[]):undefined;
  if(input.applyProjectDirection)await saveProjectDirection(input.prompt,input.references??[]);
  const state=await readProjectState();
  const room=input.roomId?projectRoom(input.roomId):null;
  let neighbors=input.roomId?visibleSavedRooms(input.roomId,state):[];
  if(policy.referenceStrategy==='instances'){const checks=await Promise.all(neighbors.map(n=>renderReferencesCurrent(n.image.id,n.roomId,n.moodboardNumber??'1')));neighbors=neighbors.filter((_,i)=>checks[i]);}
  const sourceBoard=loungeMoodboards.find(b=>b.id===input.sourceMoodboardId);
  let source=input.useBasePreview&&input.roomId?baseRoomImage(input.roomId):sourceBoard?{id:sourceBoard.id,url:sourceBoard.previewImageUrl!}:input.sourceImageId?{id:input.sourceImageId,url:'/api/renders/'+input.sourceImageId}:input.roomId?(state.savedCompositions?.[input.roomId]?.[input.moodboardNumber??'1']?.image??state.cachedRooms[input.roomId]?.image??baseRoomImage(input.roomId)):null;
  if(policy.referenceStrategy==='instances'&&source&&!(await renderReferencesCurrent(source.id,input.roomId,input.moodboardNumber??'1')))source=null;
  const {areas}=await readPlanAreas();
  const [render]=await generateRenders({
    brief:{selectedProductIds:input.productIds??[],compositionPlan:plan,fullComposition,compositionRevision:COMPOSITION_REVISION,operation:source?'edit':'base',instructions:input.prompt,roomId:input.roomId??null,room:room?{name:room.name,kind:room.image}:null,savedNeighborCompositions:neighbors.map(n=>({roomId:n.roomId,name:projectRoom(n.roomId)?.name,moodboardId:n.moodboardId,rule:'Preserve this saved composition exactly wherever this neighboring room is actually visible. Never create new openings.'})),
      previousPrompts:input.history??[],roomMap:prismalRooms.map((r,index)=>({number:index+1,name:r.name,polygon:areas['PRISMAL_'+r.key]??r.polygon.map(([x,y])=>({x:x/882,y:y/580}))})),
      selections:[],documents:[...(policy.previewImage&&policy.referenceStrategy!=='instances'?[{name:"MOODBOARD OVERVIEW: style and finishes only; preserve the original room layout",image:policy.previewImage}]:[]),...neighbors.map(n=>({name:'LOCKED SAVED NEIGHBOR: '+projectRoom(n.roomId)?.name,image:n.image.url})),...(input.applyProjectDirection?[]:input.references??[]).map(r=>({name:'User style reference: '+r.name,image:r.dataUrl}))],architecture:{planIsIllustrative:false,sourceDocumentIds:[PROJECT_REFERENCE.id]},
    },moodboardNumber:input.moodboardNumber??'1',sourceRenderId:source?.id??null,sourceImageUrl:source?.url??null,count:1,productIds:plan?.productIds?.length?plan.productIds:input.productIds??[],
  },signal);
  return {id:render.id,url:render.imageUrl!,referenceRevision:render.referenceRevision,createdAt:render.createdAt,compositionRevision:COMPOSITION_REVISION,productIds:input.productIds??[]};
}
export async function astraStatus(){
  const catalogs=await Promise.all((['1','2','3'] as const).map(async number=>({number,...await loadCatalogPolicy(number)})));
  const catalog=catalogs[0];
  const registered=await readPlanProductCatalog();
  const planProducts=(await readPlanInstances()).instances;
  const manualRoomIds=[...new Set(planProducts.filter(p=>registeredProductFor(registered,p)).map(p=>p.roomId).filter(Boolean))];
  return {manualProductCount:registered.length,manualRoomIds,moodboards:catalogs.map(c=>({number:c.number,name:c.name,previewImage:c.referenceStrategy==='instances'?undefined:c.previewImage,status:c.status,referenceStrategy:c.referenceStrategy,products:c.products.filter(p=>p.approved).map(({id,name,category,image,group,roomIds,planModelIds})=>({id,name,category,image,group,roomIds,planModelIds}))})),configured:!!process.env.OPENAI_API_KEY,reference:PROJECT_REFERENCE,catalog:{status:catalog.status,products:catalog.products.filter(p=>p.approved).map(({id,name,category})=>({id,name,category}))}};
}