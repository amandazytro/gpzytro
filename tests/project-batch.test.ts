import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runProjectBatch,type BatchTask,type BatchResult} from '../src/domain/project-batch';
import {planProjectBatch} from '../src/services/project-batch';
import {prismalRooms} from '../src/data/prismal-rooms';
import {isRoomLocked} from '../src/domain/room-availability';
import {validateAstraInput} from '../src/services/astra-images';
import {POST} from '../src/app/api/astra/route';
import {readProjectState} from '../src/services/project-state';
import {roomSession} from '../src/services/room-session';
import {mockCatalogFiles} from './fixtures/catalog';

const tasks:BatchTask[]=['A','B','C'].map(roomId=>({roomId,roomName:roomId,moodboardNumber:'1'}));
test('batch renders serially, keeps successes and continues after a room fails',async()=>{
 const visited:string[]=[],results:BatchResult[]=[];let concurrent=0,maximum=0;
 const progress=await runProjectBatch(tasks,new AbortController().signal,async task=>{
  concurrent++;maximum=Math.max(maximum,concurrent);visited.push(task.roomId);
  await new Promise(resolve=>setTimeout(resolve,1));concurrent--;
  if(task.roomId==='B')throw Error('Room missing references');
  return {id:task.roomId,url:'/image',createdAt:''};
 },r=>results.push(r),()=>{});
 assert.deepEqual(visited,['A','B','C']);assert.equal(maximum,1);
 assert.equal(results[1].error,'Room missing references');
 assert.deepEqual(progress,{total:3,completed:2,failed:1,current:null});
});
test('cancel stops subsequent rooms and preserves completed images',async()=>{
 const controller=new AbortController(),results:BatchResult[]=[];let calls=0;
 const progress=await runProjectBatch(tasks,controller.signal,async task=>{
  calls++;return {id:task.roomId,url:'/image',createdAt:''};
 },result=>{results.push(result);controller.abort();},()=>{});
 assert.equal(calls,1);assert.equal(results.length,1);assert.equal(progress.completed,1);assert.equal(progress.failed,0);
});
test('cancel during a request does not count an API failure or start another room',async()=>{
 const controller=new AbortController();let calls=0;
 const progress=await runProjectBatch(tasks,controller.signal,async()=>{
  calls++;controller.abort();throw new DOMException('Aborted','AbortError');
 },()=>assert.fail('No image completed'),()=>{});
 assert.equal(calls,1);assert.equal(progress.failed,0);assert.equal(progress.completed,0);
});
test('server plans all available rooms and saves batch images for later room sessions',async()=>{
 const temporary=await mkdtemp(path.join(tmpdir(),'astra-batch-test-'));
 const oldDir=process.env.ASTRA_DATA_DIR,oldKey=process.env.OPENAI_API_KEY,oldFetch=globalThis.fetch;
 process.env.ASTRA_DATA_DIR=temporary;process.env.OPENAI_API_KEY='test-key';
 let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({output:[{type:'image_generation_call',result:Buffer.from('test-image').toString('base64')}]});};
 let catalogMock:ReturnType<typeof mockCatalogFiles>|undefined;
 try{
  const actual=await planProjectBatch();
  const rooms=prismalRooms.filter(r=>!isRoomLocked('PRISMAL_'+r.key));
  assert.equal(actual.tasks.length,rooms.length);
  assert.ok(actual.tasks.every(t=>t.moodboardNumber==='1'&&!isRoomLocked(t.roomId)));
  assert.equal(actual.skipped.length,6);assert.equal(calls,0);
  catalogMock=mockCatalogFiles();
  const post=(body:unknown)=>POST(new Request('http://localhost/api/astra',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
  const response=await post({scope:'project',prompt:'Luz acolhedora',references:[]});
  assert.equal(response.status,200);
  const {batch}=await response.json();assert.equal(batch.tasks.length,rooms.length*3);assert.equal(calls,0);
  assert.equal((await readProjectState()).direction?.prompt,'Luz acolhedora');
  const rendered=[];
  for(const task of batch.tasks.filter((t:BatchTask)=>t.roomId==='PRISMAL_LOUNGE')){
   const response=await post({prompt:'Luz acolhedora',roomId:task.roomId,moodboardNumber:task.moodboardNumber,fullComposition:true,useBasePreview:true,saveComposition:true});
   const body=await response.json();assert.equal(response.status,200,body.error);
   rendered.push(body.image);
   assert.equal((await readProjectState()).savedCompositions?.[task.roomId]?.[task.moodboardNumber as '1']?.image.id,body.image.id);
  }
  assert.equal(calls,3);
  assert.equal((await roomSession('PRISMAL_LOUNGE')).image?.id,rendered[2].id);
  for(const value of [{prompt:'x',saveComposition:true},{prompt:'x',roomId:'PRISMAL_LOUNGE',saveComposition:'yes'}])assert.throws(()=>validateAstraInput(value));
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(planProjectBatch(),/API/);
 }finally{
  catalogMock?.mock.restore();globalThis.fetch=oldFetch;
  if(oldDir===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=oldDir;
  if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;
  const resolved=path.resolve(temporary);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('astra-batch-test-'))await rm(resolved,{recursive:true,force:true});
 }
});
