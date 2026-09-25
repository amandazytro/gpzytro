import {readPlanAreas} from './plan-areas';
import {readPlanGeometry} from './plan-geometry';
import {readPlanInstances} from './plan-instances';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {planModels,planInstanceManifest} from '../data/plan-products';
import {registeredProductFor,type RegisteredPlanProduct} from '../domain/plan-product-catalog';
const directory=()=>path.join(process.env.ASTRA_DATA_DIR||path.join(process.cwd(),'.render-data'),'plan-products');
const catalogFile=()=>path.join(directory(),'catalog.json');
let queue:Promise<unknown>=Promise.resolve();
export async function readPlanProductCatalog():Promise<RegisteredPlanProduct[]>{
 try{return JSON.parse(await readFile(catalogFile(),'utf8'));}
 catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
}
function field(value:unknown,name:string,max:number,required=true){
 if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new Error('Confira o campo '+name+'.');
 return value.trim();
}
export async function savePlanProduct(input:unknown){
 if(!input||typeof input!=='object')throw new Error('Cadastro inválido.');
 const b=input as Record<string,unknown>;
 if(b.scope!=='model'&&b.scope!=='instance')throw new Error('Escolha onde aplicar o cadastro.');
 const scope=b.scope;
 const targetId=field(b.targetId,'instância',100);
 if(!(scope==='model'?planModels:(await readPlanInstances()).instances).some(p=>p.id===targetId))throw new Error('Elemento não encontrado na planta.');
 const name=field(b.name,'nome',160),manufacturer=field(b.manufacturer,'fabricante',160),finish=field(b.finish,'acabamento',1200),link=field(b.link??'','link',2000,false);
 if(link){let url:URL;try{url=new URL(link);}catch{throw new Error('Use um link completo, começando por https://.');}if(!['https:','http:'].includes(url.protocol))throw new Error('Use um link HTTP ou HTTPS.');}
 let photo:Buffer|undefined;
 if(b.photo!==undefined){
  if(typeof b.photo!=='string'||b.photo.length>7_000_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.photo))throw new Error('Envie uma foto PNG, JPEG ou WebP de até 5 MB.');
  const bytes=Buffer.from(b.photo.split(',')[1],'base64');if(bytes.length>5_000_000)throw new Error('A foto deve ter até 5 MB.');
  try{photo=await sharp(bytes,{limitInputPixels:40_000_000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).png().toBuffer();}
  catch{throw new Error('Não foi possível ler a foto. Use PNG, JPEG ou WebP.');}
 }
 const task=queue.then(async()=>{
  const records=await readPlanProductCatalog();
  const previous=records.find(r=>r.scope===scope&&r.targetId===targetId);
  if(!photo&&!previous)throw new Error('Adicione uma foto do produto.');
  await mkdir(directory(),{recursive:true});
  let imageUrl=previous?.imageUrl??'';
  if(photo){const id=randomUUID();await writeFile(path.join(directory(),id+'.png'),photo);imageUrl='/api/plan-products/images/'+id;}
  const saved:RegisteredPlanProduct={scope,targetId,name,manufacturer,finish,link,imageUrl,updatedAt:new Date().toISOString()};
  const next=[...records.filter(r=>r.scope!==scope||r.targetId!==targetId),saved];
  const temp=path.join(directory(),randomUUID()+'.tmp');await writeFile(temp,JSON.stringify(next,null,2));await rename(temp,catalogFile());
  return {saved,products:next};
 });
 queue=task.catch(()=>undefined);return task;
}
export async function readPlanProductPhoto(id:string){
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw new Error('Foto inválida.');
 return readFile(path.join(directory(),id+'.png'));
}
/** Resolve instance overrides before sending the exact user specifications to the image provider. */
export async function registeredPlanContext(roomId?:string){
 const records=await readPlanProductCatalog();
 const geometry=await readPlanGeometry();
 const inventory=await readPlanInstances();
 const areaState=await readPlanAreas();
 const mapped=inventory.instances;
 const instances=mapped.filter(p=>!roomId||p.roomId===roomId||p.roomId===null).flatMap(p=>{
  const registered=registeredProductFor(records,p);
  return registered?[{instanceId:p.instanceCode,modelId:p.modelId,roomId:p.roomId,referenceKey:registered.scope+':'+registered.targetId}]:[];
 });
 const keys=new Set(instances.map(i=>i.referenceKey));
 const references=records.filter(r=>keys.has(r.scope+':'+r.targetId)).map(r=>({key:r.scope+':'+r.targetId,...r}));
 return {revision:createHash('sha256').update(JSON.stringify({records,instances:inventory.revision,areas:areaState.revision})).digest('hex'),references,instances,inventory:{...planInstanceManifest(mapped),geometryRevision:geometry.revision,instanceRevision:inventory.revision,areaRevision:areaState.revision,areas:areaState.areas,manuallyMarkedInstanceIds:Object.keys(geometry.rectangles),geometryRule:'Manual bounds are user-confirmed annotation regions on the aligned floorplan, not physical dimensions. They override provisional detection bounds. Preserve the architecture and use these regions to identify the registered objects.'}};
}