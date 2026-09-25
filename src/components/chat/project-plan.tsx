"use client";
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Layers3, Grid2X2, ScanLine } from 'lucide-react';
import { Floorplan, type FloorplanProps } from '../showroom/floorplan';
import { planModels } from '../../data/plan-products';
import {isRoomLocked} from '../../domain/room-availability';
import {roomAt} from '../../domain/plan-instances';
import {referenceForInstance,referenceOrigin,referenceProvenance} from '../../domain/reference-products';
import {useMoodboardCatalog} from './use-moodboard-catalog';
import {usePlanInstances} from './use-plan-instances';
import { projectPlans } from '../../data/project-plans';
import { registeredProductFor, type RegisteredPlanProduct } from '../../domain/plan-product-catalog';
import { PlanProductEditor } from './plan-product-editor';
import {usePlanAreas} from './use-plan-areas';
import {applyPlanAreas} from '../../domain/plan-areas';
import {PlanAreaEditor} from './plan-area-editor';

const tabs = [
  { id: 'floor', label: 'Planta baixa', icon: ScanLine },
  { id: 'ceiling', label: 'Planta de teto', icon: Layers3 },
  { id: 'flooring', label: 'Planta de piso', icon: Grid2X2 },
] as const;
type Tab = typeof tabs[number]['id'];

