import {fixtureCatalog} from './fixtures/catalog';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import path from 'node:path';
import {compositionPlan} from '../src/services/composition-plan';
import {loadCatalogPolicy,resolveCatalogProducts} from '../src/services/catalog-policy';
import {productGroup} from '../src/services/product-options';
test('discarded moodboards remain empty and block generation until replaced',async()=>{
 for(const number of ['2','3'] as const){
  const policy=await loadCatalogPolicy(number);assert.equal(policy.status,'pending');assert.deepEqual(policy.products,[]);
  assert.equal(policy.previewImage,undefined);assert.throws(()=>resolveCatalogProducts(policy,[]));
 }
});
test('composition respects functional roles and does not use booth seating for lounge sofas',async()=>{
 for(const number of ['1','2','3'] as const){const policy=fixtureCatalog(number);const plan=compositionPlan('PRISMAL_LOUNGE',policy);
 assert.equal(plan.items.find(i=>i.element==='sofa')?.productId,null);
 assert.equal(plan.items.find(i=>i.element==='workspace booth')?.productId,'FN-06');
 assert.equal(plan.items.find(i=>i.element==='armchair')?.productId,'FN-01');
 assert.equal(plan.items.find(i=>i.element==='coffee table')?.productId,'FN-04');
 assert.equal(plan.items.find(i=>i.element==='main table')?.productId,null);
 assert.match(plan.items.find(i=>i.element==='main table')!.change,/A large table stays a large table/);
 assert.equal(plan.items.find(i=>i.element==='rug')?.productId,number==='3'?null:'RG-01');
 assert.equal(plan.items.find(i=>i.element==='artwork')?.productId,number==='3'?'AR-01':null);
 assert.ok(plan.productIds?.includes('FL-01'));assert.ok(!JSON.stringify(plan).includes('NOEMI'));assert.ok(!JSON.stringify(plan).includes('WD-05'));
 }
 const grey=fixtureCatalog('3');assert.equal(productGroup(grey.products.find(p=>p.id==='RG-01')!),'Piso decorativo');
});
test('explicit armchair choice excludes alternatives and retains complementary wall finishes',async()=>{
 const policy=fixtureCatalog('2');
 for(const room of ['PRISMAL_LOUNGE','PRISMAL_OFFICE_S3']){
 const plan=compositionPlan(room,policy,['FN-03']);assert.equal(plan.items.find(i=>i.element==='armchair')?.productId,'FN-03');
 assert.ok(!plan.productIds?.includes('FN-01'));assert.ok(!plan.productIds?.includes('FN-02'));
 for(const id of ['WL-01','WL-02','WL-03','WL-04','FL-01'])assert.ok(plan.productIds?.includes(id));
 assert.doesNotThrow(()=>resolveCatalogProducts(policy,plan.productIds));
 }
 assert.throws(()=>compositionPlan('PRISMAL_LOUNGE',policy,['FN-01','FN-02']));assert.throws(()=>compositionPlan('PRISMAL_LOUNGE',policy,['FN-09']));
});
