import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createAstraImage} from '../src/services/astra-images';
import {loadCatalogPolicy} from '../src/services/catalog-policy';
import {readPlanInstances,savePlanInstances} from '../src/services/plan-instances';
import {createPlanInstance} from '../src/domain/plan-instances';
import {getMoodboardContext} from '../src/services/moodboard-context';
import {savePlanProduct} from '../src/services/plan-product-catalog';
import {readProjectState,saveRoomComposition,renderReferencesCurrent} from '../src/services/project-state';
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
test('authorized renderer sends current assignments and image bytes; initial prompt also saves project direction',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'astra-authorized-'));
 const oldDir=process.env.ASTRA_DATA_DIR,oldKey=process.env.OPENAI_API_KEY,oldFetch=globalThis.fetch;
 process.env.ASTRA_DATA_DIR=dir;process.env.OPENAI_API_KEY='test-only';
 const requests:any[]=[];
 globalThis.fetch=async(url,init)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({output:[{type:'image_generation_call',result:Buffer.from('simulated-image').toString('base64')}]});
 };
 try{
  const policy=await loadCatalogPolicy('1');assert.equal(policy.externalDelivery,'authorized');assert.equal(policy.products.length,47);
  const before=await readPlanInstances();
  const make=(id:string,model:string,x:number,y:number,w:number,h:number)=>createPlanInstance({x,y,width:w,height:h},model,id,id.toUpperCase());
  const items=[
   {...make('audit-sofa','SOF-FIC-01',506,496,100,65),parts:[{x:506,y:538,width:99,height:22},{x:578,y:496,width:28,height:65}]},
   make('audit-counter','SUP-FIC-01',530,350,72,102),
   make('audit-chair','POL-CAP-01',517,502,26,27),
   make('audit-table','MES-CAP-01',557,495,31,30),
  ];
  await savePlanInstances({instances:items,revision:before.revision});
  const directionImage='data:image/png;base64,'+(await readFile('public/catalog/original-designs/trama.png')).toString('base64');
  await createAstraImage({prompt:'Gere o projeto com iluminação suave.',applyProjectDirection:true,references:[{name:'Direção',dataUrl:directionImage}]});
  assert.equal((await readProjectState()).direction?.prompt,'Gere o projeto com iluminação suave.');
  assert.equal(requests.length,1);
  assert.equal(requests[0].store,false);
  const first=JSON.parse(requests[0].input[0].content[0].text.split('\n').slice(1).join('\n'));
  assert.equal(first.projectDirection,'Gere o projeto com iluminação suave.');
  assert.equal(first.instanceReferences.assignments.length,4);
  const image=await createAstraImage({prompt:'Gere a copa.',roomId:'PRISMAL_LOUNGE',fullComposition:true});
  const sent=JSON.parse(requests[1].input[0].content[0].text.split('\n').slice(1).join('\n'));
  assert.equal(sent.instanceReferences.assignments.find((a:any)=>a.instanceId==='audit-sofa').productId,'FIC-ELO');
  assert.equal(sent.instanceReferences.assignments.find((a:any)=>a.instanceId==='audit-sofa').parts.length,2);
  assert.equal(sent.fidelity.exactGeometryGuaranteed,false);
  assert.equal(sent.spatialConstraints.coordinates.origin,'top-left of the original floorplan');
  assert.match(sent.spatialConstraints.boundaries,/NOT walls/);
  const payload=requests[1].input[0].content;
  const guideIndex=payload.findIndex((c:any)=>c.type==='input_text'&&c.text.includes('Reference: CURRENT SPATIAL GUIDE'));
  assert.ok(guideIndex>0);
  assert.equal(payload[guideIndex+1].type,'input_image');
  assert.equal(payload[guideIndex+1].detail,'high');
  assert.equal(sent.compositionPlan.items.length,4);
  assert.ok(!sent.selections.some((p:any)=>p.assetId==='CAP-MEETING-CHAIR'));
  assert.ok(requests[1].instructions.includes('ALREADY CREATED fictional model'));
  const imageHashes=new Set(requests[1].input[0].content.filter((c:any)=>c.type==='input_image').map((c:any)=>hash(Buffer.from(c.image_url.split(',')[1],'base64'))));
  for(const url of ['/plans/floorplan-reference.png','/plans/ceiling-page-1.png','/plans/dimensions-original.png','/plans/dimensions-upper.png','/plans/dimensions-lower.png','/plans/dimensions-schedule.png','/plans/dimensions-notes.png','/catalog/original-designs/elo.png','/catalog/original-designs/dobra.png','/catalog/captures-2026-09-24/150052.png','/catalog/captures-2026-09-24/150104.png'])assert.ok(imageHashes.has(hash(await readFile('public'+url))),url);
  const provenance=JSON.parse(await readFile(path.join(dir,image.id+'.json'),'utf8'));
  assert.equal(provenance.referenceRevision,image.referenceRevision);assert.ok(provenance.referenceManifest.length>=11);
  await saveRoomComposition({roomId:'PRISMAL_LOUNGE',imageId:image.id,moodboardNumber:'1'});
  const current=await readPlanInstances();
  await savePlanInstances({instances:current.instances.map(p=>p.id==='audit-chair'?{...p,x:p.x+1}:p),revision:current.revision});
  assert.equal(await renderReferencesCurrent(image.id,'PRISMAL_LOUNGE'),false);
  await assert.rejects(saveRoomComposition({roomId:'PRISMAL_LOUNGE',imageId:image.id}),/mudaram/);
  const regenerated=await createAstraImage({prompt:'Atualize a iluminação.',roomId:'PRISMAL_LOUNGE',sourceImageId:image.id});
  const newMeta=JSON.parse(await readFile(path.join(dir,regenerated.id+'.json'),'utf8'));
  assert.equal(newMeta.sourceRenderId,null);assert.notEqual(regenerated.referenceRevision,image.referenceRevision);
  const calls=requests.length;
  await assert.rejects(createAstraImage({prompt:'Gerar WC',roomId:'PRISMAL_WC1'}),/bloqueado/);
  await assert.rejects(createAstraImage({prompt:'Gerar',roomId:'PRISMAL_LOUNGE',productIds:['CAP-MEETING-CHAIR']}),/compatível/);
  assert.equal(requests.length,calls);
  const manualPhoto=(await readFile('public/catalog/moodboard-1-pdf/no-image.png')).toString('base64');
  await savePlanProduct({scope:'instance',targetId:'audit-chair',name:'Cadeira manual',manufacturer:'Usuário',finish:'Preto',link:'',photo:'data:image/png;base64,'+manualPhoto});
  const manualContext=await getMoodboardContext('1','PRISMAL_LOUNGE');
  assert.equal(manualContext.assignments.find(a=>a.instanceId==='audit-chair')?.referenceMode,'manual_product');
  await createAstraImage({prompt:'Gerar com cadastro',roomId:'PRISMAL_LOUNGE'});
  const manualBrief=JSON.parse(requests.at(-1).input[0].content[0].text.split('\n').slice(1).join('\n'));
  assert.ok(manualBrief.registeredProducts.references.some((p:any)=>p.name==='Cadeira manual'));
  assert.ok(!manualBrief.selections.some((p:any)=>p.assetId==='CAP-GRAY-LOUNGE'));
 }finally{
  globalThis.fetch=oldFetch;
  if(oldDir===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=oldDir;
  if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;
  const resolved=path.resolve(dir);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('astra-authorized-'))await rm(resolved,{recursive:true,force:true});
 }
});
