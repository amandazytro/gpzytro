import { prismalRooms } from '../data/prismal-rooms';
import { isRoomLocked } from '../domain/room-availability';
import type { BatchPlan } from '../domain/project-batch';
import { loadCatalogPolicy } from './catalog-policy';
import { RenderError } from './openai-render';

export async function planProjectBatch():Promise<BatchPlan>{
  if(!process.env.OPENAI_API_KEY)throw new RenderError('A API ainda não está configurada no servidor.',503);
  const catalogs=await Promise.all((['1','2','3'] as const).map(async number=>({number,...await loadCatalogPolicy(number)})));
  const available=catalogs.filter(c=>c.status!=='pending');
  if(!available.length)throw new RenderError('Nenhum moodboard está disponível para geração.');
  const plan:BatchPlan={tasks:[],skipped:catalogs.filter(c=>c.status==='pending').map(c=>({name:'MOODBOARD '+c.number,reason:'Referências ainda não configuradas.'}))};
  for(const room of prismalRooms){
    const roomId='PRISMAL_'+room.key;
    if(isRoomLocked(roomId)){plan.skipped.push({name:room.name,reason:'Ambiente bloqueado para criação.'});continue;}
    for(const catalog of available)plan.tasks.push({roomId,roomName:room.name,moodboardNumber:catalog.number});
  }
  return plan;
}
