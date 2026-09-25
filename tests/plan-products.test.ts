import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {planModelGroups,planProducts,planInstanceManifest} from '../src/data/plan-products';
import {registeredProductFor} from '../src/domain/plan-product-catalog';
import {savePlanProduct,readPlanProductCatalog,readPlanProductPhoto,registeredPlanContext} from '../src/services/plan-product-catalog';

test('matching drawings preserve separate IDs and distinguish sizes and composite objects',()=>{
 const group=(id:string)=>planModelGroups.find(m=>m.id===id)!;
 assert.equal(group('CAD-01').instances.length,24);
 assert.equal(group('MES-01').instances.length,24);
 assert.equal(group('MES-10').instances.length,2);
 assert.equal(group('BAN-01').instances.length,4);
 assert.equal(group('SOF-01').instances.length,1);
 assert.equal(group('SOF-01').instances[0].parts?.length,2);
 assert.notEqual(group('MES-04').instances[0].width,group('MES-05').instances[0].width);
 assert.equal(new Set(planProducts.map(p=>p.instanceCode)).size,planProducts.length);
 assert.ok(group('CAD-01').instances.some(p=>p.rotationDeg===180));
 const manifest=planInstanceManifest();assert.equal(manifest.instances.length,planProducts.length);
 assert.equal(manifest.status,'visual-inference-unverified');
 assert.ok(!JSON.stringify(manifest).includes('illustrative'));
});
test('local registrations persist photos, validate input and apply instance overrides before model defaults',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'prismal-products-')),previous=process.env.ASTRA_DATA_DIR;
 process.env.ASTRA_DATA_DIR=directory;
 try{
  const image=await sharp({create:{width:4,height:4,channels:3,background:'#eeeeee'}}).png().toBuffer();
  const common={scope:'model',targetId:'CAD-01',name:'Cadeira cadastrada',manufacturer:'Fabricante cadastrado',finish:'Tecido bege e estrutura preta',link:'https://example.com/cadeira',photo:'data:image/png;base64,'+image.toString('base64')};
  for(const patch of [{targetId:'unknown'},{link:'javascript:alert(1)'},{name:''},{photo:'data:image/png;base64,AAAA'}])await assert.rejects(savePlanProduct({...common,...patch}));
  const first=await savePlanProduct(common);
  assert.equal(first.products.length,1);
  assert.ok((await readPlanProductPhoto(first.saved.imageUrl.split('/').at(-1)!)).length>0);
  const chairs=planProducts.filter(p=>p.modelId==='CAD-01');
  assert.equal(registeredProductFor(await readPlanProductCatalog(),chairs[1])?.name,common.name);
  await savePlanProduct({...common,scope:'instance',targetId:chairs[0].id,name:'Cadeira especial'});
  await savePlanProduct({...common,photo:undefined,name:'Modelo revisado'});
  const records=await readPlanProductCatalog();
  assert.equal(registeredProductFor(records,chairs[0])?.name,'Cadeira especial');
  assert.equal(registeredProductFor(records,chairs[1])?.name,'Modelo revisado');
  const context=await registeredPlanContext('PRISMAL_WORK_WEST');
  assert.equal(context.instances.length,24);
  assert.equal(context.references.length,2);
  assert.ok(context.instances.some(i=>i.referenceKey==='instance:'+chairs[0].id));
  assert.equal(context.instances.filter(i=>i.referenceKey==='model:CAD-01').length,23);
 }finally{
  if(previous===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=previous;
  const resolved=path.resolve(directory);
  if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('prismal-products-'))await rm(resolved,{recursive:true,force:true});
 }
});