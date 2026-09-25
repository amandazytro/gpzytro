"use client";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, LoaderCircle } from "lucide-react";
import type { ApplicationServices, WorkspaceView } from "@/services/application";
import { blankConfiguration } from "@/services/application";
import type { GeneratedRender } from "@/services/render-provider";
export function RenderPanel({view,services,onChanged}:{view:WorkspaceView;services:ApplicationServices;onChanged:()=>void}){
  const [results,setResults]=useState<GeneratedRender[]>(()=>view.renders.map(r=>({...r,message:r.isPlaceholder?"Workflow placeholder only. No AI was called and no architectural image was generated.":"Render ready."})));
  const [activeId,setActiveId]=useState<string|null>(view.renders.at(-1)?.id??null),[instructions,setInstructions]=useState(""),[count,setCount]=useState(2),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const abort=useRef<AbortController|null>(null);
  useEffect(()=>()=>abort.current?.abort(),[]);
  const active=results.find(r=>r.id===activeId)??results.at(-1);
  async function run(operation:"base"|"edit"|"variation"){
    setBusy(true);setError("");const controller=new AbortController();abort.current=controller;
    try{
      if(view.room&&view.layout&&!(await services.repository.getRoomConfiguration(view.room.id)))
        await services.repository.saveRoomConfiguration(blankConfiguration(view.room.id,view.layout.id));
      const generated=await services.generate(operation,view.room?.id??null,instructions,operation==="base"?undefined:active,count,controller.signal);
      if(controller.signal.aborted)return;
      setResults(items=>[...items,...generated]);setActiveId(generated.at(-1)?.id??null);onChanged();
    }catch(reason){if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Generation failed. Try again.")}
    finally{if(!controller.signal.aborted)setBusy(false)}
  }
  return <section className="panel render-panel"><div className="panel-heading"><h2>Room render</h2><span className="mock-label">OPENAI / ASTRA</span></div>
    <div className={"render-stage "+(active?"has-result":"")} aria-busy={busy}>
      {busy?<><LoaderCircle className="spin" size={28}/><h3>Generating room render...</h3><p>GPZytro is composing the image. This can take a few minutes.</p></>:active?<>{active.imageUrl&&!active.isPlaceholder?<img src={active.imageUrl} alt="Room render"/>:<div className="mock-frame"><span>GPZytro / WORKFLOW PREVIEW</span><ImageIcon size={42}/><strong>Mock render placeholder</strong><small>NO ARCHITECTURAL IMAGE GENERATED</small></div>}<p>{active.message}</p><span className="result-type">{active.operation.toUpperCase()} · {active.provider.toUpperCase()}</span></>:<><ImageIcon size={32}/><h3>No render available</h3><p>{view.room?"Generate a render using this room and its selected assets.":"Generate a room concept."}</p></>}
    </div>
    {!view.room&&<p className="help">Unassigned workflow preview · not saved to the project database.</p>}
    <button className="primary-button" disabled={busy} onClick={()=>run("base")}>{busy?"Working…":"Generate room render"}</button>
    {active&&<div className="render-actions"><label className="form-field">Edit instructions<textarea rows={2} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Describe the change to render."/></label><button className="outline-button" disabled={busy||!instructions.trim()} onClick={()=>run("edit")}>Edit room render</button><div className="variation-control"><label>Variations<select aria-label="Variation count" value={count} onChange={e=>setCount(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><button className="outline-button" disabled={busy} onClick={()=>run("variation")}>Generate variations</button></div></div>}
    {error&&<p role="alert" className="error-text">{error}</p>}
    {results.length>0&&<div className="render-history" aria-label="Render history">{results.map((result,index)=><button key={result.id} className={active?.id===result.id?"active":""} onClick={()=>setActiveId(result.id)}>{index+1}. {result.operation}{result.isPlaceholder?" · MOCK":""}</button>)}</div>}
    {active&&<details className="render-provenance"><summary>Response details</summary><code>{active.id}</code><p>{view.room?"Saved against this room and its configuration snapshot.":"Session preview only."}</p></details>}
  </section>
}
