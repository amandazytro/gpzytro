import {assignModel} from './plan-instances';
import type {PlanProduct,PlanBounds} from '../data/plan-products';
const replacements:Record<string,[string,string,string]>={
 'INST-60A772A0':['MES-04','MES-CAP-01','PRISMAL_LOUNGE'],
 'INST-FFD3BFCB':['MES-04','MES-CAP-01','PRISMAL_LOUNGE'],
 'INST-FB7A55C2':['MES-04','MES-CAP-02','PRISMAL_LOUNGE'],
 'INST-8727761F':['CAD-01','MES-CAP-02','PRISMAL_WAITING'],
 'INST-27A68A9C':['MES-04','ARM-CAP-01','PRISMAL_WORK_WEST'],
 'INST-7027967E':['CAD-01','ARM-CAP-01','PRISMAL_TEAM'],
 'INST-242524DD':['MES-09','SUP-FIC-02','PRISMAL_BOARDROOM'],
 'INST-EA0E094A':['MES-09','SUP-FIC-02','PRISMAL_BOARDROOM'],
 'INST-D6A05AE8':['MES-09','SUP-FIC-02','PRISMAL_MEETING_1'],
};
const loungeChairs=new Set(['INST-72EB37C0','INST-C9BBFB10','INST-7181BAD0','INST-A63D6804']);
const rectangle=(p:PlanBounds)=>({x:p.x,y:p.y,width:p.width,height:p.height});
/** One-time reviewed placement. Preserve unrecognized/new instances and user model changes. */
export function placeCaptureFurniture(input:readonly PlanProduct[],protectedIds:ReadonlySet<string>=new Set()){
 let instances=input.map(p=>{
  if(protectedIds.has(p.id))return p;
  if(p.modelId==='SUP-02'&&['PRISMAL_BOARDROOM','PRISMAL_MEETING_1'].includes(p.roomId??''))return assignModel(p,'SUP-FIC-02');
  const replacement=replacements[p.instanceCode];
  if(replacement&&p.modelId===replacement[0]&&p.roomId===replacement[2])return assignModel(p,replacement[1]);
  if(p.roomId==='PRISMAL_LOUNGE'&&p.modelId==='CAD-04'&&loungeChairs.has(p.instanceCode))return assignModel(p,'POL-CAP-01');
  if(p.roomId==='PRISMAL_WAITING'&&p.modelId==='POL-01')return assignModel(p,'POL-CAP-01');
  if(['PRISMAL_HUDDLE_1','PRISMAL_MEETING_1'].includes(p.roomId??'')&&p.modelId==='CAD-04')return assignModel(p,'CAD-CAP-01');
  if(p.roomId==='PRISMAL_EXECUTIVE'&&p.modelId==='POL-02')return assignModel(p,'CAD-CAP-01');
  return p;
 });
 const merges:{retained:string;removed:string[];reason:string}[]=[];
 function merge(spec:[string,string][],model:string,reason:string,chooseParts:(members:PlanProduct[])=>PlanBounds[]){
  const members=spec.map(([code,expected])=>instances.find(p=>p.instanceCode===code&&p.modelId===expected&&p.roomId==='PRISMAL_LOUNGE'&&!protectedIds.has(p.id)));
  if(members.some(p=>!p))return;
  const group=members as PlanProduct[],parts=chooseParts(group);
  const x=Math.min(...parts.map(p=>p.x)),y=Math.min(...parts.map(p=>p.y)),right=Math.max(...parts.map(p=>p.x+p.width)),bottom=Math.max(...parts.map(p=>p.y+p.height));
  const next=assignModel({...group[0],x,y,width:right-x,height:bottom-y,parts,rotationDeg:0},model);
  const removed=new Set(group.slice(1).map(p=>p.id));
  instances=instances.filter(p=>!removed.has(p.id)).map(p=>p.id===next.id?next:p);
  merges.push({retained:next.instanceCode,removed:group.slice(1).map(p=>p.instanceCode),reason});
 }
 merge([['INST-5B599119','SOF-01'],['INST-3637D894','MES-09']],'SOF-FIC-01','Os dois trechos contíguos compõem um único sofá em L.',members=>members.map(rectangle));
 merge([['INST-AD0BFDD5','MES-06'],['INST-4C706A45','MES-06'],['INST-531CBF60','CAD-01']],'SUP-FIC-01','Bancada em L consolidada; o terceiro contorno repete o trecho horizontal.',members=>{
  const [a,b,c]=members;
  // Keep the union of the two near-identical horizontal traces plus the vertical leg.
  const x=Math.min(a.x,c.x),y=Math.min(a.y,c.y),r=Math.max(a.x+a.width,c.x+c.width),bottom=Math.max(a.y+a.height,c.y+c.height);
  return [{x,y,width:r-x,height:bottom-y},rectangle(b)];
 });
 return {instances,merges,changes:instances.filter(p=>{const before=input.find(i=>i.id===p.id);return before&&JSON.stringify(before)!==JSON.stringify(p);}).map(p=>({instanceId:p.id,code:p.instanceCode,from:input.find(i=>i.id===p.id)!.modelId,to:p.modelId,room:p.roomId}))};
}
