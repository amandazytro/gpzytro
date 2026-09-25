import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {resolveMoodboardBindings} from '../src/services/moodboard-context';
import type {CatalogPolicy} from '../src/services/catalog-policy';
import {planProducts} from '../src/data/plan-products';
import {isRoomLocked} from '../src/domain/room-availability';
test('PDF references retain provenance and standardized images',async()=>{
 const p:CatalogPolicy=JSON.parse(await readFile('src/config/moodboard-pdf.json','utf8'));
 assert.equal(p.products.length,38);assert.equal(new Set(p.products.map(p=>p.id)).size,38);
 assert.equal(p.sourceDocument?.pageCount,12);
 assert.equal(createHash('sha256').update(await readFile('public/catalog/moodboard-1-pdf/source.pdf')).digest('hex'),p.sourceDocument?.sha256);
 for(const item of p.products){const m=await sharp('public'+item.image).metadata();assert.equal(m.width,640);assert.equal(m.height,640);assert.ok(item.sourceOccurrences?.every(r=>r.page<=10));}
 const instances=planProducts.slice(0,8);
 const a=resolveMoodboardBindings(p,instances);
 assert.deepEqual(a.map(a=>a.instanceId),instances.map(i=>i.id));
 assert.equal(resolveMoodboardBindings(p,[]).length,0);
 assert.throws(()=>resolveMoodboardBindings(p,instances,['does-not-exist']));
});
test('only the four requested rooms are temporarily locked',()=>{
 for(const id of ['STAIR_NORTH','STAIR_SOUTH','WC1','WC2'])assert.ok(isRoomLocked('PRISMAL_'+id));
 for(const id of ['WORK_WEST','RECEPTION','PHONE','WAITING'])assert.equal(isRoomLocked('PRISMAL_'+id),false);
});
