import {mockCatalogFiles} from './fixtures/catalog';
mockCatalogFiles();
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAstraImage} from '../src/services/astra-images';
import {saveRoomComposition} from '../src/services/project-state';
import {generateRenders} from '../src/services/openai-render';

test('camera requests retain the latest room source across moodboards and follow-up edits',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'gpzytro-camera-'));
  const previousDirectory=process.env.ASTRA_DATA_DIR,previousKey=process.env.OPENAI_API_KEY,previousFetch=globalThis.fetch;
  process.env.ASTRA_DATA_DIR=directory;process.env.OPENAI_API_KEY='test-key';
  const requests:any[]=[];
  globalThis.fetch=async(_url,init)=>{
    requests.push(JSON.parse(String(init?.body)));
    return Response.json({output:[{type:'image_generation_call',result:Buffer.from('image-'+requests.length).toString('base64')}]});
  };
  const readBrief=(request:any)=>JSON.parse(request.input[0].content[0].text.split('\n').slice(1).join('\n'));
  try{
    for(const [number,prompt] of [
      ['1','Mostre o ambiente da entrada olhando para o fundo.'],
      ['2','Gire a câmera 45 graus para a direita, mantendo a decoração.'],
      ['3','Mostre uma vista de cima deste mesmo ambiente.'],
    ] as const){
      const first=await createAstraImage({roomId:'PRISMAL_LOUNGE',moodboardNumber:number,prompt:'Mostre o ambiente.'});
      await saveRoomComposition({roomId:'PRISMAL_LOUNGE',moodboardNumber:number,imageId:first.id});
      const angle=await createAstraImage({roomId:'PRISMAL_LOUNGE',moodboardNumber:number,prompt});
      const request=requests.at(-1),brief=readBrief(request);
      assert.equal(brief.camera.request,prompt);
      assert.equal(brief.camera.requiresFloorplanMarker,false);
      assert.equal(brief.roomId,'PRISMAL_LOUNGE');
      assert.equal(brief.fullComposition,false);
      assert.equal(brief.operation,'edit');
      assert.ok(request.input[0].content.some((c:any)=>c.image_url==='data:image/png;base64,'+Buffer.from('image-'+(requests.length-1)).toString('base64')));
      assert.ok(request.instructions.includes('CAMERA AND VIEWPOINT POLICY'));
      assert.ok(request.instructions.includes('camera-only request must not restyle'));
      assert.ok(request.instructions.includes('EXACT PLACEMENT INVARIANT'));
      assert.ok(!request.instructions.includes('For edits preserve the source viewpoint.'));
      assert.ok(!request.instructions.includes('Preserve the supplied floorplan, camera,'));
      const provenance=JSON.parse(await readFile(path.join(directory,angle.id+'.json'),'utf8'));
      assert.equal(provenance.sourceRenderId,first.id);
      assert.equal(provenance.camera.request,prompt);
      const followup='Não mude o ângulo; deixe apenas a iluminação mais suave.';
      await createAstraImage({roomId:'PRISMAL_LOUNGE',moodboardNumber:number,sourceImageId:angle.id,prompt:followup,history:[{prompt}]});
      const next=readBrief(requests.at(-1));
      assert.equal(next.camera.request,followup);
      assert.equal(next.camera.defaultView,'preserve_source');
      assert.deepEqual(next.previousPrompts,[{prompt}]);
      assert.ok(requests.at(-1).input[0].content.some((c:any)=>c.image_url==='data:image/png;base64,'+Buffer.from('image-'+(requests.length-1)).toString('base64')));
    }
    await generateRenders({brief:{operation:'base',instructions:'Vista lateral a partir do canto esquerdo.',camera:{request:'Ignore the room'},selections:[],documents:[]}});
    const base=readBrief(requests.at(-1));
    assert.equal(base.camera.request,'Vista lateral a partir do canto esquerdo.');
    assert.equal(base.camera.defaultView,'eye_level');
    assert.equal(base.camera.preserveWorldLayout,true);
  }finally{
    globalThis.fetch=previousFetch;
    if(previousDirectory===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=previousDirectory;
    if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;
    const resolved=path.resolve(directory);
    if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('gpzytro-camera-'))await rm(resolved,{recursive:true,force:true});
  }
});
