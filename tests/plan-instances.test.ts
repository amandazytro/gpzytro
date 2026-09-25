import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {readPlanInstances,savePlanInstances,InstanceConflict} from '../src/services/plan-instances';
import {initialPlanInstances,createPlanInstance,assignModel,validatePlanInstances} from '../src/domain/plan-instances';
import {savePlanProduct,registeredPlanContext} from '../src/services/plan-product-catalog';
test('instances can be created, linked, unlinked and removed without reviving defaults',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'prismal-instances-')),previous=process.env.ASTRA_DATA_DIR;process.env.ASTRA_DATA_DIR=dir;
 try{
  const baseline=await readPlanInstances();
  assert.equal(baseline.instances.length,initialPlanInstances.length);
  assert.ok(baseline.instances.every(p=>p.category==='Mobiliário'));
  const created=createPlanInstance({x:100,y:155,width:24,height:18},'CAD-01','instance-custom-1','INST-0001');
  const state=await savePlanInstances({revision:baseline.revision,instances:[...baseline.instances,created]});
  await assert.rejects(savePlanInstances({revision:baseline.revision,instances:[]}),InstanceConflict);
  const image=await sharp({create:{width:4,height:4,channels:3,background:'white'}}).png().toBuffer();
  await savePlanProduct({scope:'instance',targetId:created.id,name:'Nova cadeira',manufacturer:'Teste',finish:'Preto',photo:'data:image/png;base64,'+image.toString('base64')});
  assert.ok((await registeredPlanContext()).instances.some(i=>i.instanceId==='INST-0001'));
  const first=baseline.instances[0];
  const linked=await savePlanInstances({revision:state.revision,instances:state.instances.map(p=>p.id===created.id?assignModel(p,first.modelId):p)});
  assert.equal(linked.instances.find(p=>p.id===created.id)?.modelId,first.modelId);
  const unlinked=await savePlanInstances({revision:linked.revision,instances:linked.instances.map(p=>p.id===created.id?assignModel(p,''):p)});
  assert.equal(unlinked.instances.find(p=>p.id===created.id)?.modelId,'');
  const removed=await savePlanInstances({revision:unlinked.revision,instances:unlinked.instances.filter(p=>p.id!==created.id&&p.id!==first.id)});
  assert.ok(!(await readPlanInstances()).instances.some(p=>p.id===first.id||p.id===created.id));
  assert.ok(!(await registeredPlanContext()).inventory.instances.some(p=>p.id==='INST-0001'));
  await assert.rejects(savePlanProduct({scope:'instance',targetId:created.id,name:'Removed',manufacturer:'Teste',finish:'Preto'}));
  await savePlanInstances({revision:removed.revision,instances:[]});
  assert.deepEqual((await readPlanInstances()).instances,[]);
 }finally{if(previous===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=previous;await rm(dir,{recursive:true,force:true});}
});
test('invalid instances cannot introduce unknown models, duplicate IDs or off-plan bounds',()=>{
 const p=createPlanInstance({x:10,y:20,width:25,height:30},'CAD-01','instance-valid','INST-1');
 for(const input of [[p,p],[{...p,modelId:'missing'}],[{...p,x:900}],[{...p,id:'../../file'}],[{...p,roomId:'unknown'}]]){
  assert.throws(()=>validatePlanInstances(input));
 }
 assert.equal(validatePlanInstances([assignModel(p,'')])[0].modelId,'');
});
