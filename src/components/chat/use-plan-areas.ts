"use client";
import {useEffect,useState} from 'react';
import {validatePlanAreas,type PlanAreas} from '../../domain/plan-areas';
export function usePlanAreas(){
 const [state,setState]=useState<{areas:PlanAreas;revision:string}>({areas:{},revision:''}),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  async function load(){
   try{const r=await fetch('/api/plan-areas',{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error);
    if(alive){setState({areas:validatePlanAreas(data.areas),revision:data.revision});setLoaded(true);setError('');}
   }catch(e){if(alive)setError(e instanceof Error?e.message:'Falha ao carregar áreas.');}
  }
  const sync=(event:Event)=>{const data=(event as CustomEvent<{areas:PlanAreas;revision:string}>).detail;setState(data);setLoaded(true);setError('');};
  void load();window.addEventListener('focus',load);window.addEventListener('plan-areas-updated',sync);return()=>{alive=false;window.removeEventListener('focus',load);window.removeEventListener('plan-areas-updated',sync);};
 },[]);
 return {...state,loaded,error,setState:(next:{areas:PlanAreas;revision:string})=>{setState(next);window.dispatchEvent(new CustomEvent('plan-areas-updated',{detail:next}));}};
}
