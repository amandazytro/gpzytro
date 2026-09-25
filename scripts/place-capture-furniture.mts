import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {readPlanInstances,savePlanInstances} from '../src/services/plan-instances';
import {readPlanProductCatalog} from '../src/services/plan-product-catalog';
import {registeredProductFor} from '../src/domain/plan-product-catalog';
import {placeCaptureFurniture} from '../src/domain/capture-placement';
const before=await readPlanInstances(),manual=await readPlanProductCatalog();
const protectedIds=new Set(before.instances.filter(i=>registeredProductFor(manual,i)).map(i=>i.id));
const result=placeCaptureFurniture(before.instances,protectedIds);
if(!result.changes.length){console.log('Nenhuma substituição pendente; edições atuais preservadas.');process.exit(0);}
const dir=path.join('referencias','placement-backups');await mkdir(dir,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
await writeFile(path.join(dir,stamp+'.json'),JSON.stringify(before,null,2));
const saved=await savePlanInstances({instances:result.instances,revision:before.revision});
await writeFile('referencias/POSICIONAMENTO-CAPTURAS.json',JSON.stringify({beforeRevision:before.revision,afterRevision:saved.revision,beforeCount:before.instances.length,afterCount:saved.instances.length,protectedIds:[...protectedIds],changes:result.changes,merges:result.merges},null,2));
console.log(JSON.stringify({before:before.instances.length,after:saved.instances.length,changed:result.changes.length,merges:result.merges}));
