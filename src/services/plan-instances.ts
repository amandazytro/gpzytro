import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {initialPlanInstances,validatePlanInstances,roomAt} from '../domain/plan-instances';
import {readPlanAreas} from './plan-areas';
import {readPlanGeometry} from './plan-geometry';
import {applyPlanGeometry} from '../domain/plan-geometry';
const directory=()=>path.join(process.env.ASTRA_DATA_DIR||path.join(process.cwd(),'.render-data'),'plan-products');
let queue:Promise<unknown>=Promise.resolve();
export class InstanceConflict extends Error {}
export async function readPlanInstances(){
 let instances;
 try{
  const saved=JSON.parse(await readFile(path.join(directory(),'instances.json'),'utf8')).instances;
  instances=validatePlanInstances(Array.isArray(saved)?saved.map(p=>p&&['PRISMAL_LIFT1','PRISMAL_LIFT2'].includes(p.roomId)?{...p,roomId:'PRISMAL_RECEPTION'}:p):saved);
 }
 catch(e){
  if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
  const geometry=await readPlanGeometry();
  instances=applyPlanGeometry(initialPlanInstances,geometry.rectangles);
 }
 const {areas}=await readPlanAreas();
 instances=instances.map(p=>({...p,roomId:roomAt(p,areas)}));
 return {instances,revision:createHash('sha256').update(JSON.stringify(instances)).digest('hex')};
}
export async function savePlanInstances(input:unknown){
 if(!input||typeof input!=='object')throw Error('Instâncias inválidas.');
 const body=input as {instances:unknown;revision:unknown};
 const instances=validatePlanInstances(body.instances);
 if(typeof body.revision!=='string')throw Error('Revisão inválida.');
 const task=queue.then(async()=>{
  const current=await readPlanInstances();
  if(current.revision!==body.revision)throw new InstanceConflict('As instâncias foram alteradas em outra aba. Recarregue antes de salvar novamente.');
  await mkdir(directory(),{recursive:true});
  const temp=path.join(directory(),randomUUID()+'.tmp');
  await writeFile(temp,JSON.stringify({instances,updatedAt:new Date().toISOString()},null,2));
  await rename(temp,path.join(directory(),'instances.json'));
  return readPlanInstances();
 });
 queue=task.catch(()=>undefined);return task;
}
