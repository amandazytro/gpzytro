import {planModels,planProducts,type PlanProduct,type PlanBounds} from '../data/plan-products';
import {prismalRooms} from '../data/prismal-rooms';

// Conservative baseline: visible furniture symbols, without inferred walls or finishes.
const identifiedModels=new Set(['CAD-01','CAD-02','CAD-03','CAD-04','CAD-05','CAD-06','MES-01','MES-02','MES-03','MES-04','MES-05','MES-06','MES-07','MES-09','MES-10','POL-01','BAN-01']);
export const initialPlanInstances:readonly PlanProduct[]=planProducts.filter(p=>identifiedModels.has(p.modelId)&&!['chair-cad-05-007','chair-cad-05-008'].includes(p.id));
export function roomAt(bounds:PlanBounds,areas:Record<string,{x:number;y:number}[]>={}){
 const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 const room=prismalRooms.find(r=>{
  const polygon=areas['PRISMAL_'+r.key]?.map(p=>[p.x*882,p.y*580])??r.polygon;
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
   if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
 });
 return room?'PRISMAL_'+room.key:null;
}
export function assignModel(instance:PlanProduct,modelId:string):PlanProduct{
 const model=planModels.find(m=>m.id===modelId);
 return {...instance,modelId:model?.id??'',name:model?.name??'Instância sem modelo',category:model?.category??'Mobiliário',image:model?.image??'/plans/illustrative/FN-05.png',finish:model?.finish??'A definir'};
}
export function createPlanInstance(bounds:PlanBounds,modelId:string,id:string,code:string):PlanProduct{
 return assignModel({...bounds,id,instanceCode:code,modelId:'',name:'',manufacturer:'A definir',image:'',finish:'',category:'Mobiliário',rotationDeg:0,roomId:roomAt(bounds)},modelId);
}
export function validatePlanInstances(input:unknown):PlanProduct[]{
 if(!Array.isArray(input)||input.length>2000)throw Error('Lista de instâncias inválida.');
 const ids=new Set<string>(),codes=new Set<string>();
 return input.map(raw=>{
  if(!raw||typeof raw!=='object')throw Error('Instância inválida.');
  const p=raw as PlanProduct;
  if(typeof p.id!=='string'||!/^([a-z][a-z0-9-]{0,99})$/.test(p.id)||ids.has(p.id))throw Error('Identificador de instância inválido ou repetido.');
  if(typeof p.instanceCode!=='string'||!p.instanceCode.trim()||p.instanceCode.length>100||codes.has(p.instanceCode))throw Error('Código de instância inválido ou repetido.');
  ids.add(p.id);codes.add(p.instanceCode);
  if(typeof p.modelId!=='string'||(p.modelId!==''&&!planModels.some(m=>m.id===p.modelId)))throw Error('Modelo inválido.');
  if(p.roomId!==null&&!prismalRooms.some(r=>'PRISMAL_'+r.key===p.roomId))throw Error('Ambiente inválido.');
  const bounds=(b:PlanBounds)=>{
   if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.x<0||b.y<0||b.width<3||b.height<3||b.x+b.width>882.001||b.y+b.height>580.001)throw Error('Instância fora dos limites da planta.');
   return {x:b.x,y:b.y,width:b.width,height:b.height};
  };
  const box=bounds(p);
  if(!Number.isFinite(p.rotationDeg)||Math.abs(p.rotationDeg)>360)throw Error('Rotação inválida.');
  if(p.parts!==undefined&&(!Array.isArray(p.parts)||p.parts.length>20))throw Error('Contorno inválido.');
  const parts=p.parts?.map(bounds);
  if(parts?.some(b=>b.x<box.x||b.y<box.y||b.x+b.width>box.x+box.width+.001||b.y+b.height>box.y+box.height+.001))throw Error('Contorno fora da instância.');
  return {...createPlanInstance(box,p.modelId,p.id,p.instanceCode),roomId:p.roomId,rotationDeg:p.rotationDeg,...(parts?{parts}:{})};
 });
}
