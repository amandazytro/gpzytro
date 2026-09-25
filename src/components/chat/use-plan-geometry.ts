"use client";
import {useEffect,useRef,useState} from 'react';
import {validatePlanGeometry,type PlanGeometry} from '../../domain/plan-geometry';
export const localGeometryKey='prismal-instance-rectangles-v1';
const syncedKey='prismal-synced-instance-rectangles-v1';
async function send(rectangles:PlanGeometry,remove:string[]){const r=await fetch('/api/plan-geometry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rectangles,remove})});if(!r.ok)throw Error('Não foi possível salvar as demarcações no projeto.');return r.json();}
export function usePlanGeometry(editable=false){
 const [rectangles,setRectangles]=useState<PlanGeometry>({}),[loaded,setLoaded]=useState(false),[status,setStatus]=useState('Carregando demarcações…');
 const previous=useRef<PlanGeometry>({}),queue=useRef<Promise<unknown>>(Promise.resolve());
 useEffect(()=>{let alive=true;async function load(){try{
  const r=await fetch('/api/plan-geometry',{cache:'no-store'});if(!r.ok)throw Error();let saved=await r.json();
  if(editable){const raw=localStorage.getItem(localGeometryKey);const local=raw?validatePlanGeometry(JSON.parse(raw)):{};const oldRaw=localStorage.getItem(syncedKey);const old=oldRaw?validatePlanGeometry(JSON.parse(oldRaw)):{};const patch=Object.fromEntries(Object.entries(local).filter(([id,b])=>JSON.stringify(b)!==JSON.stringify(old[id])));const remove=raw?Object.keys(old).filter(id=>!local[id]):[];
   if(Object.keys(patch).length||remove.length)saved=await send(patch,remove);
   localStorage.setItem(localGeometryKey,JSON.stringify(saved.rectangles));localStorage.setItem(syncedKey,JSON.stringify(saved.rectangles));
  }
  if(alive){previous.current=saved.rectangles;setRectangles(saved.rectangles);setLoaded(true);setStatus('Demarcações salvas no projeto.');}
 }catch{if(alive)setStatus('Falha ao carregar ou salvar demarcações. Os ajustes locais foram preservados; recarregue para tentar novamente.');}}
 void load();if(!editable)window.addEventListener('focus',load);return()=>{alive=false;window.removeEventListener('focus',load);};},[editable]);
 useEffect(()=>{if(!editable||!loaded)return;const before=previous.current;if(JSON.stringify(before)===JSON.stringify(rectangles))return;
 const patch=Object.fromEntries(Object.entries(rectangles).filter(([id,b])=>JSON.stringify(b)!==JSON.stringify(before[id]))),remove=Object.keys(before).filter(id=>!rectangles[id]);
 previous.current=rectangles;setStatus('Salvando demarcações no projeto…');
 const task=queue.current.catch(()=>undefined).then(()=>send(patch,remove));queue.current=task;
 task.then(()=>{localStorage.setItem(syncedKey,JSON.stringify(rectangles));if(previous.current===rectangles)setStatus('Demarcações salvas no projeto.');}).catch(()=>setStatus('Falha ao salvar no projeto. Os ajustes estão neste navegador; recarregue para tentar novamente.'));
 },[rectangles,loaded,editable]);
 async function save(){
  if(!editable||!loaded)throw Error('Aguarde o carregamento das demarcações.');
  const snapshot=rectangles;
  setStatus('Salvando instâncias no projeto…');
  const task=queue.current.catch(()=>undefined).then(async()=>{
   const raw=localStorage.getItem(syncedKey);
   const synced=raw?validatePlanGeometry(JSON.parse(raw)):{};
   await send(snapshot,Object.keys(synced).filter(id=>!snapshot[id]));
   localStorage.setItem(syncedKey,JSON.stringify(snapshot));
  });
  queue.current=task;
  try{await task;if(previous.current===snapshot)setStatus('Instâncias salvas no projeto.');}
  catch{setStatus('Falha ao salvar as instâncias. Tente novamente.');throw Error('Não foi possível salvar as instâncias no projeto. Tente novamente.');}
 }
 return {rectangles,setRectangles,loaded,status,save};
}
