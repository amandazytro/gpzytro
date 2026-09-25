"use client";
import {useEffect,useState} from 'react';
import type {getMoodboardContext} from '../../services/moodboard-context';
export type MoodboardCatalogData=Awaited<ReturnType<typeof getMoodboardContext>>;
export function useMoodboardCatalog(){
 const [data,setData]=useState<MoodboardCatalogData|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true,request=0;
  async function load(){
   const current=++request;
   try{const r=await fetch('/api/moodboard-catalog?moodboard=1',{cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error);
    if(alive&&current===request){setData(result);setError('');}
   }catch(e){if(alive&&current===request)setError(e instanceof Error?e.message:'Não foi possível carregar o moodboard.');}
  }
  void load();window.addEventListener('focus',load);window.addEventListener('plan-instances-updated',load);window.addEventListener('plan-areas-updated',load);
  return()=>{alive=false;window.removeEventListener('focus',load);window.removeEventListener('plan-instances-updated',load);window.removeEventListener('plan-areas-updated',load);};
 },[]);
 return {data,error};
}
