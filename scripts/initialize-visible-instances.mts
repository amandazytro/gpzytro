import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {initialPlanInstances,validatePlanInstances} from '../src/domain/plan-instances';
const directory=path.join(process.cwd(),'.render-data','plan-products');
await mkdir(directory,{recursive:true});
try{
 await writeFile(path.join(directory,'instances.json'),JSON.stringify({instances:validatePlanInstances(initialPlanInstances),updatedAt:new Date().toISOString()},null,2),{flag:'wx'});
 console.log(initialPlanInstances.length+' identifiable instances initialized. Existing geometry file preserved.');
}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;console.log('Existing instance edits preserved.');}
