"use client";
import {useEffect,useRef,useState} from 'react';
import type {PlanProduct} from '../../data/plan-products';
import {validatePlanInstances} from '../../domain/plan-instances';
export function usePlanInstances(editable=false){
 const [instances,setInstances]=useState<PlanProduct[]>([]),[loaded,setLoaded]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('Carregando instâncias…');
 const [saved,setSaved]=useState(''),revision=useRef(''),inFlight=useRef(false);
 const dirty=loaded&&JSON.stringify(instances)!==saved;
 useEffect(()=>{
  let alive=true;
  async function load(){
   try{
    const response=await fetch('/api/plan-instances',{cache:'no-store'});const data=await response.json();
    if(!response.ok)throw Error(data.error);
    const next=validatePlanInstances(data.instances);
    if(alive){setInstances(next);setSaved(JSON.stringify(next));revision.current=data.revision;setLoaded(true);setError('');setStatus('Instâncias carregadas.');}
   }catch(e){if(alive)setError(e instanceof Error?e.message:'Falha ao carregar instâncias.');}
  }
  void load();if(!editable)window.addEventListener('focus',load);
  return()=>{alive=false;window.removeEventListener('focus',load);};
 },[editable]);
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 async function save(){
  if(!loaded||!editable||inFlight.current)return false;
  inFlight.current=true;setSaving(true);setError('');
  try{
   const snapshot=instances;
   const response=await fetch('/api/plan-instances',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instances:snapshot,revision:revision.current})});
   const data=await response.json();if(!response.ok)throw Error(data.error);
   revision.current=data.revision;setSaved(JSON.stringify(snapshot));setStatus('Instâncias salvas no projeto.');window.dispatchEvent(new Event('plan-instances-updated'));return true;
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar. Tente novamente.');return false;}
  finally{inFlight.current=false;setSaving(false);}
 }
 return {instances,setInstances,loaded,saving,error,status,dirty,save};
}
