import {test,expect} from '@playwright/test';
test('locked areas stay red and unavailable; gear opens instances',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Planta do projeto',exact:true}).click();
 const dialog=page.locator('dialog.astra-dialog[open]');
 await expect(dialog.locator('.plan-hit.is-locked')).toHaveCount(4);
 await expect(dialog.locator('.plan-label.is-locked .plan-room-lock')).toHaveCount(4);
 await expect(dialog.locator('.plan-label.is-locked text')).toHaveCount(0);
 for(const hit of await dialog.locator('.plan-hit.is-locked').all()){
  await expect(hit).toHaveAttribute('aria-disabled','true');
  await hit.dispatchEvent('click');
  await expect(dialog.getByLabel('Ambiente da planta')).toHaveValue('');
  await hit.dispatchEvent('keydown',{key:'Enter'});
  await expect(dialog.getByLabel('Ambiente da planta')).toHaveValue('');
 }
 await expect(dialog.locator('.plan-wash.is-locked').first()).toHaveCSS('fill','rgb(220, 38, 38)');
 await expect(dialog.locator('.astra-plan-room-list button:disabled')).toHaveCount(4);
 await expect(dialog.locator('.astra-dialog-links')).toHaveCount(0);
 await page.screenshot({path:'test-results/locked-areas.png'});
 await dialog.getByRole('link',{name:'Selecionar instâncias',exact:true}).click();
 await expect(page).toHaveURL(/\/instances$/);
 await expect(page.getByRole('button',{name:'Salvar instâncias',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Ver catálogo de referências'}).click();
 await expect(page.locator('[data-product-id]')).toHaveCount(47);
 await page.getByLabel('Buscar referência').fill('PDF-BENCH-4');
 await expect(page.locator('[data-product-id]')).toHaveCount(1);
 await page.getByLabel('Buscar referência').fill('');
 await page.screenshot({path:'test-results/pdf-catalog.png',fullPage:true});
 const response=await page.request.get('/api/moodboard-catalog?roomId=PRISMAL_LOUNGE');
 expect(response.ok()).toBeTruthy();
 const data=await response.json();expect(data.externalDelivery).toBe('authorized');
 expect(data.sources.ceiling.image).toBeTruthy();expect(data.sources.dimensions.image).toBeTruthy();
 expect(data.assignments.every((a:{roomId:string})=>a.roomId==='PRISMAL_LOUNGE')).toBeTruthy();
});
