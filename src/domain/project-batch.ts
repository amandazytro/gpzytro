import type { MoodboardNumber } from '../services/catalog-policy';
import type { RoomImage } from '../services/project-state';

export interface BatchTask { roomId:string; roomName:string; moodboardNumber:MoodboardNumber }
export interface BatchPlan { tasks:BatchTask[]; skipped:{name:string;reason:string}[] }
export interface BatchResult { task:BatchTask; image?:RoomImage; error?:string }
export interface BatchProgress { total:number; completed:number; failed:number; current:BatchTask|null }

/** One request per image keeps each render within the server request limit. */
export async function runProjectBatch(
  tasks:BatchTask[], signal:AbortSignal,
  generate:(task:BatchTask,signal:AbortSignal)=>Promise<RoomImage>,
  onResult:(result:BatchResult)=>void,
  onProgress:(progress:BatchProgress)=>void,
){
  let completed=0,failed=0;
  for(const task of tasks){
    if(signal.aborted)break;
    onProgress({total:tasks.length,completed,failed,current:task});
    try{
      const image=await generate(task,signal);
      completed++;
      onResult({task,image});
    }catch(error){
      if(signal.aborted)break;
      failed++;
      onResult({task,error:error instanceof Error?error.message:'Não foi possível gerar este ambiente.'});
    }
  }
  const progress={total:tasks.length,completed,failed,current:null};
  onProgress(progress);
  return progress;
}
