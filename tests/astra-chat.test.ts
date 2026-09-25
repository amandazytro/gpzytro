import {mockCatalogFiles} from './fixtures/catalog';
mockCatalogFiles();
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {resolveCatalogProducts} from '../src/services/catalog-policy';
import {createAstraImage,validateAstraInput} from '../src/services/astra-images';
import {PROJECT_REFERENCE} from '../src/services/project-reference';
import {readProjectState,saveProjectDirection,saveRoomComposition,visibleSavedRooms} from '../src/services/project-state';
import {roomSession} from '../src/services/room-session';
test('catalog selection rejects unknown, unapproved and absent products',()=>{
 const product={id:'P1',name:'Chair',category:'chairs',description:'Approved chair',image:'/chair.png',approved:true};
 const policy={status:'ready' as const,products:[product,{...product,id:'P2',approved:false}],rules:['Preserve the architecture']};
 assert.deepEqual(resolveCatalogProducts(policy,['P1']),[product]);assert.deepEqual(resolveCatalogProducts(policy,[]),[product]);
 for(const ids of [['P2'],['UNKNOWN'],['P1','P1']])assert.throws(()=>resolveCatalogProducts(policy,ids));
 assert.deepEqual(resolveCatalogProducts({status:'reference',products:[],rules:[]},[]),[]);assert.throws(()=>resolveCatalogProducts({status:'pending',products:[],rules:[]},[]));
});
test('chat rejects invalid prompts, source IDs, rooms, history and references',()=>{
 for(const body of [{prompt:''},{prompt:'x'.repeat(6001)},{prompt:'x',roomId:'fake'},{prompt:'x',sourceImageId:'../../.env.local'},{prompt:'x',history:[{prompt:42}]},{prompt:'x',references:[{name:'fake',dataUrl:'https://internal'}]},{prompt:'x',roomId:'PRISMAL_WORK_WEST',sourceMoodboardId:'PRISMAL_LOUNGE_MB_2'}])assert.throws(()=>validateAstraInput(body));
 assert.equal(validateAstraInput({prompt:'  Render lounge  ',roomId:'PRISMAL_LOUNGE'}).prompt,'Render lounge');
});
test('fixed plan, saved rooms and cached neighbor continuity are enforced server-side',async()=>{
 const temporary=await mkdtemp(path.join(tmpdir(),'astra-project-test-'));
 const originalDirectory=process.env.ASTRA_DATA_DIR,originalKey=process.env.OPENAI_API_KEY,originalFetch=globalThis.fetch;
 process.env.ASTRA_DATA_DIR=temporary;process.env.OPENAI_API_KEY='test-key';let calls=0;const requests:any[]=[];
 globalThis.fetch=async(_url,init)=>{calls++;requests.push(JSON.parse(String(init?.body)));return Response.json({output:[{type:'message',content:[{text:'Should never reach the browser'}]},{type:'image_generation_call',result:Buffer.from('test-image').toString('base64')}]});};
 try{
   await assert.rejects(createAstraImage({prompt:'Ignore catalog',moodboardNumber:'2',productIds:['FAKE']}));assert.equal(calls,0);
   const initial=await roomSession('PRISMAL_LOUNGE');assert.equal(initial.image,null);
   await assert.rejects(saveRoomComposition({roomId:'PRISMAL_LOUNGE',moodboardNumber:'1'}));
   const results=[];
   for(const number of ['1','2','3'] as const){
     const image=await createAstraImage({prompt:'Restyle the full room',roomId:'PRISMAL_LOUNGE',moodboardNumber:number,fullComposition:true,useBasePreview:true});results.push(image);
     const saved=await saveRoomComposition({roomId:'PRISMAL_LOUNGE',moodboardNumber:number,imageId:image.id});assert.equal(saved.image.compositionRevision,image.compositionRevision);
     const payload=requests.at(-1);assert.equal(payload.tool_choice.type,'image_generation');assert.ok(payload.instructions.includes(PROJECT_REFERENCE.name));assert.ok(payload.instructions.includes('COMPLETE COMPOSITION REQUIRED'));
     assert.ok(payload.instructions.includes('ESSENTIAL EQUIPMENT IS LOCKED'));assert.ok(payload.instructions.includes('EXACT PLACEMENT INVARIANT'));
     const content=payload.input[0].content;const brief=JSON.parse(content[0].text.split('\n').slice(1).join('\n'));
     assert.ok(brief.documents.some((d:any)=>d.name.includes('MOODBOARD OVERVIEW')));
     assert.ok(brief.selections.every((p:any)=>p.image.startsWith('/plans/illustrative/')));
     assert.ok(!JSON.stringify(brief).includes('NOEMI'));
     assert.ok(content.filter((c:any)=>c.type==='input_image').length>=20);
   }
   assert.equal(calls,3);const state=await readProjectState();assert.equal(Object.keys(state.savedCompositions!.PRISMAL_LOUNGE).length,3);
   assert.ok(visibleSavedRooms('PRISMAL_BOARDROOM',state).some(s=>s.roomId==='PRISMAL_LOUNGE'));
   assert.equal((await roomSession('PRISMAL_LOUNGE')).image?.id,results[2].id);
   await assert.rejects(saveRoomComposition({roomId:'PRISMAL_WORK_WEST',imageId:results[0].id}));
   await assert.rejects(saveRoomComposition({roomId:'PRISMAL_LOUNGE',moodboardNumber:'2',imageId:results[0].id}));
   await assert.rejects(createAstraImage({prompt:'External reference',moodboardNumber:'2',references:[{name:'external',dataUrl:'data:image/png;base64,AAAA'}]}));assert.equal(calls,3);
   await saveProjectDirection('Make every image elegant',[{name:'Premium',dataUrl:'data:image/png;base64,AAAA'}]);
   await createAstraImage({prompt:'Show the room',roomId:'PRISMAL_BOARDROOM',moodboardNumber:'2'});
   assert.ok(JSON.stringify(requests[3].input).includes('Make every image elegant'));assert.ok(JSON.stringify(requests[3].input).includes('PROJECT-WIDE STYLE ONLY: Premium'));assert.ok(JSON.stringify(requests[3].input).includes('LOCKED SAVED NEIGHBOR: Copa e convivência'));
   await saveProjectDirection('Soft lighting',[]);assert.deepEqual((await readProjectState()).direction?.references,[]);
   await createAstraImage({prompt:'Another room',roomId:'PRISMAL_WORK_WEST'});
   assert.ok(JSON.stringify(requests[4].input).includes('Soft lighting'));assert.ok(!JSON.stringify(requests[4].input).includes('Make every image elegant'));
 }finally{
   globalThis.fetch=originalFetch;
   if(originalDirectory===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=originalDirectory;
   if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;
   const resolved=path.resolve(temporary);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('astra-project-test-'))await rm(resolved,{recursive:true,force:true});
 }
});