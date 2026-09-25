import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {prismalDatabase,withPrismalBase} from '../src/data/prismal';
import {validateDatabase} from '../src/data/validation';
import {demoDatabase} from '../src/data/demo';
import {planProducts} from '../src/data/plan-products';
import {projectPlans,PLAN_WIDTH,PLAN_HEIGHT} from '../src/data/project-plans';

test('new mapped rooms use the supplied SVG and PDF and do not restore discarded renders or moodboards',()=>{
 const data=prismalDatabase();validateDatabase(data);
 assert.equal(data.rooms.length,14);assert.deepEqual(data.roomRenders,[]);assert.deepEqual(data.moodboards,[]);
 assert.equal(data.referenceDocuments[0].previewImageUrl,projectPlans.floor.display);
 for(const room of data.rooms)assert.ok(room.planRegion!.points.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));
 for(const [key,file] of [['floor','PLANTA BAIXA.svg'],['ceiling','2015-171 -15SP - 272_Rev_B_RCP Ceiling Heights Third Floor.pdf']] as const)
  assert.deepEqual(readFileSync('public'+projectPlans[key].original),readFileSync('src/PLANTAS/'+file));
});
test('room migration remains idempotent and preserves unrelated projects',()=>{
 const original=demoDatabase(),merged=withPrismalBase(original);validateDatabase(merged);
 assert.ok(merged.projects.some(p=>p.id==='DEMO_PROJECT'));assert.deepEqual(withPrismalBase(merged),merged);
});
test('new furniture and surface targets stay within the supplied plan and have reference images',()=>{
 assert.equal(new Set(planProducts.map(p=>p.id)).size,planProducts.length);
 for(const p of planProducts){
  assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=PLAN_WIDTH&&p.y+p.height<=PLAN_HEIGHT,p.id);
  assert.ok(existsSync('public'+p.image),p.id);
 }
 for(const kind of ['chair','table','counter','wall','glass','door'])assert.ok(planProducts.some(p=>p.id.startsWith(kind+'-')));
});
test('retired elevator areas merge into circulation without losing other room edits',()=>{
 const data=prismalDatabase(),reception=data.rooms.find(r=>r.id==='PRISMAL_RECEPTION')!;
 const retired={...reception,id:'PRISMAL_LIFT1',name:'Elevador 01'};
 data.rooms.push(retired);
 data.referenceDocuments.push({...data.referenceDocuments[0],id:'LEGACY_LIFT_DOC',roomId:retired.id});
 const merged=withPrismalBase(data);
 assert.equal(merged.rooms.length,14);
 assert.ok(!merged.rooms.some(r=>r.id==='PRISMAL_LIFT1'||r.id==='PRISMAL_LIFT2'));
 assert.equal(merged.referenceDocuments.find(d=>d.id==='LEGACY_LIFT_DOC')?.roomId,'PRISMAL_RECEPTION');
 const points=merged.rooms.find(r=>r.id==='PRISMAL_RECEPTION')!.planRegion!.points;
 const contains=(x:number,y:number)=>{
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[i],b=points[j];
   if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
 };
 assert.ok(contains(588/882,127/580));
 assert.ok(contains(588/882,188/580));
 assert.ok(!contains(450/882,200/580));
});
