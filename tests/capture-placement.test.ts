import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPlanInstance,validatePlanInstances} from '../src/domain/plan-instances';
import {placeCaptureFurniture} from '../src/domain/capture-placement';
import {loadLocalReferenceCatalog} from '../src/services/local-reference-catalog';
import {resolveMoodboardBindings} from '../src/services/moodboard-context';
import {referenceForInstance} from '../src/domain/reference-products';
function instance(code:string,model:string,x:number,y:number,width:number,height:number){
 return {...createPlanInstance({x,y,width,height},model,'test-'+code.toLowerCase(),code),roomId:'PRISMAL_LOUNGE'};
}
test('reviewed placement merges only known contours and preserves user edits',()=>{
 const before=[
 instance('INST-5B599119','SOF-01',506,538,99,22),
 instance('INST-3637D894','MES-09',578,496,28,65),
 instance('INST-AD0BFDD5','MES-06',531,348,70,24),
 instance('INST-4C706A45','MES-06',574,348,29,107),
 instance('INST-531CBF60','CAD-01',529,348,72,23),
 instance('INST-60A772A0','MES-04',557,495,31,30),
 instance('NEW-UNTOUCHED','MES-04',400,450,25,25),
 ];
 const result=placeCaptureFurniture(before);
 assert.equal(result.instances.length,4);assert.equal(result.merges.length,2);
 assert.equal(result.instances[0].modelId,'SOF-FIC-01');assert.equal(result.instances[0].parts?.length,2);
 assert.equal(result.instances[1].modelId,'SUP-FIC-01');assert.equal(result.instances[1].parts?.length,2);
 assert.equal(result.instances[2].modelId,'MES-CAP-01');
 assert.deepEqual(result.instances[3],before[6]);assert.doesNotThrow(()=>validatePlanInstances(result.instances));
 assert.deepEqual(placeCaptureFurniture(result.instances).instances,result.instances);
 const protectedResult=placeCaptureFurniture(before,new Set([before[0].id,before[5].id]));
 assert.equal(protectedResult.instances.find(p=>p.id===before[0].id)?.modelId,'SOF-01');
 assert.deepEqual(protectedResult.instances.find(p=>p.id===before[5].id),before[5]);
 assert.equal(protectedResult.merges.length,1);
});
test('current captures and original designs have provenance and no old moodboard dependency',async()=>{
 const catalog=await loadLocalReferenceCatalog();
 assert.equal(catalog.products.length,47);
 assert.equal(new Set(catalog.products.map(p=>p.id)).size,47);
 const fresh=catalog.products.filter(p=>p.sourceKind!=='pdf');
 assert.equal(fresh.filter(p=>p.sourceKind==='capture').length,5);
 assert.equal(fresh.filter(p=>p.sourceKind==='original').length,4);
 for(const p of fresh){
  await access('public'+p.image);assert.ok(!p.image.includes('illustrative'));assert.ok(!p.image.includes('moodboard-'));
  if(p.sourceCapture)assert.equal(createHash('sha256').update(await readFile('public'+p.sourceCapture.url)).digest('hex'),p.sourceCapture.sha256);
 }
 assert.ok(!catalog.products.some(p=>p.id==='CAP-BLUE-SOFA'));
 const sofa=instance('SOFA','SOF-FIC-01',506,496,99,65);
 const table=instance('TABLE','MES-CAP-01',557,495,31,30);
 const a=resolveMoodboardBindings(catalog,[sofa,table]);
 assert.equal(a[0].referenceMode,'original_design');assert.equal(a[0].productId,'FIC-ELO');
 assert.equal(a[1].productId,'CAP-BLACK-TABLE');assert.equal(a[1].sourceDimensions?.heightMm,450);
 assert.equal(referenceForInstance(catalog.products,sofa)?.id,'FIC-ELO');
 assert.equal(referenceForInstance(catalog.products,{...sofa,modelId:''}),undefined);
 assert.equal(resolveMoodboardBindings(catalog,[]).length,0);
});
