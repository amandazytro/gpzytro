import {planProducts} from '../../src/data/plan-products';
import {readFileSync} from 'node:fs';
import {test,expect,type Page} from '@playwright/test';
import {fixtureCatalog} from '../fixtures/catalog';
const catalog={moodboards:{'1':fixtureCatalog('1'),'2':fixtureCatalog('2'),'3':fixtureCatalog('3')}};
import {COMPOSITION_REVISION} from '../../src/services/product-options';
const preview='/plans/floorplan-aligned.svg';
const batchTasks=[{roomId:'PRISMAL_LOUNGE',roomName:'Copa e convivência',moodboardNumber:'1'},{roomId:'PRISMAL_BOARDROOM',roomName:'Sala de conselho',moodboardNumber:'1'}];
async function setup(page:Page){
 let direction:any=null,lastSaved:any=null;
 const savedCompositions:Record<string,any>={},renders:Record<string,any>={},requests:any[]=[];
 await page.route('**/api/astra',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{configured:true,direction,catalog:catalog.moodboards['1'],moodboards:Object.entries(catalog.moodboards).map(([number,value])=>({number,...value}))}});
  const body=route.request().postDataJSON();requests.push(body);
  if(body.applyProjectDirection)direction={prompt:body.prompt,references:body.references,updatedAt:new Date().toISOString()};
  if(body.scope==='project'){direction={prompt:body.prompt,references:body.references,updatedAt:new Date().toISOString()};return route.fulfill({json:{direction,batch:{tasks:batchTasks,skipped:[{name:"MOODBOARD 2",reason:"Referências pendentes"}]}}});}
  const id='12345678-1234-4234-9234-'+String(requests.length).padStart(12,'0');
  const image={id,url:'/api/renders/'+id,createdAt:new Date().toISOString(),compositionRevision:COMPOSITION_REVISION,productIds:body.productIds??[]};renders[id]=image;
  if(body.saveComposition){lastSaved={roomId:body.roomId,moodboardNumber:body.moodboardNumber,image,savedAt:new Date().toISOString()};savedCompositions[body.roomId]??={};savedCompositions[body.roomId][body.moodboardNumber]=lastSaved;}
  return route.fulfill({json:{image}});
 });
 await page.route('**/api/renders/*',route=>route.fulfill({body:readFileSync('public'+preview),contentType:'image/png'}));
 await page.route('**/api/project-state',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{version:1,savedCompositions,savedRooms:lastSaved?{[lastSaved.roomId]:lastSaved}:{},cachedRooms:{}}});
  const b=route.request().postDataJSON();lastSaved={roomId:b.roomId,moodboardNumber:b.moodboardNumber,image:renders[b.imageId],savedAt:new Date().toISOString()};
  savedCompositions[b.roomId]??={};savedCompositions[b.roomId][b.moodboardNumber]=lastSaved;return route.fulfill({json:{saved:lastSaved}});
 });
 await page.route('**/api/room-session',route=>{const b=route.request().postDataJSON();const saved=lastSaved?.roomId===b.roomId?lastSaved:null;return route.fulfill({json:{image:saved?.image??{id:'PREVIEW_V1_'+b.roomId,url:preview,createdAt:''},saved,automatic:false}});});
 return requests;
}
test('initial prompt generates every room, saves images and restores them on reload',async({page})=>{
 const requests=await setup(page);await page.goto('/');
 await expect(page.getByRole('heading',{name:'O que vamos criar hoje?'})).toBeVisible();
 await page.getByLabel('Seu prompt').fill('Make all images elegant');
 await page.locator('input[type=file]').setInputFiles({name:'premium.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6T9sAAAAASUVORK5CYII=','base64')});
 await page.getByRole('button',{name:'Gerar imagem',exact:true}).click();
 await expect(page.locator('.astra-batch')).toContainText('2 de 2 imagens salvas');
 await expect(page.locator('.astra-batch')).toContainText('Geração finalizada');
 expect(requests).toHaveLength(3);expect(requests[0].scope).toBe('project');expect(requests[0].references).toHaveLength(1);
 expect(requests.slice(1).map(r=>r.roomId)).toEqual(batchTasks.map(t=>t.roomId));
 expect(requests.slice(1).every(r=>r.saveComposition&&r.fullComposition&&r.useBasePreview&&r.prompt==='Make all images elegant')).toBe(true);
 await page.getByRole('button',{name:/Minhas imagens/}).click();await expect(page.locator('.astra-gallery-grid img')).toHaveCount(2);
 await page.reload();await page.getByRole('button',{name:/Minhas imagens/}).click();await expect(page.locator('.astra-gallery-grid img')).toHaveCount(2);
 await page.goto('/?room=PRISMAL_BOARDROOM');await expect(page.getByRole('button',{name:'Composição salva'})).toBeDisabled();expect(requests).toHaveLength(3);
});

