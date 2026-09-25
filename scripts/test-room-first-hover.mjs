import fs from 'node:fs';
const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/components/chat/project-plan.tsx',s=>s.replace("const roomPath=region.map", "const roomPath=region.length?region.map").replace(".join(' ')+' Z';", ".join(' ')+' Z':'';").replace('        {selectedRoom&&<div className="plan-room-focus">',`        <label className="plan-room-picker">Ambiente da planta<select aria-label="Ambiente da planta" value={selectedRoomId??''} onChange={e=>onSelectRoom(e.target.value||null)}><option value="">Selecione um ambiente</option>{props.rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        {selectedRoom&&<div className="plan-room-focus">`));
edit('tests/e2e/configurator.spec.ts',s=>{
 s="import {planProducts} from '../../src/data/plan-products';\n"+s;
 s=s.replace(" const furniture=dialog.getByRole('button',{name:'Ver cadeira", " await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');\n const furniture=dialog.getByRole('button',{name:'Ver cadeira");
 s=s.replace("   await dialog.locator('[data-element-id^=\"' + kind + '-\"]').first().locator('rect').first().hover();",`   const item=planProducts.find(p=>p.id.startsWith(kind+'-')&&p.roomId)!;
   await dialog.getByLabel('Ambiente da planta').selectOption(item.roomId!);
   await dialog.locator('[data-element-id="'+item.id+'"]').focus();`);
 s=s.replace(" await furniture.focus();await page.keyboard.press('Escape');"," await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');\n await furniture.focus();await page.keyboard.press('Escape');");
 s=s.replace(" await expect(page.getByText('Nenhuma imagem gerada para este ambiente.')).toBeVisible();", " await dialog.getByRole('button',{name:'Usar ambiente na criação'}).click();\n await expect(page.getByText('Nenhuma imagem gerada para este ambiente.')).toBeVisible();");
 s=s.replace(" await dialog.locator('.plan-model-inventory summary').click();\n await dialog.getByRole('button',{name:'Localizar CAD", " await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');\n await dialog.locator('.plan-model-inventory summary').click();\n await dialog.getByRole('button',{name:'Localizar CAD");
 s=s.replace(" await dialog.locator('[data-model-id=\"CAD-01\"]').first().hover();", " await dialog.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');\n await dialog.locator('[data-model-id=\"CAD-01\"]').first().hover();");
 s=s.replace(" await expect(dialog.getByRole('button',{name:'Open Estações de trabalho',exact:true})).toHaveCount(0);", " await expect(editor).toBeVisible();");
 s=s.replace(" const target=page.locator('dialog.astra-dialog [data-element-id=", " await page.getByLabel('Ambiente da planta').selectOption('PRISMAL_WORK_WEST');\n const target=page.locator('dialog.astra-dialog [data-element-id=");
 return s;
});
