import {projectPlans} from './project-plans';
import { emptyDatabase } from './empty';
import { addPrismalRooms } from './prismal-rooms';

import type { Database } from '../domain/models';

/** Supplied plan with provisional room mapping and local interior previews. */
export function prismalDatabase(): Database {
  const data = emptyDatabase();
  data.projects.push({ id: 'PRISMAL_PROJECT', name: 'Prismal V2', isDemo: false });
  data.buildings.push({ id: 'PRISMAL_BUILDING', projectId: 'PRISMAL_PROJECT', name: 'Prismal V2', exteriorDocumentId: null });
  data.units.push({ id: 'PRISMAL_UNIT', buildingId: 'PRISMAL_BUILDING', floorId: null, name: 'Layout Base - testes Prismal V2' });
  data.layouts.push({ id: 'PRISMAL_LAYOUT', unitId: 'PRISMAL_UNIT', name: 'Planta base', floorplanDocumentId: 'PRISMAL_FLOORPLAN' });
  data.referenceDocuments.push({
    id: 'PRISMAL_FLOORPLAN', buildingId: 'PRISMAL_BUILDING', layoutId: 'PRISMAL_LAYOUT', roomId: null, moodboardId: null,
    name: 'Planta baixa', fileName: 'PLANTA BAIXA.svg', fileType: 'image/svg+xml',
    storageReference: projectPlans.floor.original, previewImageUrl: projectPlans.floor.display, previewWidth: 882, previewHeight: 580,
    kind: 'floorplan', description: 'SVG original da planta baixa fornecido pelo usuário. Mapeamento visual, sem dimensões inferidas.', status: 'ready',
  });
  data.referenceDocuments.push({...data.referenceDocuments[0],id:'PRISMAL_CEILING',name:'Planta de teto',fileName:'ceiling-source.pdf',fileType:'application/pdf',storageReference:projectPlans.ceiling.original,previewImageUrl:projectPlans.ceiling.display,kind:'pdf',description:'Alturas de teto — desenho 2015-171_272, revisão B.',previewWidth:projectPlans.ceiling.width,previewHeight:projectPlans.ceiling.height});
  data.referenceDocuments.push({...data.referenceDocuments[0],id:'PRISMAL_DIMENSIONS',name:'Medidas da planta',fileName:'MEDIDAS.png',fileType:'image/png',storageReference:'/plans/dimensions-original.png',previewImageUrl:'/plans/dimensions-original.png',previewWidth:1488,previewHeight:1057,kind:'other',description:'Cotas e áreas fornecidas pelo usuário; referência complementar para geração.'});
  addPrismalRooms(data);

  return data;
}

/** Add the supplied base without discarding existing projects, selections or renders. */
export function withPrismalBase(existing: Database): Database {
  const base = prismalDatabase();
  const merged = structuredClone(existing);
  for (const table of ['projects','buildings','units','layouts','rooms','moodboards','referenceDocuments','roomConfigurations','roomRenders'] as const) {
    const current = merged[table] as {id:string}[];
    const fresh = (base[table] as {id:string}[]).filter(row => !current.some(saved => saved.id === row.id));
    current.unshift(...fresh);
  }
  for(const document of base.referenceDocuments){const index=merged.referenceDocuments.findIndex(d=>d.id===document.id);if(index>=0)merged.referenceDocuments[index]=document;}
  // Keep the previous full-floor record only when user data references it.
  const legacy = 'PRISMAL_FULL_PLAN';
  if (!merged.roomRenders.some(r => r.roomId === legacy) && !merged.roomConfigurations.some(c => c.roomId === legacy)) merged.rooms = merged.rooms.filter(r => r.id !== legacy);
  // Former elevator selections are now part of entrance and circulation.
  const retired=new Set(['PRISMAL_LIFT1','PRISMAL_LIFT2']);
  merged.rooms=merged.rooms.filter(r=>!retired.has(r.id)).map(r=>r.id==='PRISMAL_RECEPTION'?{...r,planRegion:base.rooms.find(b=>b.id===r.id)!.planRegion}:r);
  merged.roomConfigurations=merged.roomConfigurations.filter(c=>!retired.has(c.roomId)||c.selectedAssets.length>0);
  for(const rows of Object.values(merged)){
    if(!Array.isArray(rows))continue;
    for(const row of rows){
      if(row&&typeof row==='object'&&'roomId' in row&&typeof row.roomId==='string'&&retired.has(row.roomId))row.roomId='PRISMAL_RECEPTION';
    }
  }
  merged.projects.sort((a,b) => Number(b.id === 'PRISMAL_PROJECT') - Number(a.id === 'PRISMAL_PROJECT'));
  return merged;
}
