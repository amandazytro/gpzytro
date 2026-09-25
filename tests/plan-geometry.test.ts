import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readPlanGeometry,savePlanGeometry} from '../src/services/plan-geometry';
import {registeredPlanContext} from '../src/services/plan-product-catalog';
import {planProducts} from '../src/data/plan-products';
test('saved demarcations merge safely and override API instance bounds',async()=>{
 const original=process.env.ASTRA_DATA_DIR;const dir=await mkdtemp(path.join(os.tmpdir(),'prismal-geometry-'));process.env.ASTRA_DATA_DIR=dir;
 try{
  const a=planProducts[0],b=planProducts[1];const rect={x:100,y:110,width:40,height:35};
  await Promise.all([savePlanGeometry({rectangles:{[a.id]:rect}}),savePlanGeometry({rectangles:{[b.id]:{...rect,x:160}}})]);
  const saved=await readPlanGeometry();assert.equal(Object.keys(saved.rectangles).length,2);
  const context=await registeredPlanContext();const mapped=context.inventory.instances.find(p=>p.id===a.instanceCode)!;
  assert.deepEqual(mapped.bounds,{x:100/882,y:110/580,width:40/882,height:35/580});assert.equal(context.inventory.geometryRevision,saved.revision);
  assert.ok(context.inventory.manuallyMarkedInstanceIds.includes(a.id));
  await assert.rejects(savePlanGeometry({rectangles:{[a.id]:{...rect,width:900}}}));
  await assert.rejects(savePlanGeometry({rectangles:{unknown:rect}}));
  assert.equal((await readPlanGeometry()).revision,saved.revision);
  await savePlanGeometry({rectangles:{},remove:[a.id]});assert.deepEqual(Object.keys((await readPlanGeometry()).rectangles),[b.id]);
 }finally{if(original===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=original;await rm(dir,{recursive:true,force:true});}
});
