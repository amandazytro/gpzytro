import path from 'node:path';
import {readPlanInstances,savePlanInstances} from '../src/services/plan-instances';
import {initialPlanInstances} from '../src/domain/plan-instances';
process.env.ASTRA_DATA_DIR=path.join(process.cwd(),'test-results','server-data');
const state=await readPlanInstances();
if(state.instances.length===3&&state.instances.every(p=>p.id.startsWith('test-'))){await savePlanInstances({instances:initialPlanInstances,revision:state.revision});console.log('Restored isolated browser test baseline.');}
