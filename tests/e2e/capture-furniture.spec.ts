import {test,expect} from '@playwright/test';
test('capture chairs and fictional sofa appear in the editor and local catalog',async({page,request})=>{
 page.setDefaultTimeout(5000);
 const original=await (await request.get('/api/plan-instances')).json();
 const sample=original.instances[0];
 const instances=[
 {...sample,id:'test-capture-chair',instanceCode:'TEST-CHAIR',modelId:'POL-CAP-01',roomId:'PRISMAL_LOUNGE',x:517,y:502,width:26,height:27,parts:undefined},
 {...sample,id:'test-capture-table',instanceCode:'TEST-TABLE',modelId:'MES-CAP-01',roomId:'PRISMAL_LOUNGE',x:557,y:495,width:31,height:30,parts:undefined},
 {...sample,id:'test-original-sofa',instanceCode:'TEST-SOFA',modelId:'SOF-FIC-01',roomId:'PRISMAL_LOUNGE',x:506,y:496,width:100,height:65,parts:[{x:506,y:538,width:99,height:22},{x:578,y:496,width:28,height:65}]},
 ];
 const saved=await request.post('/api/plan-instances',{data:{instances,revision:original.revision}});
 expect(saved.ok()).toBeTruthy();
 try{
  await page.goto('/instances');
  await page.locator('[data-instance-id="test-capture-chair"]').first().click();
  await expect(page.locator('.instance-pdf-reference')).toContainText('REFERÊNCIA DA CAPTURA');
  await expect(page.locator('.instance-pdf-reference img')).toHaveAttribute('src','/catalog/captures-2026-09-24/150052.png');
  await page.locator('[data-instance-id="test-original-sofa"] rect').first().click();
  await expect(page.locator('.instance-pdf-reference')).toContainText('CRIAÇÃO FICTÍCIA');
  await expect(page.locator('.instance-pdf-reference img')).toHaveAttribute('src','/catalog/original-designs/elo.png');
  await page.goto('/catalog');
  await page.getByRole('combobox',{name:'Origem',exact:true}).selectOption('capture');
  await expect(page.locator('[data-product-id]')).toHaveCount(5);
  await page.getByRole('combobox',{name:'Origem',exact:true}).selectOption('original');
  await expect(page.locator('[data-product-id]')).toHaveCount(4);
  const sofa=page.locator('[data-product-id="FIC-ELO"]');
  await expect(sofa).toContainText('1 instâncias vinculadas');
  await expect(sofa.locator('img')).toBeVisible();
  expect(await sofa.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBeTruthy();
  await page.screenshot({path:'test-results/original-furniture.png',fullPage:true});
  const context=await (await request.get('/api/moodboard-catalog')).json();
  const assignment=context.assignments.find((a:{instanceId:string})=>a.instanceId==='test-original-sofa');
  expect(assignment.productId).toBe('FIC-ELO');expect(assignment.parts).toHaveLength(2);
 }finally{
  const current=await (await request.get('/api/plan-instances')).json();
  const restored=await request.post('/api/plan-instances',{data:{instances:original.instances,revision:current.revision}});
  expect(restored.ok()).toBeTruthy();
 }
});