test('batch continues after an image failure and reports its room',async({page})=>{
 const requests=await setup(page);
 await page.route('**/api/astra',route=>route.request().method()==='POST'&&route.request().postDataJSON().roomId==='PRISMAL_LOUNGE'?route.fulfill({status:400,json:{error:'Referência ausente'}}):route.fallback());
 await page.goto('/');await page.getByLabel('Seu prompt').fill('Luz suave');await page.getByLabel('Seu prompt').press('Enter');
 await expect(page.locator('.astra-batch')).toContainText('1 de 2 imagens salvas · 1 falha(s)');
 await expect(page.locator('.astra-batch')).toContainText('Referência ausente');
 expect(requests.at(-1).roomId).toBe('PRISMAL_BOARDROOM');
});

test('cancel batch stops before the next environment',async({page})=>{
 await setup(page);let started=0;
 await page.route('**/api/astra',async route=>{
  if(route.request().method()==='POST'&&route.request().postDataJSON().roomId){started++;return;}
  await route.fallback();
 });
 await page.goto('/');await page.getByLabel('Seu prompt').fill('Luz suave');await page.getByLabel('Seu prompt').press('Enter');
 await expect.poll(()=>started).toBe(1);await page.getByRole('button',{name:'Cancelar geração'}).click();
 await expect(page.locator('.astra-batch')).toContainText('Geração interrompida');expect(started).toBe(1);
});

