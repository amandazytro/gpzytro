"use client";
import { useState } from "react";
import type { AssetSelection } from "@/domain/models";
import { blankConfiguration, type ApplicationServices, type WorkspaceView } from "@/services/application";
import { EmptyState } from "./empty-state";
export function ConfigurationPanel({view,services,onSaved}:{view:WorkspaceView;services:ApplicationServices;onSaved:()=>void}){
  const [name,setName]=useState(view.configuration?.name??"Room configuration"),[notes,setNotes]=useState(view.configuration?.notes??"");
  const [selections,setSelections]=useState<AssetSelection[]>(view.configuration?.selectedAssets??[]);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function save(){
    if(!view.room||!view.layout)return;setBusy(true);setMessage("");
    try{await services.repository.saveRoomConfiguration({...view.configuration??blankConfiguration(view.room.id,view.layout.id),name,notes,selectedAssets:selections});setMessage("Configuration saved.");onSaved()}
    catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
  }
  return <section className="panel"><div className="panel-heading"><h2>Room configuration</h2><span>{view.configuration?"Revision "+view.configuration.revision:"DRAFT"}</span></div>
    {!view.room?<EmptyState compact title="Select a room to configure" description="Create a project structure or open the empty demo workspace."/>:<>
    <label className="form-field">Configuration name<input value={name} onChange={e=>setName(e.target.value)} maxLength={160}/></label>
    <label className="form-field">Room notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Record the requirements for this room." rows={3}/></label>
    <div className="selection-list">{selections.length?selections.map(item=><div key={item.assetId}><span>{view.assets.find(a=>a.id===item.assetId)?.referenceName??item.assetId}</span><label>Quantity<input aria-label={"Quantity for "+item.assetId} type="number" min="0.01" step="any" value={item.quantity} onChange={e=>setSelections(items=>items.map(a=>a.assetId===item.assetId?{...a,quantity:Number(e.target.value)}:a))}/></label><button className="text-button" onClick={()=>setSelections(items=>items.filter(a=>a.assetId!==item.assetId))}>Remove</button></div>):<p className="muted">No assets selected. You can save this configuration with an empty selection.</p>}</div>
    <button className="primary-button" disabled={busy||!name.trim()} onClick={save}>{busy?"Saving…":"Save configuration"}</button><div role="status" className="inline-message">{message}</div></>}
  </section>
}
