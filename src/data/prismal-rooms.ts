import type { Database, PlanPoint } from '../domain/models';
import { PLAN_WIDTH, PLAN_HEIGHT } from './project-plans';
const rectangle = (x:number,y:number,w:number,h:number):PlanPoint[]=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
/** Traced on the supplied 882 x 580 PNG. Positions are visual, not surveyed dimensions. */
export const prismalRooms: {key:string;name:string;image:string;polygon:PlanPoint[];label?:PlanPoint}[] = [
 {key:'WORK_WEST',name:'Estações de trabalho',image:'open-office',polygon:rectangle(67,26,267,390),label:[312,278]},
 {key:'TEAM',name:'Mesa colaborativa',image:'meeting',polygon:rectangle(192,418,142,131),label:[318,474]},
 {key:'LOUNGE',name:'Copa e convivência',image:'lounge',polygon:rectangle(339,350,261,202),label:[507,464]},
 {key:'BOARDROOM',name:'Sala de conselho',image:'boardroom',polygon:rectangle(636,33,176,205),label:[673,120]},
 {key:'HUDDLE_1',name:'Reunião rápida',image:'huddle',polygon:rectangle(693,245,119,89),label:[705,274]},
 {key:'MEETING_1',name:'Sala de reunião',image:'meeting',polygon:rectangle(663,355,149,85),label:[682,383]},
 {key:'EXECUTIVE',name:'Escritório privativo',image:'executive',polygon:rectangle(663,453,149,99),label:[690,476]},
 {key:'RECEPTION',name:'Entrada e circulação',image:'reception',polygon:[[339,259],[475,259],[475,133],[539,133],[539,82],[630,82],[630,244],[686,244],[686,332],[653,332],[653,550],[605,550],[605,334],[497,334],[497,298],[339,298]],label:[518,281]},
 {key:'WAITING',name:'Espera',image:'lounge',polygon:rectangle(409,301,88,42),label:[483,308]},
 {key:'PHONE',name:'Cabine de telefone',image:'focus',polygon:rectangle(339,302,64,42),label:[352,338]},
 {key:'STAIR_NORTH',name:'Escada norte',image:'stairs',polygon:rectangle(346,32,187,99),label:[483,78]},
 {key:'STAIR_SOUTH',name:'Escada sul',image:'stairs',polygon:rectangle(65,455,105,93),label:[78,467]},
 {key:'WC1',name:'Sanitário 01',image:'support',polygon:rectangle(358,139,59,53),label:[386,151]},
 {key:'WC2',name:'Sanitário 02',image:'support',polygon:rectangle(423,171,43,77),label:[445,202]},
];
export function addPrismalRooms(data:Database){
 for(const room of prismalRooms){
  const id='PRISMAL_'+room.key;
  const label=room.label??[room.polygon.reduce((s,p)=>s+p[0],0)/room.polygon.length,room.polygon.reduce((s,p)=>s+p[1],0)/room.polygon.length];
  data.rooms.push({id,layoutId:'PRISMAL_LAYOUT',name:room.name,kind:room.image,planRegion:{points:room.polygon.map(([x,y])=>({x:x/PLAN_WIDTH,y:y/PLAN_HEIGHT}))},planLabel:{x:label[0]/PLAN_WIDTH,y:label[1]/PLAN_HEIGHT}});
  data.roomConfigurations.push({id:'CONFIG_'+id,roomId:id,layoutId:'PRISMAL_LAYOUT',name:'Nova planta',notes:'Referências de produtos e acabamentos aguardando cadastro.',selectedAssets:[],revision:1,updatedAt:'2026-09-23T00:00:00.000Z'});
 }
}