test('all three complete moodboards generate, save and restore without reusing old previews',async({page})=>{
 const requests=await setup(page);await page.goto('/?room=PRISMAL_LOUNGE');await expect(page.locator('.astra-image-open img')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Salvar composição',exact:true})).toBeDisabled();
 for(const n of ['1','2','3']){
  await page.getByRole('button',{name:'MOODBOARD '+n,exact:true}).click();await expect.poll(()=>requests.length).toBe(Number(n));
  await expect(page.getByRole('button',{name:'Salvar composição',exact:true})).toBeEnabled();
  expect(requests.at(-1).moodboardNumber).toBe(n);expect(requests.at(-1).fullComposition).toBe(true);
  await page.getByRole('button',{name:'Salvar composição',exact:true}).click();await expect(page.getByRole('button',{name:'Composição salva'})).toBeDisabled();
 }
 await page.reload();await expect(page.getByRole('button',{name:'MOODBOARD 3',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const n of ['1','2','3']){await page.getByRole('button',{name:'MOODBOARD '+n,exact:true}).click();await expect(page.getByRole('button',{name:'Composição salva'})).toBeDisabled();}
 expect(requests).toHaveLength(3);await page.screenshot({path:'test-results/gpzytro-moodboards.png',fullPage:true});
});
test('product options separate chair variants from tables and booth furniture',async({page})=>{
 const requests=await setup(page);await page.goto('/?room=PRISMAL_LOUNGE');await page.getByRole('button',{name:'MOODBOARD 2',exact:true}).click();await expect.poll(()=>requests.length).toBe(1);
 await page.getByRole('button',{name:'Personalizar composição'}).click();
 await page.getByRole('radio',{name:'Blush lounge chair',exact:true}).check();await page.getByRole('radio',{name:'Blush lounge chair, mint cushion',exact:true}).check();
 await expect(page.getByRole('radio',{name:'Blush lounge chair',exact:true})).not.toBeChecked();
 await page.getByRole('radio',{name:'Slim wood coffee table',exact:true}).check();await page.getByRole('button',{name:'Gerar com minhas escolhas'}).click();
 await expect.poll(()=>requests.length).toBe(2);expect(requests[1].productIds).toEqual(['FN-03','FN-04']);
});
test('room edits use previous image and gallery deletion persists',async({page})=>{
 const requests=await setup(page);await page.goto('/?room=PRISMAL_LOUNGE');await page.getByLabel('Seu prompt').fill('Refine the light');await page.getByRole('button',{name:'Gerar imagem',exact:true}).click();await expect(page.locator('.astra-user-message')).toHaveCount(1);
 await page.getByLabel('Seu prompt').fill('Softer shadows');await page.getByLabel('Seu prompt').press('Enter');await expect(page.locator('.astra-user-message')).toHaveCount(2);expect(requests[1].sourceImageId).toBeTruthy();expect(requests[1].history[0].prompt).toBe('Refine the light');
 await page.getByRole('button',{name:/Minhas imagens/}).click();await expect(page.locator('.astra-gallery-grid img')).toHaveCount(2);await page.getByRole('button',{name:'Excluir imagem: Refine the light'}).click();await expect(page.locator('.astra-gallery-grid img')).toHaveCount(1);
 await page.reload();await page.getByRole('button',{name:/Minhas imagens/}).click();await expect(page.locator('.astra-gallery-grid img')).toHaveCount(1);
});
test('generation failures preserve the prompt for retry',async({page})=>{
 await setup(page);let failures=0;await page.route('**/api/astra',route=>route.request().method()==='POST'&&!failures++?route.fulfill({status:429,json:{error:'Please retry'}}):route.fallback());
 await page.goto('/?room=PRISMAL_LOUNGE');await page.getByLabel('Seu prompt').fill('Refine lighting');await page.getByRole('button',{name:'Gerar imagem',exact:true}).click();await expect(page.locator('.astra-chat-error')).toContainText('Please retry');await expect(page.getByLabel('Seu prompt')).toHaveValue('Refine lighting');
 await page.getByRole('button',{name:'Gerar imagem',exact:true}).click();await expect(page.locator('.astra-user-message')).toHaveCount(1);
});
test('mobile navigation opens rooms and generates the first completed moodboard',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Abrir menu'}).click();await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();await page.getByRole('button',{name:'03 Copa e convivência',exact:true}).click();
 await page.getByRole('button',{name:'Usar ambiente na criação',exact:true}).click();
 await expect(page.locator('.astra-room-context')).toContainText('Copa e convivência');await page.getByRole('button',{name:'MOODBOARD 1',exact:true}).click();await expect(page.getByRole('button',{name:'Salvar composição',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Salvar composição',exact:true}).click();await expect(page.getByRole('button',{name:'Composição salva'})).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/gpzytro-mobile.png',fullPage:true});
});
test('project plan links open the correct room',async({page})=>{
 await setup(page);await page.goto('/project');await page.getByRole('button',{name:'Open Copa e convivência',exact:true}).click();await expect(page.locator('.astra-room-context')).toContainText('Copa e convivência');
});

test('project plan switches references and shows connected furniture cards',async({page})=>{
 await setup(page);await page.goto('/');
 await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 const dialog=page.locator('dialog.astra-dialog[open]');
 await expect(dialog.getByRole('tab',{name:'Planta baixa',exact:true})).toHaveAttribute('aria-selected','true');
 await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');
 const furniture=dialog.getByRole('button',{name:'Ver cadeira de trabalho · CAD-01.001',exact:true});
 await furniture.hover();
 await expect(dialog.getByRole('tooltip')).toContainText('Fabricante: A definir');
 await expect(dialog.locator('.plan-product-line')).toBeVisible();
 expect(await dialog.getByRole('tooltip').locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.screenshot({path:'test-results/project-plan-furniture.png'});
 for(const kind of ['chair','table']){
   await page.mouse.move(0,0);
   const item=planProducts.find(p=>p.id.startsWith(kind+'-')&&p.roomId)!;
   await dialog.getByLabel('Ambiente da planta').selectOption(item.roomId!);
   await dialog.locator('[data-element-id="'+item.id+'"]').focus();
   await expect(dialog.getByRole('tooltip')).toContainText('Acabamento');
   await expect(dialog.locator('.plan-product-line')).toHaveAttribute('marker-start',/url/);
 }
 await page.screenshot({path:'test-results/project-plan-surface.png'});
 await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');
 await furniture.focus();await page.keyboard.press('Escape');
 await expect(dialog.getByRole('tooltip')).toHaveCount(0);
 await expect(dialog).toBeVisible();
 await dialog.getByRole('tab',{name:'Planta de teto',exact:true}).click();
 await expect(dialog.getByAltText('Planta de teto original')).toHaveAttribute('src','/plans/ceiling-page-1.png');
 await page.keyboard.press('ArrowRight');
 await expect(dialog.getByRole('tab',{name:'Planta de piso',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(dialog.getByRole('tabpanel')).toContainText('paginação');
 await expect(dialog.getByRole('tooltip')).toHaveCount(0);
 await dialog.getByRole('tab',{name:'Planta baixa',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await furniture.click();
 await expect(dialog.getByRole('tooltip')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/project-plan-mobile.png'});
});
test('clean project uses original plans and does not restore discarded content',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('astra-image-conversations-v1',JSON.stringify([{id:'old',title:'Old image',turns:[{id:'t',prompt:'Old',image:{id:'00000000-0000-4000-8000-000000000001',url:'/api/renders/00000000-0000-4000-8000-000000000001'},referenceNames:[]}],updatedAt:''}])));
 await page.goto('/');
 await page.getByRole('button',{name:/Minhas imagens/}).click();
 await expect(page.locator('.astra-gallery')).toContainText('As imagens que você criar aparecerão aqui');
 expect(await page.evaluate(()=>localStorage.getItem('astra-image-conversations-v1'))).toBeNull();
 await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 const dialog=page.locator('dialog.astra-dialog[open]');
 await expect(dialog.locator('image.plan-image')).toHaveAttribute('href','/plans/floorplan-focus.webp');
 await expect(dialog.getByRole('button',{name:'Aumentar zoom'})).toHaveCount(0);


 await dialog.getByRole('tab',{name:'Planta de teto',exact:true}).click();
 await expect(dialog.getByAltText('Planta de teto original')).toBeVisible();
 await expect(dialog.getByRole('link',{name:'Baixar PNG'})).toHaveCount(0);
 await page.screenshot({path:'test-results/new-ceiling-plan.png'});
 await dialog.getByRole('tab',{name:'Planta baixa',exact:true}).click();
 await page.screenshot({path:'test-results/new-floor-plan.png'});
 await dialog.getByRole('button',{name:'03 Copa e convivência',exact:true}).click();
 await dialog.getByRole('button',{name:'Usar ambiente na criação'}).click();
 await expect(page.getByText('Nenhuma imagem gerada para este ambiente.')).toBeVisible();
 await expect(page.locator('.astra-moodboard-capsules')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Salvar composição',exact:true})).toBeDisabled();
});
test('models highlight matching instances and instance editor registers products locally',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 const dialog=page.locator('dialog.astra-dialog[open]');
 await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');
 await dialog.locator('.plan-model-inventory summary').click();
 await dialog.getByRole('button',{name:'Localizar CAD-01 · Cadeira de trabalho · 24 ocorrências',exact:true}).click();
 await expect(dialog.locator('[data-model-id="CAD-01"].is-model-match')).toHaveCount(24);
 await dialog.getByRole('button',{name:'Limpar destaque'}).click();
 await dialog.locator('.plan-model-inventory summary').click();
 await dialog.getByRole('link',{name:'Selecionar instâncias',exact:true}).click();
 await page.locator('[data-instance-id][data-model-id="CAD-01"]').first().click();
 await page.getByRole('button',{name:'Cadastrar produto',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Cadastro do móvel'});
 await expect(editor).toBeVisible();
 await editor.getByLabel('Foto do produto',{exact:true}).setInputFiles('public/plans/illustrative/FN-05.png');
 await editor.getByLabel('Nome do móvel',{exact:true}).fill('Cadeira Modelo Teste');
 await editor.getByLabel('Fabricante',{exact:true}).fill('Fábrica Teste');
 await editor.getByLabel('Acabamento',{exact:true}).fill('Tecido bege, estrutura preta');
 await editor.getByLabel('Link do produto',{exact:false}).fill('https://example.com/cadeira');
 await editor.getByRole('button',{name:'Salvar produto',exact:true}).click();
 await expect(editor.getByRole('status')).toContainText('Cadastro salvo para o modelo');
 await page.screenshot({path:'test-results/plan-product-editor.png'});
 await editor.getByRole('button',{name:'Fechar cadastro'}).click();
 await page.goto('/');await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');
 await dialog.locator('[data-model-id="CAD-01"]').nth(1).hover();
 await expect(dialog.getByRole('tooltip')).toContainText('Cadeira Modelo Teste');
 await expect(dialog.getByRole('tooltip').locator('img')).toHaveAttribute('src',/\/api\/plan-products\/images\//);
 await expect(dialog.getByRole('link',{name:'Ver produto'})).toHaveAttribute('href','https://example.com/cadeira');
 await page.reload();
 await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');
 await dialog.locator('[data-model-id="CAD-01"]').first().hover();
 await expect(dialog.getByRole('tooltip')).toContainText('Fábrica Teste');
 await page.setViewportSize({width:390,height:844});
 await dialog.getByRole('link',{name:'Selecionar instâncias',exact:true}).click();
 await page.locator('[data-instance-id][data-model-id="CAD-01"]').first().click();
 await page.getByRole('button',{name:'Cadastrar produto',exact:true}).click();
 await expect(editor).toBeVisible();
 await editor.getByLabel('Aplicar cadastro a').selectOption('instance');
 await editor.getByLabel('Nome do móvel',{exact:true}).fill('Cadeira individual');
 await editor.getByRole('button',{name:'Salvar produto',exact:true}).click();
 await expect(editor.getByRole('status')).toContainText('somente para esta instância');
 expect(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'test-results/plan-product-editor-mobile.png'});
 await editor.getByRole('button',{name:'Fechar cadastro'}).click();
 await page.goto('/');await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');
 await dialog.locator('[data-model-id="CAD-01"]').first().hover();
 await expect(dialog.getByRole('tooltip')).toContainText('Cadeira individual');
 await page.mouse.move(0,0);
 await dialog.locator('[data-model-id="CAD-01"]').nth(1).hover();
 await expect(dialog.getByRole('tooltip')).toContainText('Cadeira Modelo Teste');
});
test('room must be selected before furniture hover and changing rooms clears targets',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 const dialog=page.locator('dialog.astra-dialog[open]');
 await expect(dialog.locator('[data-element-id]')).toHaveCount(0);
 await dialog.getByRole('button',{name:'Open Estações de trabalho',exact:true}).click();
 await expect(dialog).toBeVisible();
 await expect(dialog.getByLabel('Ambiente da planta')).toHaveValue('PRISMAL_WORK_WEST');
 await dialog.locator('[data-model-id="CAD-01"]').first().hover();await expect(dialog.getByRole('tooltip')).toBeVisible();
 await expect(dialog.locator('[data-model-id="CAD-03"]')).toHaveCount(0);
 await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_BOARDROOM');
 await expect(dialog.getByRole('tooltip')).toHaveCount(0);
 await expect(dialog.locator('[data-model-id="CAD-01"]')).toHaveCount(0);
 await dialog.locator('[data-model-id="CAD-03"]').first().hover();await expect(dialog.getByRole('tooltip')).toBeVisible();
 await dialog.getByRole('button',{name:'Trocar ambiente',exact:true}).click();await expect(dialog.locator('[data-element-id]')).toHaveCount(0);
 await dialog.getByRole('link',{name:'Selecionar instâncias',exact:true}).click();
 await expect(page).toHaveURL(/\/instances$/);
});
