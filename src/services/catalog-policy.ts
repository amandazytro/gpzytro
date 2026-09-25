import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {loadLocalReferenceCatalog} from './local-reference-catalog';
export type MoodboardNumber='1'|'2'|'3';
export interface CatalogSourceOccurrence {productId:string|null;page:number;row:number;sourceQuantity:number;sourceDescription:string;sourceFinish:string;sourceLocation:string;sourceOption:boolean}
export interface CatalogProduct {
 group?:string;role?:string;imageRole?:'source_product'|'missing'|'original_concept';sourceKind?:'pdf'|'capture'|'original';sourceCapture?:{fileName:string;url:string;sha256:string};sourceModel?:string;manufacturer?:string;
 roomIds?:string[];planModelIds?:string[];sourceDimensions?:Record<string,number>;sourceQuantity?:number;sourceOccurrences?:CatalogSourceOccurrence[];
 standardizedFinish?:string;finishStatus?:'proposed'|'source';adaptationNotes?:string; id:string; name:string; category:string; description:string; image:string; approved:boolean; location?:string; appearance?:string; colour?:string; finish?:string; supplier?:string; sourceRow?:number }
export interface CatalogPolicy {
 referenceStrategy?:'instances';externalDelivery?:'authorized';source?:'project-local';
 sourceDocument?:{fileName:string;url:string;sha256:string;pageCount:number;productPages:number[];ignoredMarks:string;excluded:string};
 palette?:{wood:string;metal:string;upholstery:string;policy:string};allowProductAdaptation?:boolean; name?:string; previewImage?:string; sourceWorkbook?:string; sourceSheet?:string; status:'reference'|'pending'|'ready'; products:CatalogProduct[]; rules:string[]; allowCompatibleFallback?:boolean }
export async function loadCatalogPolicy(number:MoodboardNumber='1'):Promise<CatalogPolicy> {
  const config=JSON.parse(await readFile(path.join(process.cwd(),'src/config/astra-catalog.json'),'utf8'));
  let value=config?.moodboards?.[number];
  if(value?.source==='project-local'){
    if(number!=='1'||value.externalDelivery!=='authorized')throw new Error('Envio do catálogo local não autorizado.');
    value={...await loadLocalReferenceCatalog(),source:'project-local',referenceStrategy:'instances',externalDelivery:'authorized',status:'ready'};
  }
  if(!value||!['reference','pending','ready'].includes(value.status)||!Array.isArray(value.products)||!Array.isArray(value.rules)||!value.rules.every((r:unknown)=>typeof r==='string'))throw new Error('Invalid server catalog configuration.');
  if(number!=='1'&&value.status==='reference')throw new Error('Only moodboard 1 may use provisional references.');
  if(value.allowCompatibleFallback!==undefined&&typeof value.allowCompatibleFallback!=='boolean')throw new Error('Invalid catalog fallback policy.');
  const ids=new Set<string>();
  for(const p of value.products){
    if(!p||![p.id,p.name,p.category,p.description,p.image].every(v=>typeof v==='string'&&v.trim())||typeof p.approved!=='boolean'||ids.has(p.id))throw new Error('Invalid server product catalog.');
    ids.add(p.id);
  }
  return value;
}
export function resolveCatalogProducts(policy:CatalogPolicy,ids:unknown):CatalogProduct[]{
  if(policy.status==='pending')throw new Error('Este moodboard aguarda a tabela de produtos. A geração está bloqueada até a configuração das referências.');
  if(policy.status==='reference')return [];
  if(ids===undefined||(Array.isArray(ids)&&ids.length===0))return policy.products.filter(p=>p.approved);
  if(!Array.isArray(ids)||ids.length>60||!ids.every(id=>typeof id==='string')||new Set(ids).size!==ids.length)throw new Error('Selecione os produtos aprovados do catálogo antes de gerar.');
  return ids.map(id=>{
    const product=policy.products.find(p=>p.id===id&&p.approved);
    if(!product)throw new Error('A seleção contém um produto fora do catálogo aprovado.');
    return product;
  });
}