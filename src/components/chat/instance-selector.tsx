"use client";
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {referenceForInstance,referenceOrigin,referenceProvenance} from '../../domain/reference-products';
import {useMoodboardCatalog} from './use-moodboard-catalog';
import {usePlanAreas} from './use-plan-areas';
import {Plus,MousePointer2,Trash2,Undo2,Copy,Save,Unlink} from 'lucide-react';
import {planModels,type PlanProduct,type PlanBounds} from '../../data/plan-products';
import {prismalRooms} from '../../data/prismal-rooms';
import {assignModel,createPlanInstance,roomAt} from '../../domain/plan-instances';
import {registeredProductFor,type RegisteredPlanProduct} from '../../domain/plan-product-catalog';
import {usePlanInstances} from './use-plan-instances';
import {PlanProductEditor} from './plan-product-editor';
import './astra-chat.css';
import './instance-selector.css';

type Handle='move'|'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw';
type Gesture={id:string;handle:Handle;start:{x:number;y:number};before:PlanBounds;pointerId:number;moved:boolean};
export function InstanceSelector(){
 const {areas}=usePlanAreas();
 const {data:moodboard}=useMoodboardCatalog();
 const {instances,setInstances,loaded,saving,error,status,dirty,save}=usePlanInstances(true);
 const [selected,setSelected]=useState<string[]>([]),[active,setActive]=useState<string|null>(null);
 const [drawing,setDrawing]=useState(false),[draft,setDraft]=useState<PlanBounds|null>(null),[drawModel,setDrawModel]=useState('CAD-01');
 const [filter,setFilter]=useState(''),[notice,setNotice]=useState(''),[history,setHistory]=useState<PlanProduct[][]>([]);
 const [adjustment,setAdjustment]=useState<{id:string;rect:PlanBounds}|null>(null);
 const [products,setProducts]=useState<RegisteredPlanProduct[]>([]),[catalogLoaded,setCatalogLoaded]=useState(false),[catalogError,setCatalogError]=useState(''),[editor,setEditor]=useState<string|null>(null);
 const gesture=useRef<Gesture|null>(null),origin=useRef<{x:number;y:number;pointerId:number}|null>(null),suppressClick=useRef(false);
 const chosen=instances.filter(p=>selected.includes(p.id)),instance=instances.find(p=>p.id===active),editing=instances.find(p=>p.id===editor);
 const visible=instances.filter(p=>!filter||p.modelId===filter||(filter==='unassigned'&&!p.modelId));
 const availableModels=planModels.filter(m=>m.category==='Mobiliário'||instances.some(p=>p.modelId===m.id));
 const selectionModel=chosen.length&&chosen.every(p=>p.modelId===chosen[0].modelId)?chosen[0].modelId:'mixed';
 const busy=!loaded||saving;
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/plan-products',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Não foi possível carregar os produtos.');return r.json();}).then(d=>{setProducts(d.products);setCatalogLoaded(true);}).catch(e=>{if(e.name!=='AbortError')setCatalogError(e.message);});
  return()=>controller.abort();
 },[]);
 function commit(next:PlanProduct[],message:string){
  setHistory(previous=>[...previous.slice(-29),instances]);setInstances(next);setNotice(message);
 }
 function undo(){
  const previous=history.at(-1);if(!previous||busy)return;
  setInstances(previous);setHistory(items=>items.slice(0,-1));setSelected([]);setActive(null);setNotice('Última alteração desfeita.');
 }
 function toggle(id:string){setActive(id);setSelected(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]);}
 function linkModel(modelId:string){
  if(!chosen.length||busy)return;
  commit(instances.map(p=>selected.includes(p.id)?assignModel(p,modelId):p),modelId?'Modelo atribuído à seleção.':'Vínculo com o modelo removido.');
  setFilter('');
 }
 function remove(){
  if(!chosen.length||busy)return;
  commit(instances.filter(p=>!selected.includes(p.id)),chosen.length+' instâncias removidas. Você pode desfazer.');
  setSelected([]);setActive(null);
 }
 function duplicate(){
  if(!chosen.length||busy)return;
  const copies=chosen.map(p=>{
   const id='instance-'+crypto.randomUUID(),x=Math.min(882-p.width,p.x+12),y=Math.min(580-p.height,p.y+12);
   const bounds={x,y,width:p.width,height:p.height};
   return {...p,...bounds,id,instanceCode:'INST-'+id.slice(9,17).toUpperCase(),roomId:roomAt(bounds,areas),parts:p.parts?.map(part=>({...part,x:part.x+x-p.x,y:part.y+y-p.y}))};
  });
  commit([...instances,...copies],'Cópias criadas com o mesmo modelo. Arraste para posicionar.');
  setSelected(copies.map(p=>p.id));setActive(copies[0].id);
 }
 function point(e:PointerEvent<SVGSVGElement>){
  const matrix=e.currentTarget.getScreenCTM();if(!matrix)return null;
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
  return {x:Math.max(0,Math.min(882,p.x)),y:Math.max(0,Math.min(580,p.y))};
 }
 function rectFrom(a:{x:number;y:number},b:{x:number;y:number}):PlanBounds{
  return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};
 }
 function adjusted(g:Gesture,p:{x:number;y:number}):PlanBounds{
  const dx=p.x-g.start.x,dy=p.y-g.start.y,r=g.before;
  if(g.handle==='move')return {...r,x:Math.max(0,Math.min(882-r.width,r.x+dx)),y:Math.max(0,Math.min(580-r.height,r.y+dy))};
  let left=r.x,top=r.y,right=r.x+r.width,bottom=r.y+r.height;
  if(g.handle.includes('w'))left=Math.max(0,Math.min(right-3,left+dx));
  if(g.handle.includes('e'))right=Math.min(882,Math.max(left+3,right+dx));
  if(g.handle.includes('n'))top=Math.max(0,Math.min(bottom-3,top+dy));
  if(g.handle.includes('s'))bottom=Math.min(580,Math.max(top+3,bottom+dy));
  return {x:left,y:top,width:right-left,height:bottom-top};
 }
 function cancelGesture(){gesture.current=null;origin.current=null;setAdjustment(null);setDraft(null);}
 function begin(e:PointerEvent<SVGSVGElement>){
  if(busy||!e.isPrimary||e.button!==0||gesture.current||origin.current)return;
  suppressClick.current=false;
  const p=point(e);if(!p)return;
  if(drawing){e.preventDefault();origin.current={...p,pointerId:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);setDraft({...p,width:0,height:0});return;}
  const element=(e.target as Element).closest('[data-handle],[data-instance-id]'),id=element?.getAttribute('data-instance-id');
  const item=instances.find(i=>i.id===id);if(!element||!item)return;
  e.preventDefault();setActive(item.id);e.currentTarget.setPointerCapture(e.pointerId);
  gesture.current={id:item.id,handle:(element.getAttribute('data-handle')??'move') as Handle,start:p,before:item,pointerId:e.pointerId,moved:false};
 }
 function move(e:PointerEvent<SVGSVGElement>){
  const p=point(e);if(!p)return;
  const g=gesture.current;
  if(g&&g.pointerId===e.pointerId){if(Math.hypot(p.x-g.start.x,p.y-g.start.y)>1)g.moved=true;if(g.moved)setAdjustment({id:g.id,rect:adjusted(g,p)});}
  else if(origin.current?.pointerId===e.pointerId)setDraft(rectFrom(origin.current,p));
 }
 function finish(e:PointerEvent<SVGSVGElement>){
  const p=point(e),g=gesture.current,start=origin.current;
  if(g?.pointerId!==e.pointerId&&start?.pointerId!==e.pointerId)return;
  cancelGesture();suppressClick.current=true;
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  if(!p)return;
  if(g){
   if(g.moved){
    const bounds=adjusted(g,p);
    commit(instances.map(item=>item.id===g.id?{...item,...bounds,roomId:roomAt(bounds,areas),parts:undefined}:item),'Posição atualizada.');
    setSelected(previous=>[...new Set([...previous,g.id])]);
   }else if(g.handle==='move')toggle(g.id);
  }else if(start){
   const bounds=rectFrom(start,p);
   if(bounds.width<3||bounds.height<3){setNotice('Arraste para marcar o contorno do móvel.');return;}
   const id='instance-'+crypto.randomUUID(),created={...createPlanInstance(bounds,drawModel,id,'INST-'+id.slice(9,17).toUpperCase()),roomId:roomAt(bounds,areas)};
   commit([...instances,created],'Instância criada. Desenhe outra ou pressione Esc para selecionar.');
   setSelected([created.id]);setActive(created.id);setFilter('');
  }
 }
 const reference=instance&&moodboard?referenceForInstance(moodboard.products,instance):undefined;
 const bounds=instance?(adjustment?.id===instance.id?adjustment.rect:instance):null;
 const handles: [Handle,number,number][]=bounds?[
  ['nw',bounds.x,bounds.y],['n',bounds.x+bounds.width/2,bounds.y],['ne',bounds.x+bounds.width,bounds.y],
  ['w',bounds.x,bounds.y+bounds.height/2],['e',bounds.x+bounds.width,bounds.y+bounds.height/2],
  ['sw',bounds.x,bounds.y+bounds.height],['s',bounds.x+bounds.width/2,bounds.y+bounds.height],['se',bounds.x+bounds.width,bounds.y+bounds.height]
 ]:[];
 async function openEditor(){
  if(!instance)return;
  if(dirty&&!(await save()))return;
  setEditor(instance.id);
 }
 return <main className="instance-workspace" onKeyDown={e=>{
  if((e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true],dialog'))return;
  if(e.key==='Escape'){cancelGesture();setDrawing(false);}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
  if(e.key==='Delete'&&!drawing){e.preventDefault();remove();}
 }}>
  <header className="instance-page-header"><div><a href="/">← Voltar ao projeto</a><h1>Instâncias da planta</h1><p>Desenhe para criar. Selecione móveis para atribuir o mesmo modelo.</p><a className="instance-catalog-link" href="/catalog">Ver catálogo de referências</a></div>
   <button className="instance-save-button" disabled={busy||!!draft||!!adjustment} onClick={()=>void save()}><Save size={16}/>{saving?'Salvando…':'Salvar instâncias'}</button>
  </header>
  <div className="instance-toolbar">
   <div className="instance-modes"><button disabled={busy} aria-pressed={!drawing} onClick={()=>{cancelGesture();setDrawing(false);}}><MousePointer2 size={16}/>Selecionar</button><button disabled={busy} aria-pressed={drawing} onClick={()=>{cancelGesture();setDrawing(true);}}><Plus size={16}/>Criar instância</button></div>
   {drawing?<label>Modelo da nova instância<select aria-label="Modelo da nova instância" value={drawModel} onChange={e=>setDrawModel(e.target.value)}><option value="">Sem modelo</option>{availableModels.map(m=><option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}</select></label>:
    <label>Mostrar<select value={filter} onChange={e=>{setFilter(e.target.value);setSelected([]);setActive(null);}}><option value="">Todas as instâncias ({instances.length})</option><option value="unassigned">Sem modelo</option>{availableModels.filter(m=>instances.some(p=>p.modelId===m.id)).map(m=><option key={m.id} value={m.id}>{m.id} · {m.name} ({instances.filter(p=>p.modelId===m.id).length})</option>)}</select></label>}
   <button disabled={busy||!history.length||!!draft||!!adjustment} onClick={undo}><Undo2 size={16}/>Desfazer</button>
  </div>
  <div className="instance-status-row"><span role="status">{saving?'Salvando…':dirty?'Alterações não salvas':status}</span><small>{drawing?'Arraste sobre o móvel. Esc encerra a criação.':'Clique para incluir ou tirar da seleção. Arraste para mover.'}</small></div>
  {error&&<p role="alert" className="instance-error">{error}</p>}
  {notice&&<p className="instance-draw-notice" aria-live="polite">{notice}</p>}
  <div className="instance-layout">
   <section className="instance-drawing" aria-label="Seleção na planta"><svg className={drawing?'is-drawing':undefined} viewBox="0 0 882 580" role="group" aria-label="Planta baixa — selecionar instâncias" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture} onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}>
    <image href="/plans/floorplan-focus.webp" width="882" height="580"/>
    {visible.map(p=><g key={p.id} role="button" tabIndex={busy||drawing?-1:0} aria-disabled={busy||drawing} aria-label={p.instanceCode+' · '+(registeredProductFor(products,p)?.name??p.name)} aria-pressed={selected.includes(p.id)} data-instance-id={p.id} data-model-id={p.modelId} className={'instance-target'+(selected.includes(p.id)?' selected':'')+(!p.modelId?' unassigned':'')} onClick={()=>{if(!busy&&!drawing)toggle(p.id);}} onKeyDown={e=>{if(!busy&&!drawing&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle(p.id);}}}>
     <title>{p.instanceCode+' · '+p.name}</title>{(adjustment?.id===p.id?[adjustment.rect]:p.parts??[p]).map((part,i)=><rect key={i} x={part.x} y={part.y} width={part.width} height={part.height} rx="2"/>)}
    </g>)}
    {!drawing&&instance&&bounds&&visible.some(p=>p.id===instance.id)&&<g className="instance-adjust-controls"><rect className="instance-adjust-outline" x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height}/>{handles.map(([handle,x,y])=><rect key={handle} data-handle={handle} data-instance-id={instance.id} className={'instance-resize-handle handle-'+handle} x={x-3} y={y-3} width={6} height={6} rx={1}><title>Arraste para redimensionar</title></rect>)}</g>}
    {draft&&<rect className="instance-draft" x={draft.x} y={draft.y} width={draft.width} height={draft.height}/>}
   </svg></section>
   <aside aria-label="Instâncias selecionadas"><h2>Seleção <span>{chosen.length}</span></h2>
    {!chosen.length?<p className="instance-note">Clique nos móveis que deseja relacionar. Depois, escolha um modelo para todos.</p>:<>
     <label className="instance-batch-model">Modelo da seleção<select aria-label="Modelo da seleção" value={selectionModel} disabled={busy||drawing} onChange={e=>linkModel(e.target.value)}><option value="mixed" disabled>Modelos diferentes</option><option value="">Sem modelo</option>{availableModels.map(m=><option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}</select></label>
     <p className="instance-note">Atribua o mesmo modelo para compartilhar o cadastro do produto. Exceções individuais são mantidas.</p>
     <div className="instance-batch-actions"><button disabled={busy||drawing||chosen.every(p=>!p.modelId)} onClick={()=>linkModel('')}><Unlink size={15}/>Desvincular</button><button disabled={busy||drawing} onClick={duplicate}><Copy size={15}/>Duplicar</button><button className="instance-remove" disabled={busy||drawing} onClick={remove}><Trash2 size={15}/>Remover da planta</button></div>
     <button className="instance-clear" onClick={()=>{setSelected([]);setActive(null);}}>Limpar seleção</button>
    </>}
    {instance&&<div className="instance-focus">{reference&&!registeredProductFor(products,instance)&&<div className="instance-pdf-reference"><img src={reference.image} alt={reference.name}/><small>{referenceOrigin(reference)}</small><strong>{reference.name}</strong><p>{reference.standardizedFinish}</p><p>{referenceProvenance(reference)}</p><p>{reference.adaptationNotes}</p></div>}<small>{instance.instanceCode}</small><h3>{registeredProductFor(products,instance)?.name??instance.name}</h3><p>{prismalRooms.find(r=>'PRISMAL_'+r.key===instance.roomId)?.name??'Área compartilhada'}</p>
     {instance.modelId&&<button disabled={busy||drawing} onClick={()=>{setFilter('');setSelected(instances.filter(p=>p.modelId===instance.modelId).map(p=>p.id));}}>Selecionar mesmo modelo ({instances.filter(p=>p.modelId===instance.modelId).length})</button>}
     <button disabled={busy||drawing||!catalogLoaded} onClick={()=>void openEditor()}>Cadastrar produto</button>
    </div>}
    {catalogError&&<p role="alert">{catalogError}</p>}
    {!!chosen.length&&<ul>{chosen.map(p=><li key={p.id}><button className="instance-list-item" onClick={()=>setActive(p.id)} aria-pressed={active===p.id}><strong>{p.instanceCode}</strong><span>{p.name}</span></button><button aria-label={'Tirar '+p.instanceCode+' da seleção'} onClick={()=>{setSelected(previous=>previous.filter(id=>id!==p.id));if(active===p.id)setActive(null);}}>×</button></li>)}</ul>}
    <p className="instance-note">Base inicial: móveis identificáveis no desenho. Modelos e quantidades podem ser ajustados.</p>
   </aside>
  </div>
  {editing&&catalogLoaded&&<PlanProductEditor key={editing.id} instance={editing} instances={instances} products={products} onSaved={setProducts} onClose={()=>setEditor(null)}/>}
 </main>;
}
