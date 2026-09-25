import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {validatePlanGeometry,type PlanGeometry} from '../domain/plan-geometry';
import {planProducts} from '../data/plan-products';
const directory=()=>path.join(process.env.ASTRA_DATA_DIR||path.join(process.cwd(),'.render-data'),'plan-products');
const file=()=>path.join(directory(),'geometry.json');
let queue:Promise<unknown>=Promise.resolve();
export async function readPlanGeometry(){
 let rectangles:PlanGeometry={};
 try{rectangles=validatePlanGeometry(JSON.parse(await readFile(file(),'utf8')).rectangles);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 return {rectangles,revision:createHash('sha256').update(JSON.stringify(rectangles)).digest('hex')};
}
export async function savePlanGeometry(input:unknown){
 if(!input||typeof input!=='object')throw Error('Demarcações inválidas.');
 const body=input as {rectangles:unknown;remove?:unknown};const patch=validatePlanGeometry(body.rectangles);
 const remove=body.remove??[];
 if(!Array.isArray(remove)||!remove.every(id=>typeof id==='string'&&planProducts.some(p=>p.id===id)))throw Error('Instância inválida.');
 const task=queue.then(async()=>{
  const current=await readPlanGeometry();const rectangles={...current.rectangles,...patch};for(const id of remove)delete rectangles[id];
  await mkdir(directory(),{recursive:true});const temp=path.join(directory(),randomUUID()+'.tmp');
  await writeFile(temp,JSON.stringify({rectangles,updatedAt:new Date().toISOString()},null,2));await rename(temp,file());return readPlanGeometry();
 });queue=task.catch(()=>undefined);return task;
}
