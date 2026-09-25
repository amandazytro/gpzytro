import {loadLocalReferenceCatalog} from './local-reference-catalog';
import {createHash} from 'node:crypto';
import {loadCatalogPolicy,type CatalogPolicy,type CatalogProduct,type MoodboardNumber} from './catalog-policy';
import {readPlanInstances} from './plan-instances';
import {readPlanAreas} from './plan-areas';
import {readPlanProductCatalog} from './plan-product-catalog';
import {registeredProductFor,type RegisteredPlanProduct} from '../domain/plan-product-catalog';
import {prismalRooms} from '../data/prismal-rooms';
import {planModels,type PlanProduct} from '../data/plan-products';
import {productGroup} from './product-options';
import {PROJECT_REFERENCE} from './project-reference';
import ceiling from '../data/ceiling-reference.json';
import dimensions from '../data/dimension-reference.json';
const componentProducts=new Set(['PDF-SINGLE-DESK','PDF-BENCH-4','PDF-BENCH-8','PDF-BEE-SEAT','PDF-BEE-TABLE','PDF-LOCH','PDF-HOT-DESK']);
export function resolveMoodboardBindings(policy:CatalogPolicy,instances:readonly PlanProduct[],choices:string[]=[],registered:readonly RegisteredPlanProduct[]=[]){
 const selected=choices.map(id=>{const p=policy.products.find(p=>p.id===id&&p.approved);if(!p)throw Error('Produto fora do catálogo ativo.');return p;});
 if(new Set(selected.map(productGroup)).size!==selected.length)throw Error('Escolha apenas uma alternativa por tipo de móvel.');
 return instances.map(instance=>{
  const manual=registeredProductFor(registered,instance);
  const candidates=policy.products.filter(p=>p.approved&&p.planModelIds?.includes(instance.modelId)&&(!p.roomIds?.length||!!instance.roomId&&p.roomIds.includes(instance.roomId)));
  const explicit=selected.filter(p=>candidates.some(c=>c.id===p.id));
  if(explicit.length>1)throw Error('Há alternativas conflitantes para '+instance.instanceCode+'. Escolha um único modelo compatível.');
  const product=manual?undefined:explicit[0]??candidates[0];
  const normalizedBounds={x:instance.x/882,y:instance.y/580,width:instance.width/882,height:instance.height/580};
  const component=!!product&&componentProducts.has(product.id);
  const adapted=!!product&&(component||product.finishStatus==='proposed'||product.id==='PDF-RICO');
  const referenceMode=manual?'manual_product':!product||product.sourceKind==='original'?'original_design':adapted?'adapted_product':'source_product';
  return {
   instanceId:instance.id,instanceCode:instance.instanceCode,modelId:instance.modelId,roomId:instance.roomId,
   role:product?.role??planModels.find(m=>m.id===instance.modelId)?.kind??'unassigned',
   bounds:normalizedBounds,rotationDeg:instance.rotationDeg,parts:instance.parts?.map(p=>({x:p.x/882,y:p.y/580,width:p.width/882,height:p.height/580})),
   productId:product?.id??null,referenceMode,sourceKind:product?.sourceKind??null,sourceCapture:product?.sourceCapture??null,
   manualReferenceKey:manual?manual.scope+':'+manual.targetId:null,
   sourcePages:product?[...new Set(product.sourceOccurrences?.map(r=>r.page)??[])]:[],
   sourceDimensions:product?.sourceDimensions??null,
   standardFinish:manual?.finish??product?.standardizedFinish??'Proposta compatível com a paleta do moodboard.',
   fitRule:component?'Use only the component inside this instance. Assembly dimensions and source photograph counts never multiply instances.':'Preserve this exact floorplan footprint, function, count, position and orientation. Source dimensions are nominal, not building measurements.',
   adaptation:manual?'Cadastro manual preservado.':product?.adaptationNotes??'Sem referência diretamente compatível: propor um modelo sem marca dentro do contorno existente, usando a paleta. Não inventar dimensões reais nem fabricante.',
   proposed:referenceMode==='adapted_product'||referenceMode==='original_design',
  };
 });
}
export async function getMoodboardContext(number:MoodboardNumber='1',roomId?:string,choices:string[]=[],policyOverride?:CatalogPolicy){
 if(roomId&&!prismalRooms.some(r=>'PRISMAL_'+r.key===roomId))throw Error('Ambiente inválido.');
 const activePolicy=policyOverride??await loadCatalogPolicy(number);
 const policy:CatalogPolicy=activePolicy.referenceStrategy==='instances'?activePolicy:number==='1'?await loadLocalReferenceCatalog():activePolicy;
 const [state,areaState,registered]=await Promise.all([readPlanInstances(),readPlanAreas(),readPlanProductCatalog()]);
 const instances=state.instances.filter(p=>!roomId||p.roomId===roomId);
 const assignments=resolveMoodboardBindings(policy,instances,choices,registered);
 const assignedIds=new Set(assignments.flatMap(a=>a.productId?[a.productId]:[]));
 const hasTable=instances.some(p=>planModels.find(m=>m.id===p.modelId)?.kind==='table');
 const support=policy.products.filter(p=>p.approved&&!p.planModelIds?.length&&hasTable&&['Equipment','Accessory'].includes(p.category)&&(!roomId||!p.roomIds?.length||p.roomIds.includes(roomId)));
 const renderProducts=policy.products.filter(p=>assignedIds.has(p.id)||support.some(s=>s.id===p.id));
 if(choices.some(id=>!renderProducts.some(p=>p.id===id)))throw Error('A seleção contém referência sem instância compatível neste ambiente. Atribua primeiro o modelo na planta.');
 const rooms=prismalRooms.map(r=>{
  const id='PRISMAL_'+r.key,roomInstances=state.instances.filter(p=>p.roomId===id);
  return {id,name:r.name,instanceCount:roomInstances.length,polygon:areaState.areas[id]??r.polygon.map(([x,y])=>({x:x/882,y:y/580}))};
 });
 const revision=createHash('sha256').update(JSON.stringify({policy,instances:state.revision,areas:areaState.revision,registered})).digest('hex');
 const compositionPlan={
  rule:'Use live instance assignments only. The floorplan, refined room boundaries, ceiling plan and dimension sheet override catalog quantities and assembly dimensions. Never add absent furniture. Proposed adaptations are unbranded designs, not verified catalog products.',
  items:assignments.map(a=>({element:a.instanceCode,instanceId:a.instanceId,modelId:a.modelId,productId:a.productId,referenceMode:a.referenceMode,allowOriginalDesign:!a.productId&&!a.manualReferenceKey,allowNewFinishes:!a.productId&&!a.manualReferenceKey,finishReferenceIds:[],reference:a.manualReferenceKey??a.productId??'Proposta sem marca',change:a.standardFinish+' '+a.adaptation+' '+a.fitRule})),
  productIds:renderProducts.map(p=>p.id),
 };
 return {
  moodboardNumber:number,name:policy.name,status:policy.status,externalDelivery:policy.externalDelivery??'pending_approval',revision,source:policy.sourceDocument??null,palette:policy.palette??null,captures:[...new Map(policy.products.filter(p=>p.sourceCapture).map(p=>[p.sourceCapture!.sha256,p.sourceCapture!])).values()],
  roomId:roomId??null,rooms:roomId?rooms.filter(r=>r.id===roomId):rooms,
  products:policy.products.filter(p=>!roomId||!p.roomIds?.length||p.roomIds.includes(roomId)).map(p=>({...p,mappedInstanceCount:assignments.filter(a=>a.productId===p.id).length,availability:assignedIds.has(p.id)?'assigned':'available_not_inserted'})),
  assignments,renderProducts,compositionPlan,
  supportingReferences:support.map(p=>({id:p.id,name:p.name,image:p.image,imageRole:p.imageRole,rule:'Use only where compatible equipment already exists. Do not create new standalone instances.'})),
  sources:{
   floorplan:{image:PROJECT_REFERENCE.image,original:PROJECT_REFERENCE.pdf},
   ceiling:{image:PROJECT_REFERENCE.ceilingImage,source:ceiling.source,sha256:ceiling.sha256,revision:ceiling.revision},
   dimensions:{image:dimensions.sourceUrl,sha256:dimensions.sha256,units:dimensions.units,details:dimensions.detailImages},
   instanceRevision:state.revision,areaRevision:areaState.revision,
   registeredRevision:createHash('sha256').update(JSON.stringify({records:registered,instances:state.revision,areas:areaState.revision})).digest('hex'),
  },
  summary:{catalogProducts:policy.products.length,instances:assignments.length,direct:assignments.filter(a=>a.referenceMode==='source_product').length,adapted:assignments.filter(a=>a.referenceMode==='adapted_product').length,original:assignments.filter(a=>a.referenceMode==='original_design').length,manual:assignments.filter(a=>a.referenceMode==='manual_product').length},
 };
}
