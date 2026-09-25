import {prismalRooms} from '../data/prismal-rooms';
import type {Room} from './models';
export type AreaPoint={x:number;y:number};
export type PlanAreas=Record<string,AreaPoint[]>;
export function validatePlanAreas(input:unknown):PlanAreas{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Áreas inválidas.');
 const areas:PlanAreas={};
 for(const [id,raw] of Object.entries(input)){
  if(!prismalRooms.some(r=>'PRISMAL_'+r.key===id)||!Array.isArray(raw)||raw.length<3||raw.length>64)throw Error('Área inválida.');
  const points:AreaPoint[]=raw.map(p=>{
   if(!p||![p.x,p.y].every(Number.isFinite)||p.x<0||p.x>1||p.y<0||p.y>1)throw Error('Os pontos devem ficar dentro da planta.');
   return {x:p.x,y:p.y};
  });
  let area=0;
  const cross=(a:AreaPoint,b:AreaPoint,c:AreaPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   if(Math.hypot(a.x-b.x,a.y-b.y)<.00001)throw Error('Separe os pontos do contorno.');
   area+=a.x*b.y-b.x*a.y;
   for(let j=i+2;j<points.length;j++){
    if(i===0&&j===points.length-1)continue;
    const c=points[j],d=points[(j+1)%points.length];
    if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)throw Error('As linhas da área não podem se cruzar.');
   }
  }
  if(Math.abs(area)<.00002)throw Error('A área precisa ter um contorno válido.');
  areas[id]=points;
 }
 return areas;
}
export function applyPlanAreas(rooms:Room[],areas:PlanAreas):Room[]{
 return rooms.map(room=>areas[room.id]?{...room,planRegion:{...room.planRegion,points:areas[room.id]}}:room);
}
