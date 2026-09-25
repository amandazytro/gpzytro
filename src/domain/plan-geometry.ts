import {planProducts,type PlanProduct,type PlanBounds} from '../data/plan-products';
export type PlanGeometry=Record<string,PlanBounds>;
export function validatePlanGeometry(input:unknown):PlanGeometry{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Demarcações inválidas.');
 const result:PlanGeometry={};
 for(const [id,value] of Object.entries(input)){
  if(!planProducts.some(p=>p.id===id)||!value||typeof value!=='object')throw Error('Instância inválida.');
  const {x,y,width,height}=value as PlanBounds;
  if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<3||height<3||x+width>882.001||y+height>580.001)throw Error('Demarcação fora dos limites da planta.');
  result[id]={x,y,width,height};
 }
 return result;
}
export function applyPlanGeometry(products:readonly PlanProduct[],geometry:PlanGeometry):PlanProduct[]{
 return products.map(p=>geometry[p.id]?{...p,...geometry[p.id],parts:undefined}:p);
}
