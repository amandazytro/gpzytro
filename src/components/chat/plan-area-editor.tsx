"use client";
import {useRef,useState,type PointerEvent} from 'react';
import type {Room} from '../../domain/models';
import {validatePlanAreas,type PlanAreas,type AreaPoint} from '../../domain/plan-areas';
export function PlanAreaEditor({rooms,areas,revision,imageUrl,onSaved,onCancel,initialRoomId}:{rooms:Room[];areas:PlanAreas;revision:string;imageUrl:string;onSaved:(result:{areas:PlanAreas;revision:string})=>void;onCancel:()=>void;initialRoomId:string|null}){
 const [draft,setDraft]=useState<PlanAreas>(areas),[roomId,setRoomId]=useState(initialRoomId??rooms[0]?.id??''),[vertex,setVertex]=useState<number|null>(null),[zoom,setZoom]=useState(1.5),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [history,setHistory]=useState<PlanAreas[]>([]);
 const baseRevision=useRef(revision);
 const drag=useRef<{index:number;pointerId:number;before:PlanAreas}|null>(null);
 const pointsOf=(id:string)=>draft[id]??rooms.find(r=>r.id===id)?.planRegion?.points??[];
 const points=pointsOf(roomId);
 function commit(next:PlanAreas){setHistory(h=>[...h.slice(-29),draft]);setDraft(next);setError('');}
 function updatePoint(index:number,p:AreaPoint){setDraft(d=>({...d,[roomId]:pointsOf(roomId).map((v,i)=>i===index?p:v)}));setError('');}
 function location(e:PointerEvent<SVGSVGElement>){
  const matrix=e.currentTarget.getScreenCTM();if(!matrix)return null;
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
  return {x:Math.max(0,Math.min(1,p.x/882)),y:Math.max(0,Math.min(1,p.y/580))};
 }
 function cancelDrag(){
  if(drag.current){setDraft(drag.current.before);drag.current=null;}
 }
 async function save(){
  setSaving(true);setError('');
  try{
   const valid=validatePlanAreas(draft);
   const r=await fetch('/api/plan-areas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({areas:valid,revision:baseRevision.current})});
   const data=await r.json();if(!r.ok)throw Error(data.error);onSaved(data);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar as áreas.');}
  finally{setSaving(false);}
 }
 return <section className="plan-area-editor" aria-label="Editar áreas da planta">
  <div className="plan-area-toolbar"><label>Área em edição<select value={roomId} disabled={saving} onChange={e=>{setRoomId(e.target.value);setVertex(null);}}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <label>Ampliação<select value={zoom} onChange={e=>setZoom(Number(e.target.value))}><option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option></select></label>
   <button disabled={saving||vertex===null||points.length<=3} onClick={()=>{commit({...draft,[roomId]:points.filter((_,i)=>i!==vertex)});setVertex(null);}}>Remover ponto</button>
   <button disabled={saving||!history.length} onClick={()=>{setDraft(history.at(-1)!);setHistory(h=>h.slice(0,-1));setVertex(null);setError('');}}>Desfazer</button>
  </div>
  <p>Arraste os pontos para ajustar o limite. Clique nos pontos menores para acrescentar um canto. Use as setas para ajustes finos.</p>
  {error&&<p role="alert" className="plan-editor-error">{error}</p>}
  <div className="plan-area-scroll"><svg style={{width:zoom*100+'%'}} viewBox="0 0 882 580" aria-label="Contornos editáveis" onPointerMove={e=>{if(drag.current?.pointerId===e.pointerId){const p=location(e);if(p)updatePoint(drag.current.index,p);}}} onPointerUp={e=>{const g=drag.current;if(g?.pointerId!==e.pointerId)return;const p=location(e);if(p)updatePoint(g.index,p);setHistory(h=>[...h.slice(-29),g.before]);drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}>
   <image href={imageUrl} width={882} height={580}/>
   {rooms.map(room=><polygon key={room.id} points={pointsOf(room.id).map(p=>p.x*882+','+p.y*580).join(' ')} className={'plan-area-outline'+(room.id===roomId?' is-selected':'')} onClick={()=>{if(!saving){setRoomId(room.id);setVertex(null);}}}><title>{room.name}</title></polygon>)}
   {points.map((p,i)=><g key={i}>
    <circle className="plan-area-midpoint" cx={(p.x+points[(i+1)%points.length].x)*441} cy={(p.y+points[(i+1)%points.length].y)*290} r={2.3/zoom} role="button" tabIndex={saving?-1:0} aria-label={'Adicionar ponto após '+(i+1)} onClick={()=>{if(!saving){const next=[...points];next.splice(i+1,0,{x:(p.x+points[(i+1)%points.length].x)/2,y:(p.y+points[(i+1)%points.length].y)/2});commit({...draft,[roomId]:next});setVertex(i+1);}}} onKeyDown={e=>{if(!saving&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.currentTarget.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}}/>
    <circle className={'plan-area-vertex'+(vertex===i?' is-selected':'')} cx={p.x*882} cy={p.y*580} r={4/zoom} role="button" tabIndex={saving?-1:0} aria-label={'Ponto '+(i+1)} onFocus={()=>setVertex(i)} onPointerDown={e=>{if(saving||!e.isPrimary||e.button!==0)return;e.preventDefault();setVertex(i);drag.current={index:i,pointerId:e.pointerId,before:draft};e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);}} onKeyDown={e=>{
     if(saving||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
     e.preventDefault();const step=e.shiftKey?5:1;
     const next={x:Math.max(0,Math.min(1,p.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)/882)),y:Math.max(0,Math.min(1,p.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)/580))};
     commit({...draft,[roomId]:points.map((v,j)=>j===i?next:v)});
    }}/>
   </g>)}
  </svg></div>
  <footer><button disabled={saving} onClick={onCancel}>Cancelar edição</button><button disabled={saving||!!drag.current} onClick={()=>void save()}>{saving?'Salvando…':'Salvar áreas'}</button></footer>
 </section>;
}
