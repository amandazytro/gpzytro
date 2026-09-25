"use client";
import { useCallback, useEffect, useState } from "react";
import { createBrowserServices, type WorkspaceMode } from "@/services/browser";
import { emptySelection, loadWorkspace, type ApplicationServices, type Selection, type WorkspaceView } from "@/services/application";
export function useWorkspace() {
  const [mode,setMode]=useState<WorkspaceMode>("real");
  const [services,setServices]=useState<ApplicationServices|null>(null);
  const [view,setView]=useState<WorkspaceView|null>(null);
  const [selection,setSelection]=useState<Selection>(emptySelection);
  const [revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const switchMode=useCallback((next:WorkspaceMode)=>{
    const created=createBrowserServices(next);
    setMode("real");setServices(created.services);setNotice(created.notice);
    setSelection(emptySelection());setView(null);setError("");setLoading(true);
    try{sessionStorage.setItem("astra-workspace-mode",next)}catch{}
  },[]);
  useEffect(()=>{let initial:WorkspaceMode="real";try{if(sessionStorage.getItem("astra-workspace-mode")==="demo")initial="demo"}catch{}switchMode(initial)},[switchMode]);
  useEffect(()=>{
    if(!services)return;
    let active=true;setLoading(true);setError("");
    loadWorkspace(services.repository,selection).then(next=>{if(active)setView(next)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Unable to load workspace.")}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[services,selection,revision]);
  function select(key:keyof Selection,id:string|null){
    const keys:(keyof Selection)[]=["projectId","buildingId","floorId","unitId","layoutId","roomId"];
    const next:Selection={projectId:view?.project?.id??null,buildingId:view?.building?.id??null,floorId:view?.floor?.id??null,unitId:view?.unit?.id??null,layoutId:view?.layout?.id??null,roomId:view?.room?.id??null};
    const index=keys.indexOf(key);for(let i=index;i<keys.length;i++)next[keys[i]]=null;next[key]=id;
    setView(null);setSelection(next);
  }
  return {mode,services,view,loading,error,notice,switchMode,select,refresh:()=>setRevision(r=>r+1)};
}
