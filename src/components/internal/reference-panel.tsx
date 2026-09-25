import { FileText, Map } from "lucide-react";
import type { WorkspaceView } from "@/services/application";
import { EmptyState } from "./empty-state";
export function documentUrl(value:string|null) {
  if(!value)return null;
  if(value.startsWith("/")&&!value.startsWith("//"))return value;
  try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)?value:null}catch{return null}
}
export function ReferencePanel({view}:{view:WorkspaceView}){
  const doc=view.documents.find(d=>d.id===view.layout?.floorplanDocumentId),url=documentUrl(doc?.storageReference??null);
  return <section className="panel"><div className="panel-heading"><h2>Floorplan & references</h2><Map size={18}/></div>
    {doc?<div className="reference-ready"><FileText size={32}/><h3>{doc.fileName}</h3><code>{doc.id}</code>{url?<a className="outline-button" href={url} target="_blank" rel="noreferrer">Open floorplan</a>:<p>File storage reference is not connected yet.</p>}</div>:<EmptyState title="No floorplan available" description="The layout plan and room reference documents will appear here when supplied."/>}
    {!view.layouts.length&&<p className="help">No layouts available yet.</p>}{view.layout&&!view.rooms.length&&<p className="help">No rooms configured for this layout.</p>}
  </section>
}
