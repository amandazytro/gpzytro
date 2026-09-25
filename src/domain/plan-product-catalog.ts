import type {PlanProduct} from '../data/plan-products';
export type RegisteredPlanProduct={
 scope:'model'|'instance';targetId:string;name:string;manufacturer:string;finish:string;link:string;
 imageUrl:string;updatedAt:string;
};
export function registeredProductFor(records:readonly RegisteredPlanProduct[],instance:PlanProduct){
 return records.find(r=>r.scope==='instance'&&r.targetId===instance.id)
  ??records.find(r=>r.scope==='model'&&r.targetId===instance.modelId);
}