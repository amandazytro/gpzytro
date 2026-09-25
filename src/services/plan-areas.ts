import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {validatePlanAreas,type PlanAreas} from '../domain/plan-areas';
const directory=()=>path.join(process.env.ASTRA_DATA_DIR||path.join(process.cwd(),'.render-data'),'plan-products');
let queue:Promise<unknown>=Promise.resolve();
export class AreaConflict extends Error {}
export async function readPlanAreas(){
 let areas:PlanAreas={};
 try{
  const saved=JSON.parse(await readFile(path.join(directory(),'areas.json'),'utf8')).areas;
  if(saved&&typeof saved==='object'){delete saved.PRISMAL_LIFT1;delete saved.PRISMAL_LIFT2;}
  areas=validatePlanAreas(saved);
 }
 catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 return {areas,revision:createHash('sha256').update(JSON.stringify(areas)).digest('hex')};
}
export async function savePlanAreas(input:unknown){
 if(!input||typeof input!=='object')throw Error('Áreas inválidas.');
 const body=input as {areas:unknown;revision:unknown},areas=validatePlanAreas(body.areas);
 const task=queue.then(async()=>{
  const current=await readPlanAreas();
  if(body.revision!==current.revision)throw new AreaConflict('As áreas foram alteradas em outra aba. Recarregue a página para carregar a versão atual.');
  await mkdir(directory(),{recursive:true});const temp=path.join(directory(),randomUUID()+'.tmp');
  await writeFile(temp,JSON.stringify({areas,updatedAt:new Date().toISOString()},null,2));await rename(temp,path.join(directory(),'areas.json'));
  return readPlanAreas();
 });
 queue=task.catch(()=>undefined);return task;
}