export function ProjectPlan({editing=false,selectedRoomId,onSelectRoom,...props}: FloorplanProps & {editing?:boolean;selectedRoomId:string|null;onSelectRoom:(id:string|null)=>void}) {
  const {instances:savedProducts,error:instancesError}=usePlanInstances();
  const areaState=usePlanAreas();
  const {data:moodboard}=useMoodboardCatalog();
  const allProducts=savedProducts.map(p=>({...p,roomId:roomAt(p,areaState.areas)}));
  const mappedRooms=applyPlanAreas(props.rooms,areaState.areas);
  const [editingAreas,setEditingAreas]=useState(false);

  const selectedRoom=mappedRooms.find(r=>r.id===selectedRoomId&&!isRoomLocked(r.id));
  const region=selectedRoom?.planRegion?.points??[];
  const xs=region.map(p=>p.x*882),ys=region.map(p=>p.y*580);
  const planProducts=selectedRoom?allProducts.filter(p=>p.roomId===selectedRoomId||(!p.roomId&&p.category!=='Mobiliário'&&p.x+p.width>=Math.min(...xs)&&p.x<=Math.max(...xs)&&p.y+p.height>=Math.min(...ys)&&p.y<=Math.max(...ys))):[];
  const roomGroups=planModels.map(m=>({...m,instances:planProducts.filter(p=>p.modelId===m.id)})).filter(m=>m.instances.length);
  const roomPath=region.length?region.map((p,i)=>(i?'L':'M')+(p.x*882)+' '+(p.y*580)).join(' ')+' Z':'';
  const [tab, setTab] = useState<Tab>('floor');
  const [selected, setSelected] = useState<string | null>(null);
  const id = useId();

  const [activeModel,setActiveModel]=useState<string|null>(null);
  const [editorId,setEditorId]=useState<string|null>(null);
  const [registered,setRegistered]=useState<RegisteredPlanProduct[]>([]);
  const [catalogError,setCatalogError]=useState('');
  const [catalogLoading,setCatalogLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/plan-products',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('Não foi possível carregar os cadastros. Reabra a página para tentar novamente.');return r.json();}).then(data=>setRegistered(data.products)).catch(e=>{if(e.name!=='AbortError')setCatalogError(e.message);}).finally(()=>{if(!controller.signal.aborted)setCatalogLoading(false);});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{if(editing){setTab('floor');setSelected(null);setActiveModel(null);}else setEditorId(null);},[editing]);
  useEffect(()=>{setSelected(null);setActiveModel(null);setEditorId(null);},[selectedRoomId]);
  const product = planProducts.find(p => p.id === selected);
  const productModel=roomGroups.find(m=>m.id===product?.modelId);
  const registration=product?registeredProductFor(registered,product):undefined;
  const pdfReference=product&&moodboard?referenceForInstance(moodboard.products,product):undefined;
  const currentModel=activeModel??product?.modelId;
  const editorInstance=planProducts.find(p=>p.id===editorId);
  const furnitureGroups=roomGroups.filter(m=>m.category==='Mobiliário');
  const choose = (next: Tab) => { setSelected(null); setEditorId(null); setTab(next); };
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if(event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if(event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if(event.key === 'Home') next = 0;
    else if(event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); choose(tabs[next].id);
    document.getElementById(id + '-' + tabs[next].id)?.focus();
  }
  const cardScale = 0.45, cardWidth = 560 * cardScale, cardHeight = 800 * cardScale;
  const cardX = product ? Math.min(882 - cardWidth, Math.max(0, product.x > 520 ? product.x - cardWidth - 20 : product.x + product.width + 20)) : 0;
  const cardY = product ? Math.min(580 - cardHeight, Math.max(0, product.y - 90)) : 0;
  return <div className="project-plan">
    <div className="project-plan-tabs" role="tablist" aria-label="Referências da planta">
      {tabs.map(({id: key,label,icon: Icon},index) => <button key={key} id={id + '-' + key} type="button" disabled={editingAreas} role="tab" aria-selected={tab === key} aria-controls={id + '-panel'} tabIndex={tab === key ? 0 : -1} onClick={() => choose(key)} onKeyDown={e => navigate(e,index)}><Icon size={16}/>{label}</button>)}
    </div>
    <div className="plan-area-mode">{tab==='floor'&&!editingAreas&&<button type="button" disabled={!areaState.loaded||editing} onClick={()=>setEditingAreas(true)}>Editar áreas</button>}</div>
    {areaState.error&&<p role="alert">{areaState.error}</p>}
    <section id={id + '-panel'} role="tabpanel" aria-labelledby={id + '-' + tab} tabIndex={0}>
      {tab === 'floor' ? editingAreas ? <PlanAreaEditor rooms={props.rooms} areas={areaState.areas} revision={areaState.revision} initialRoomId={selectedRoomId} imageUrl={props.image?.previewImageUrl===projectPlans.floor.display?'/plans/floorplan-focus.webp':props.image?.previewImageUrl??projectPlans.floor.display} onCancel={()=>setEditingAreas(false)} onSaved={result=>{areaState.setState(result);setEditingAreas(false);}}/> : <>
        <div className="project-plan-caption"><span>{!selectedRoom?'1. Selecione um ambiente na planta ou na lista abaixo.':editing?'2. Clique em um móvel deste ambiente para cadastrar o produto.':'2. Passe o mouse sobre os móveis do ambiente selecionado.'}</span><small>Identificação provisória</small></div>
        <label className="plan-room-picker">Ambiente da planta<select aria-label="Ambiente da planta" value={selectedRoomId??''} onChange={e=>onSelectRoom(e.target.value||null)}><option value="">Selecione um ambiente</option>{mappedRooms.map(room=><option key={room.id} value={room.id} disabled={isRoomLocked(room.id)}>{room.name}{isRoomLocked(room.id)?" — bloqueada":""}</option>)}</select></label>
        {selectedRoom&&<div className="plan-room-focus"><div><small>AMBIENTE SELECIONADO</small><strong>{selectedRoom.name}</strong><span>{planProducts.length} elementos disponíveis</span></div><button type="button" onClick={()=>onSelectRoom(null)}>Trocar ambiente</button><button type="button" onClick={()=>props.onOpenRoom(selectedRoom)}>Usar ambiente na criação</button></div>}
        {!editing&&selectedRoom&&<details className="plan-model-inventory">
          <summary>Modelos por desenho <span>{furnitureGroups.length} modelos de mobiliário · {furnitureGroups.reduce((n,m)=>n+m.instances.length,0)} ocorrências</span></summary>
          <p>Formas semelhantes foram agrupadas, inclusive quando giradas. Quantidades e modelos ainda precisam de conferência.</p>
          <div className="plan-model-grid">{roomGroups.map(m=>{
            const sample=m.instances[0],record=registered.find(r=>r.scope==='model'&&r.targetId===m.id);
            return <button type="button" key={m.id} aria-pressed={activeModel===m.id} aria-label={'Localizar '+m.id+' · '+m.name+' · '+m.instances.length+' ocorrências'} onClick={()=>{setActiveModel(activeModel===m.id?null:m.id);setSelected(null);}}>
              <svg viewBox={[sample.x-4,sample.y-4,sample.width+8,sample.height+8].join(' ')} aria-hidden="true"><image href={projectPlans.floor.display} width={882} height={580}/></svg>
              <span><small>{m.id} · {m.confidence==='alta'?'Maior semelhança':m.confidence==='média'?'Conferir modelo':'Revisar identificação'}</small><strong>{record?.name??m.name}</strong><em>{m.instances.length} {m.comparison==='shape'?'ocorrências semelhantes':'elementos do mesmo tipo'}{record?' · cadastrado':''}</em></span>
            </button>;
          })}</div>
        </details>}
        {activeModel&&<div className="plan-model-selection" role="status"><span>{activeModel}: {roomGroups.find(m=>m.id===activeModel)?.instances.length} ocorrências destacadas</span><button type="button" onClick={()=>setActiveModel(null)}>Limpar destaque</button></div>}
        {instancesError&&<p role="alert" className="plan-editor-error">{instancesError}</p>}
        {catalogError&&<p className="plan-editor-error" role="alert">{catalogError}</p>}
        {editing&&<div className="plan-edit-mode" role="status">{catalogLoading?'Carregando cadastros…':editorInstance?'Editando '+editorInstance.instanceCode:selectedRoom?'Modo de cadastro ativo neste ambiente.':'Selecione primeiro um ambiente na planta.'}</div>}
        {editing&&editorInstance&&!catalogLoading&&!catalogError&&<PlanProductEditor key={editorInstance.id} instance={editorInstance} instances={allProducts} products={registered} onSaved={setRegistered} onClose={()=>setEditorId(null)}/>}
        <div className="project-plan-scroll"><div className="astra-interactive-plan project-plan-canvas" onPointerLeave={() => setSelected(null)} onKeyDown={e => { if(e.key === 'Escape' && selected) { e.preventDefault(); e.stopPropagation(); setSelected(null); } }}>
          <Floorplan {...props} focusImages={props.image?.previewImageUrl === projectPlans.floor.display ? { sharp: "/plans/floorplan-focus.webp", blurred: "/plans/floorplan-focus-blurred.webp" } : undefined} focusSelection activeRoomId={selectedRoomId} onOpenRoom={room=>onSelectRoom(room.id===selectedRoomId?null:room.id)} rooms={mappedRooms} overlay={<g transform={'scale(' + (props.image?.previewWidth ?? 882) / 882 + ' ' + (props.image?.previewHeight ?? 580) / 580 + ')'}>
            <defs><clipPath id={id+'-room-clip'}><path d={roomPath}/></clipPath><marker id={id + '-arrow'} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#333"/></marker></defs>
            <g clipPath={selectedRoom?'url(#'+id+'-room-clip)':undefined}>{planProducts.map(p => <g key={p.id} role="button" tabIndex={0} aria-label={(editing?'Cadastrar ':'Ver ') + p.name.toLowerCase() + ' · ' + p.instanceCode} data-element-id={p.id} data-model-id={p.modelId} aria-describedby={selected === p.id ? id + '-product' : undefined} className={'plan-product-hit' + (selected === p.id ? ' is-active' : '') + (currentModel===p.modelId?' is-model-match':'') + (registeredProductFor(registered,p)?' is-registered':'')} onPointerEnter={() => setSelected(p.id)} onFocus={() => setSelected(p.id)} onBlur={() => setSelected(null)} onClick={e => { e.stopPropagation(); setSelected(p.id); if(editing&&!catalogLoading&&!catalogError)setEditorId(p.id); }} onKeyDown={e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setSelected(p.id); if(editing&&!catalogLoading&&!catalogError)setEditorId(p.id); } }}>
              {(p.parts??[p]).map((part,index)=><rect key={index} x={part.x} y={part.y} width={part.width} height={part.height} rx={2}/>)}
            </g>)}
            </g>
            {product && !editing && <g className="plan-product-balloon" pointerEvents="auto">
              <path markerStart={"url(#" + id + "-arrow)"} className="plan-product-line" d={'M' + (product.x + product.width / 2) + ' ' + (product.y + product.height / 2) + ' L' + (cardX + (cardX < product.x ? cardWidth : 0)) + ' ' + (cardY + cardHeight / 2)}/>
              <circle cx={product.x + product.width / 2} cy={product.y + product.height / 2} r={2} fill="#333"/>
              <g transform={"translate("+cardX+" "+cardY+") scale("+cardScale+")"}><foreignObject x={0} y={0} width={560} height={800}>
                <div className="plan-product-card" id={id + '-product'} role="tooltip">
                  <img src={registration?.imageUrl??pdfReference?.image??product.image} alt={(registration?'Produto cadastrado: ':'Referência ilustrativa: ')+(registration?.name??pdfReference?.name??product.name)}/>
                  <div><small>{registration?'PRODUTO CADASTRADO':pdfReference?referenceOrigin(pdfReference):'MODELO DEDUZIDO DO DESENHO'}</small><strong>{registration?.name??pdfReference?.name??product.name}</strong><span className="plan-instance-code">{product.instanceCode} · {productModel?.instances.length} no modelo</span><span>Fabricante: {registration?.manufacturer??pdfReference?.manufacturer??'A definir'}</span><p className="plan-product-finish"><b>Acabamento</b>{registration?.finish??pdfReference?.standardizedFinish??'A definir'}</p>{registration?.link&&<a href={registration.link} target="_blank" rel="noreferrer">Ver produto ↗</a>}<p className="plan-model-reason">{pdfReference?referenceProvenance(pdfReference)+' '+pdfReference.adaptationNotes:productModel?.reason}</p></div>
                </div>
              </foreignObject></g>
            </g>}
          </g>}/>
        </div></div>
      </> : tab === 'ceiling' ? <>
        <div className="project-plan-caption"><span>Alturas, forros e iluminação do PDF · revisão B.</span><small>PDF · revisão B</small></div>
        <div className="project-plan-scroll"><div className="project-plan-canvas">
          <img className="project-ceiling-image" src={projectPlans.ceiling.display} alt="Planta de teto original"/>
        </div></div>
      </> : <div className="project-plan-pending">
        <Grid2X2 size={32}/>
        <span className="project-plan-status">Aguardando referência</span>
        <h3>Planta de piso</h3>
        <p>Este espaço reunirá a paginação, os revestimentos e as transições de piso entre os ambientes.</p>
        <small>Nenhuma planta de piso foi adicionada ao projeto.</small>
      </div>}
    </section>
  </div>;
}