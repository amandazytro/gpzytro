"use client";
import { useState } from "react";
import type { Asset } from "@/domain/models";
import type { ApplicationServices, WorkspaceView } from "@/services/application";
import { AssetCard } from "./asset-card";
import { EmptyState } from "./empty-state";
import { Modal } from "./modal";
export function CatalogPanels({view,services,onChanged}:{view:WorkspaceView;services:ApplicationServices;onChanged:()=>void}){
  const [boardId,setBoardId]=useState<string|null>(null),[query,setQuery]=useState(""),[category,setCategory]=useState(""),[inspected,setInspected]=useState<Asset|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const board=view.moodboards.find(b=>b.id===boardId);
  const assets=view.assets.filter(a=>(!boardId||a.moodboardId===boardId)&&(!category||a.category===category)&&[a.referenceName,a.id,a.element].join(" ").toLowerCase().includes(query.toLowerCase()));
  async function toggle(asset:Asset){
    setBusy(true);setError("");
    try{const current=view.configuration?.selectedAssets??[];await services.saveSelection(view,current.some(s=>s.assetId===asset.id)?current.filter(s=>s.assetId!==asset.id):[...current,{assetId:asset.id,quantity:asset.quantity??1}]);onChanged()}
    catch(reason){setError((reason as Error).message)}finally{setBusy(false)}
  }
  async function flags(patch:Pick<Asset,"approved"|"canBeMixed">){
    if(!inspected)return;
    try{await services.repository.updateAssetFlags(inspected.id,patch);setInspected({...inspected,...patch});onChanged();setError("")}catch(reason){setError((reason as Error).message)}
  }
  return <div className="reference-catalog"><div className="panel-heading"><h2>Moodboards</h2><span>FROM EXTERNAL TABLE</span></div>
    {!view.moodboards.length?<EmptyState compact title="No moodboards available for this room." description="Moodboard references will be linked to this room and layout after data is supplied."/>:<div className="board-grid">{view.moodboards.map(b=><article className="board-card" key={b.id}><div className="board-body"><code>{b.id}</code><h3>{b.name}</h3><p>{b.description}</p><p>Option / set: {b.optionNumber??"Not specified"}</p><p>PDF: {view.documents.find(d=>d.id===b.referencePdfId)?.fileName??"Pending source document"}</p><button className="outline-button" onClick={()=>{setBoardId(b.id);setQuery("");setCategory("")}}>Open moodboard</button></div></article>)}</div>}
    <div className="panel-heading asset-section-heading"><h2>{board?board.name+" — Assets":"Individual assets"}</h2><span>{assets.length} assets</span></div>
    {view.assets.length>0&&<div className="catalog-filters"><label>Search assets<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(view.assets.map(a=>a.category))].map(c=><option key={c}>{c}</option>)}</select></label>{boardId&&<button className="text-button" onClick={()=>setBoardId(null)}>All moodboards</button>}</div>}
    {!assets.length?<EmptyState compact title={view.assets.length?"No assets match these filters.":"No assets available for this moodboard."} description="The external reference table will provide the selectable items. No products have been prefilled."/>:<fieldset disabled={busy} className="asset-grid">{assets.map(asset=><AssetCard key={asset.id} asset={asset} document={view.documents.find(d=>d.id===asset.sourcePdfId)} selected={!!view.configuration?.selectedAssets.some(s=>s.assetId===asset.id)} onToggle={()=>toggle(asset)} onInspect={()=>setInspected(asset)}/>)}</fieldset>}
    {error&&<p role="alert" className="error-text">{error}</p>}
    {inspected&&<Modal onClose={()=>setInspected(null)}><section className="asset-dialog"><button className="close-dialog" onClick={()=>setInspected(null)} aria-label="Close asset details">×</button><h2>{inspected.referenceName}</h2><dl>{Object.entries({ "Asset ID":inspected.id,"Moodboard ID":inspected.moodboardId,"Building ID":inspected.buildingId,"Unit ID":inspected.unitId,"Layout ID":inspected.layoutId,"Room ID":inspected.roomId,"Category":inspected.category,"Element":inspected.element,"Reference type":inspected.referenceType,"Finish / Material":inspected.finishMaterial,"Colour":inspected.colour,"Quantity":inspected.quantity,"Source PDF ID":inspected.sourcePdfId,"Source PDF":view.documents.find(d=>d.id===inspected.sourcePdfId)?.fileName??inspected.sourcePdfName,"Reference page":inspected.referencePage,"Notes":inspected.notes}).map(([label,value])=><div key={label} className="detail-row"><dt>{label}</dt><dd>{value??"Not provided"}</dd></div>)}</dl><label className="setting">Approved<input type="checkbox" checked={inspected.approved} onChange={e=>flags({approved:e.target.checked,canBeMixed:inspected.canBeMixed})}/></label><label className="setting">Can be mixed<input type="checkbox" checked={inspected.canBeMixed} onChange={e=>flags({approved:inspected.approved,canBeMixed:e.target.checked})}/></label>{error&&<p role="alert">{error}</p>}</section></Modal>}
  </div>
}
