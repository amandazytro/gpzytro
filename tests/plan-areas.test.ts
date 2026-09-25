import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validatePlanAreas} from '../src/domain/plan-areas';
import {readPlanAreas,savePlanAreas,AreaConflict} from '../src/services/plan-areas';
import {readPlanInstances} from '../src/services/plan-instances';
test('area refinements persist, reject crossing edges and update room assignments',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'prismal-areas-')),previous=process.env.ASTRA_DATA_DIR;process.env.ASTRA_DATA_DIR=directory;
 try{
  const before=await readPlanAreas();
  const areas={PRISMAL_WORK_WEST:[{x:.4,y:.05},{x:.5,y:.05},{x:.5,y:.1},{x:.4,y:.1}]};
  const saved=await savePlanAreas({areas,revision:before.revision});
  assert.deepEqual((await readPlanAreas()).areas,areas);
  assert.notEqual(saved.revision,before.revision);
  assert.ok((await readPlanInstances()).instances.filter(p=>p.modelId==='CAD-01').every(p=>p.roomId!=='PRISMAL_WORK_WEST'));
  await assert.rejects(savePlanAreas({areas:{},revision:before.revision}),AreaConflict);
  for(const points of [[{x:0,y:0},{x:1,y:1},{x:0,y:1},{x:1,y:0}],[{x:-1,y:0},{x:1,y:0},{x:1,y:1}],[{x:0,y:0},{x:0,y:0},{x:1,y:1}]]){
   assert.throws(()=>validatePlanAreas({PRISMAL_WORK_WEST:points}));
  }
  await savePlanAreas({areas:{},revision:saved.revision});
  assert.deepEqual((await readPlanAreas()).areas,{});
 }finally{if(previous===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=previous;await rm(directory,{recursive:true,force:true});}
});
