"use client";
import { useState } from "react";
import { Building2, FileText, Layers3, Plus, ArrowRight, ChevronRight } from "lucide-react";
import type { HierarchyKind } from "@/domain/models";
import type { Selection } from "@/services/application";
import { useWorkspace } from "./use-workspace";
import { Hierarchy } from "./hierarchy";
import { EmptyState } from "./empty-state";
import { Modal } from "./modal";
import { ReferencePanel, documentUrl } from "./reference-panel";
import { RenderPanel } from "./render-panel";
import { ConfigurationPanel } from "./configuration-panel";
import { CatalogPanels } from "./catalog-panels";
export function Configurator(){
  const workspace=useWorkspace();
  const {view,services,mode,loading,error}=workspace;
  const [tab,setTab]=useState("Room workspace"),[creating,setCreating]=useState<HierarchyKind|null>(null),[name,setName]=useState(""),[saving,setSaving]=useState(false),[formError,setFormError]=useState("");
  function openCreate(kind:HierarchyKind){setCreating(kind);setName("");setFormError("")}
  async function create(event:React.FormEvent){
    event.preventDefault();if(!creating||!services||!view)return;
    const parent={project:null,building:view.project?.id??null,unit:view.building?.id??null,layout:view.unit?.id??null,room:view.layout?.id??null}[creating];
    setSaving(true);setFormError("");
    try{const id=await services.repository.createHierarchyItem(creating,parent,name);workspace.select((creating+"Id") as keyof Selection,id);setCreating(null);setTab("Room workspace")}
    catch(reason){setFormError((reason as Error).message)}finally{setSaving(false)}
  }
  return <div className="app-shell"><aside className="sidebar"><a href="/" className="brand"><span>GPZytro<span className="brand-sub">CONFIGURATOR</span></span></a><div className="workspace-label">DESIGN WORKSPACE</div><nav>{["Projects","Room workspace","Reference documents"].map((name,index)=><button key={name} className={"nav-item "+(tab===name?"active":"")} onClick={()=>setTab(name)}>{index===0?<Building2 size={17}/>:index===1?<Layers3 size={17}/>:<FileText size={17}/>} {name}</button>)}</nav>
    {view&&<Hierarchy view={view} onSelect={workspace.select} onCreate={openCreate}/>}
    <div className="sidebar-footer"><div>{mode==="demo"?"DEMO WORKSPACE":"External data workspace"}<small>{mode==="demo"?"No products or reference catalog":"Waiting for your reference table"}</small><button className="text-button mode-switch" onClick={()=>workspace.switchMode(mode==="demo"?"real":"demo")}>{mode==="demo"?"Return to real projects":"Open demo workspace"} <ArrowRight size={13}/></button></div></div>
  </aside><div className="main-shell"><header className="topbar"><div>{view?.project?.name??"No project selected"}{view?.building&&<><ChevronRight size={12}/>{view.building.name}</>}{view?.layout&&<><ChevronRight size={12}/>{view.layout.name}</>}</div><span className="demo-badge">{mode==="demo"?"DEMO · NO ASSETS":"EXTERNAL DATA"}</span></header><main>
    <div className="page-heading"><div><div className="eyebrow">THE FOUNDATION FOR YOUR NEXT SPACE</div><h1>{tab==="Projects"?"Your projects":tab==="Reference documents"?"Project references":view?.room?.name??"Your project workspace"}<span>.</span></h1><p>Configure rooms now. Connect your reference data when it is ready.</p></div><button className="outline-button" disabled={!services||loading} onClick={()=>openCreate("project")}><Plus size={15}/> New project</button></div>
    {workspace.notice&&<p role="status" className="notice">{workspace.notice}</p>}
    {mode==="demo"&&<div className="demo-notice">DEMO PROJECT · Isolated navigation test. No products, moodboards or source documents are prefilled.</div>}
    {error?<section className="panel"><p role="alert">{error}</p><button className="outline-button" onClick={workspace.refresh}>Retry loading</button></section>:!view||!services?<div className="loading-state" role="status">Loading workspace…</div>:<>
    {tab==="Projects"&&<>{!view.projects.length?<EmptyState title="No projects available" description="Start with an empty project, or explore the functional demo without adding any real data." action={<button className="primary-button" onClick={()=>openCreate("project")}>Create project</button>}/>:<div className="project-grid">{view.projects.map(project=><article className="panel project-card" key={project.id}><Building2 size={25}/><h2>{project.name}</h2><code>{project.id}</code><p>{project.isDemo?"DEMO · No real catalog":"Project structure"}</p><button className="outline-button" onClick={()=>{workspace.select("projectId",project.id);setTab("Room workspace")}}>Open project <ArrowRight size={14}/></button></article>)}</div>}</>}
    {tab==="Room workspace"&&<>
      {!view.project&&<div className="setup-banner"><div><strong>No projects available</strong><p>Create the project structure or use a separate demo to test room configuration.</p></div><button className="outline-button" onClick={()=>workspace.switchMode("demo")}>Open empty demo</button></div>}
      {view.project&&!view.building&&<EmptyState compact title="No buildings available yet." action={<button className="outline-button" onClick={()=>openCreate("building")}>Create building</button>}/>}
      {view.building&&!view.unit&&<EmptyState compact title="No units available yet." action={<button className="outline-button" onClick={()=>openCreate("unit")}>Create unit</button>}/>}
      {view.unit&&!view.layout&&<EmptyState compact title="No layouts available yet." action={<button className="outline-button" onClick={()=>openCreate("layout")}>Create layout</button>}/>}
      {view.layout&&!view.room&&<EmptyState compact title="No rooms configured for this layout." action={<button className="outline-button" onClick={()=>openCreate("room")}>Create room</button>}/>}
      <div className="workflow-grid"><ReferencePanel view={view}/><RenderPanel key={mode+":"+(view.room?.id??"preview")} view={view} services={services} onChanged={workspace.refresh}/></div>
      <ConfigurationPanel key={(view.room?.id??"none")+":"+(view.configuration?.revision??0)} view={view} services={services} onSaved={workspace.refresh}/>
      <details className="catalog-disclosure"><summary>Reference data <span>{view.assets.length} assets · awaiting external table</span></summary><CatalogPanels key={view.room?.id??"empty"} view={view} services={services} onChanged={workspace.refresh}/></details>
    </>}
    {tab==="Reference documents"&&<><section className="panel"><div className="panel-heading"><h2>Source documents</h2><span>{view.documents.length} files</span></div>{!view.documents.length?<EmptyState title="No reference documents available" description="Floorplans and source PDFs will appear here when linked to the project."/>:<div className="document-list">{view.documents.map(doc=><article key={doc.id}><FileText size={20}/><div><h3>{doc.fileName}</h3><code>{doc.id}</code><p>{doc.status} · {doc.description}</p>{documentUrl(doc.storageReference)?<a href={documentUrl(doc.storageReference)!} target="_blank" rel="noreferrer">Open document</a>:<span>Storage reference pending</span>}</div></article>)}</div>}</section><section className="panel import-readiness"><h2>External table structure</h2><p>The catalog will come from your external table. Import is not connected yet. These header-only CSV files document the expected Excel columns.</p><div className="template-links"><a href="/templates/asset-catalog.csv" download>Asset catalog headers</a><a href="/templates/moodboards.csv" download>Moodboard headers</a><a href="/templates/reference-pdfs.csv" download>Reference PDF headers</a></div></section></>}
    </>}
    <footer className="main-footer"><span>ASTRA / Ready for your project data.</span><span>{mode==="demo"?"Demo data stays separate":"Real catalog starts empty"}</span></footer>
  </main></div>
  {creating&&<Modal onClose={()=>{if(!saving)setCreating(null)}}><form className="asset-dialog create-dialog" onSubmit={create}><button type="button" className="close-dialog" disabled={saving} aria-label="Close form" onClick={()=>setCreating(null)}>×</button><span className="eyebrow">PROJECT STRUCTURE</span><h2>Create {creating}</h2><label className="form-field">{creating[0].toUpperCase()+creating.slice(1)} name<input autoFocus required value={name} onChange={e=>setName(e.target.value)} maxLength={160}/></label><p className="help">Creates an empty record. No products or reference data will be added.</p>{formError&&<p role="alert">{formError}</p>}<button className="primary-button" disabled={saving||!name.trim()}>{saving?"Creating…":"Create "+creating}</button></form></Modal>}
  </div>;
}
