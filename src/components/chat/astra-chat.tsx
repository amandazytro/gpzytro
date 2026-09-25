"use client";
import {isRoomLocked} from "../../domain/room-availability";
import {LockKeyhole} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {useMoodboardCatalog} from './use-moodboard-catalog';
import { useRouter, useSearchParams } from 'next/navigation';
import {productGroup} from '../../services/product-options';
import {COMPOSITION_REVISION} from '../../services/product-options';
import { Floorplan } from '../showroom/floorplan';
import { ProjectPlan } from './project-plan';
import { prismalDatabase } from '../../data/prismal';
import type { SavedRoom, ProjectState, RoomImage } from '../../services/project-state';
const PROJECT=prismalDatabase();
import { ArrowUp, Check, Download, ImagePlus, Images, LoaderCircle, Maximize2, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, ScanLine, Settings, Square, Table2, Trash2, X } from 'lucide-react';
import './astra-chat.css';

type Turn={id:string;prompt:string;moodboardNumber?:MoodboardNumber;image:{id:string;url:string;createdAt:string;compositionRevision?:string;referenceRevision?:string;productIds?:string[]};referenceNames:string[]};
type Conversation={id:string;title:string;turns:Turn[];updatedAt:string};
type Reference={name:string;dataUrl:string};
type MoodboardNumber='1'|'2'|'3';
type Status={moodboards?:{number:MoodboardNumber;name?:string;previewImage?:string;status:'reference'|'pending'|'ready';referenceStrategy?:'instances';products:{id:string;name:string;category:string;image?:string;group?:string;roomIds?:string[];planModelIds?:string[]}[]}[];configured:boolean;reference:{name:string;pdf:string;image:string};catalog:{status:'reference'|'pending'|'ready';products:{id:string;name:string;category:string}[]}};
const STORAGE='astra-image-conversations-v2';
const suggestions=[
 {title:'Mais elegância em todas as imagens',prompt:'Torne todas as imagens do projeto mais elegantes, com iluminação refinada e acabamento visual premium.'},
 {title:'Atmosfera acolhedora no projeto inteiro',prompt:'Use uma atmosfera acolhedora em todas as imagens do projeto, com luz suave e apresentação sofisticada.'},
 {title:'Referência premium para o projeto',prompt:'Use a imagem anexada como referência de qualidade e atmosfera premium para todas as imagens do projeto.'},
];
function loadConversations(raw:string|null):Conversation[]{
  if(!raw)return [];
  const list:unknown=JSON.parse(raw);
  if(!Array.isArray(list))throw new Error('invalid history');
  return list.filter((c):c is Conversation=>!!c&&typeof c==='object'&&typeof c.id==='string'&&typeof c.title==='string'&&typeof c.updatedAt==='string'&&Array.isArray(c.turns)&&c.turns.every((t:Turn)=>t&&typeof t.id==='string'&&typeof t.prompt==='string'&&typeof t.image?.id==='string'&&typeof t.image?.url==='string'&&/^\/api\/renders\/[a-f0-9-]{36}$/.test(t.image.url)&&Array.isArray(t.referenceNames))).slice(0,30);
}
export function AstraChat(){
  const router=useRouter(),params=useSearchParams();
  const {data:liveReferences}=useMoodboardCatalog();
  const roomId=PROJECT.rooms.some(r=>r.id===params.get('room'))?params.get('room'):null;
  const currentRoom=PROJECT.rooms.find(r=>r.id===roomId);
  const roomNumber=PROJECT.rooms.findIndex(r=>r.id===roomId)+1;
  const [roomImage,setRoomImage]=useState<RoomImage|null>(null);
  const [savedRoom,setSavedRoom]=useState<SavedRoom|null>(null);
  const [projectState,setProjectState]=useState<ProjectState|null>(null);
  const [roomLoading,setRoomLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [composition,setComposition]=useState<MoodboardNumber>('1');
  const [previewMoodboard,setPreviewMoodboard]=useState<string|null>(null);
  const [visibleRoomTurns,setVisibleRoomTurns]=useState<string[]>([]);
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [hydrated,setHydrated]=useState(false);
  const [directionNotice,setDirectionNotice]=useState('');
  const globalMode=!roomId&&!activeId;
  const [draft,setDraft]=useState('');
  const [references,setReferences]=useState<Reference[]>([]);
  const [status,setStatus]=useState<Status|null>(null);
  const [error,setError]=useState('');
  const [storageNotice,setStorageNotice]=useState('');
  const [pending,setPending]=useState<{id:string;prompt:string}|null>(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [gallery,setGallery]=useState(false);
  const [productIds,setProductIds]=useState<string[]>([]);
  const [zoomImage,setZoomImage]=useState<string|null>(null);
  const controller=useRef<AbortController|null>(null);
  const generation=useRef(0);
  const textarea=useRef<HTMLTextAreaElement>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const scrollArea=useRef<HTMLDivElement>(null);
  const referenceDialog=useRef<HTMLDialogElement>(null);

  const [planRoomId,setPlanRoomId]=useState<string|null>(null);
  const catalogDialog=useRef<HTMLDialogElement>(null);
  const zoomDialog=useRef<HTMLDialogElement>(null);
  const active=conversations.find(c=>c.id===activeId);
  const turns=roomId?(active?.turns??[]).filter(t=>visibleRoomTurns.includes(t.id)):active?.turns??[];
  const rawCatalog:NonNullable<Status['moodboards']>[number]=status?.moodboards?.find(m=>m.number===composition)??{number:composition,status:composition==='1'?'reference':'pending',products:[]};
  const activeCatalog={...rawCatalog,products:rawCatalog.referenceStrategy==='instances'?rawCatalog.products.filter(p=>(!roomId||!p.roomIds?.length||p.roomIds.includes(roomId))&&(!p.planModelIds?.length||liveReferences?.assignments.some(a=>(!roomId||a.roomId===roomId)&&p.planModelIds?.includes(a.modelId)))):rawCatalog.products};
  const referencesCurrent=(image:RoomImage|undefined|null)=>activeCatalog.referenceStrategy!=='instances'||!!liveReferences&&image?.referenceRevision===liveReferences.revision;
  const productGroups=Array.from(new Set(activeCatalog.products.map(productGroup)));
  const catalogBlocked=activeCatalog.status==='pending';
  const roomBoards=currentRoom?(['1','2','3'] as const).filter(number=>status?.moodboards?.some(m=>m.number===number&&m.status!=='pending')).map(number=>{const catalog=status?.moodboards?.find(m=>m.number===number);return {id:'MOODBOARD_'+number,name:'MOODBOARD '+number,number,previewImageUrl:catalog?.previewImage,description:catalog?.name??'Carregando catálogo',composition:undefined as {element:string;description:string}[]|undefined};}):[];
  const latestRoomImage=turns.at(-1)?.image??roomImage;
  const selectedBoardId='MOODBOARD_'+composition;
  const imageMatchesComposition=latestRoomImage?.compositionRevision===COMPOSITION_REVISION&&referencesCurrent(latestRoomImage)&&((turns.at(-1)?.moodboardNumber===composition&&!previewMoodboard)||(savedRoom?.moodboardNumber===composition&&savedRoom.image.url===latestRoomImage?.url));
  const isSaved=imageMatchesComposition&&!!savedRoom&&savedRoom.image.url===latestRoomImage?.url&&(savedRoom.moodboardNumber??'1')===composition;
  const imageCount=conversations.reduce((n,c)=>n+c.turns.length,0);
  useEffect(()=>{
    try{localStorage.removeItem('astra-image-conversations-v1');setConversations(loadConversations(localStorage.getItem(STORAGE)));}catch{setStorageNotice('O histórico salvo não pôde ser aberto. Esta conversa ficará disponível nesta sessão.');}
    setHydrated(true);
    const abort=new AbortController();
    fetch('/api/astra',{signal:abort.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{setStatus(data);}).catch(e=>{if(e.name!=='AbortError')setError('Não foi possível conectar à GPZytro. Atualize a página para tentar novamente.');});
    return ()=>{abort.abort();controller.current?.abort();};
  },[]);
  useEffect(()=>{
    if(!roomId){setRoomImage(null);setSavedRoom(null);setRoomLoading(false);return;}
    const abort=new AbortController();
    generation.current++;controller.current?.abort();setPending(null);
    setActiveId('ROOM_'+roomId);setDraft('');setReferences([]);setError('');setGallery(false);setPreviewMoodboard(null);setVisibleRoomTurns([]);setRoomImage(null);setSavedRoom(null);setRoomLoading(true);
    Promise.all([
      fetch('/api/room-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId}),signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}),
      fetch('/api/project-state',{signal:abort.signal}).then(async r=>{if(!r.ok)throw new Error('Não foi possível carregar as composições salvas.');return r.json();})
    ]).then(([session,state])=>{if(!abort.signal.aborted){setRoomImage(session.image);setSavedRoom(session.saved);setProductIds(session.saved?.image.compositionRevision===COMPOSITION_REVISION?session.saved.image.productIds??[]:[]);setComposition(session.saved?.moodboardNumber??"1");setProjectState(state);}}).catch(e=>{if(!abort.signal.aborted)setError(e.message??'Não foi possível abrir o ambiente.');}).finally(()=>{if(!abort.signal.aborted)setRoomLoading(false);});
    return ()=>abort.abort();
  },[roomId]);
  useEffect(()=>{
    if(!hydrated||storageNotice)return;
    try{localStorage.setItem(STORAGE,JSON.stringify(conversations.slice(0,30)));}catch{setStorageNotice('O navegador não conseguiu salvar o histórico. As imagens continuam disponíveis nesta sessão.');}
  },[conversations,hydrated,storageNotice]);
  useEffect(()=>{if(textarea.current){textarea.current.style.height='auto';textarea.current.style.height=Math.min(textarea.current.scrollHeight,180)+'px';}},[draft]);
  useEffect(()=>{scrollArea.current?.scrollTo({top:scrollArea.current.scrollHeight,behavior:'smooth'});},[turns.length,pending,activeId]);
  useEffect(()=>{if(zoomImage)zoomDialog.current?.showModal();},[zoomImage]);
  function cancel(){generation.current++;controller.current?.abort();setPending(null);}
  function newConversation(){cancel();setComposition('1');setPreviewMoodboard(null);setProductIds([]);router.push('/');setActiveId(null);setDraft('');setReferences([]);setDirectionNotice('');setError('');setGallery(false);setSidebarOpen(false);textarea.current?.focus();}

  function openConversation(id:string){if(id.startsWith('ROOM_')){openRoom(id.slice(5));return;}cancel();setComposition(conversations.find(c=>c.id===id)?.turns.at(-1)?.moodboardNumber??'1');setProductIds([]);setPreviewMoodboard(null);router.push('/');setActiveId(id);setDraft('');setReferences([]);setError('');setGallery(false);setSidebarOpen(false);}
  function deleteImage(conversationId:string,turnId:string){
    setConversations(prev=>prev.map(c=>c.id===conversationId?{...c,turns:c.turns.filter(t=>t.id!==turnId)}:c).filter(c=>c.turns.length>0));
    setVisibleRoomTurns(prev=>prev.filter(id=>id!==turnId));
  }
  function openRoom(id:string){cancel();referenceDialog.current?.close();setSidebarOpen(false);setGallery(false);router.push('/?room='+encodeURIComponent(id));}
  async function saveComposition(){
    if(!roomId||!latestRoomImage||saving||pending||isSaved||catalogBlocked)return;
    setSaving(true);setError('');
    try{
      const payload=/^[a-f0-9-]{36}$/.test(latestRoomImage.id)?{roomId,moodboardNumber:composition,imageId:latestRoomImage.id}:{roomId,moodboardNumber:composition};
      const response=await fetch('/api/project-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setSavedRoom(data.saved);setRoomImage(data.saved.image);setPreviewMoodboard(null);setVisibleRoomTurns([]);
      setProjectState(prev=>prev?{...prev,savedRooms:{...prev.savedRooms,[roomId]:data.saved},savedCompositions:{...prev.savedCompositions,[roomId]:{...prev.savedCompositions?.[roomId],[composition]:data.saved}}}:prev);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a composição.');}finally{setSaving(false);}
  }
  async function attach(files:FileList|null){
    if(!files)return;
    setError('');
    if(references.length+files.length>2){setError('Você pode anexar até duas referências por prompt.');return;}
    try{
      const added=await Promise.all(Array.from(files).map(file=>{
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5_000_000)throw new Error('Use imagens PNG, JPEG ou WebP de até 5 MB.');
        return new Promise<Reference>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name.slice(0,180),dataUrl:String(reader.result)});reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file);});
      }));setReferences(prev=>[...prev,...added].slice(0,2));
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível anexar a referência.');}
    finally{if(fileInput.current)fileInput.current.value='';}
  }
  function selectMoodboard(number:MoodboardNumber){
    if(pending||saving||roomLoading)return;
    setComposition(number);setProductIds([]);setReferences([]);setError('');setPreviewMoodboard('MOODBOARD_'+number);
    const pinned=(roomId?projectState?.savedCompositions?.[roomId]?.[number]:null)??(savedRoom?.moodboardNumber===number?savedRoom:null);
    setSavedRoom(pinned);
    if(pinned?.image.compositionRevision===COMPOSITION_REVISION&&referencesCurrent(pinned.image)){setProductIds(pinned.image.productIds??[]);setRoomImage(pinned.image);setVisibleRoomTurns([]);setPreviewMoodboard(null);return;}
    const existing=active?.turns.filter(t=>t.moodboardNumber===number&&t.image.compositionRevision===COMPOSITION_REVISION&&referencesCurrent(t.image)).at(-1);
    if(existing){setProductIds(existing.image.productIds??[]);setVisibleRoomTurns([existing.id]);setPreviewMoodboard(null);return;}
    if(status?.moodboards?.find(m=>m.number===number)?.status==='ready'){
      if(!status.configured){setError('A geração ainda não está configurada no servidor.');return;}
      void submit(undefined,number);
    }
  }
  async function submit(event?:FormEvent, automatic?:MoodboardNumber, chosenProducts?:string[]){
    event?.preventDefault();
    const target=automatic??composition;
    const targetCatalog=status?.moodboards?.find(m=>m.number===target)??activeCatalog;
    const prompt=automatic&&targetCatalog.referenceStrategy==='instances'?'Gere uma imagem deste ambiente com todos os móveis vinculados às instâncias atuais da planta. Preserve arquitetura, contornos, posição, orientação, função e equipamentos. Use as imagens e acabamentos de cada referência e somente suas adaptações documentadas. Não acrescente móveis.':automatic?`Troque o estilo de TODAS as peças decorativas existentes na composição do MOODBOARD ${target} para ${currentRoom?.name??'o ambiente da planta'}. Todos os móveis devem permanecer exatamente no mesmo lugar, orientação, quantidade, função e escala da planta; só muda o estilo. Preserve computadores, monitores e demais equipamentos essenciais no lugar, mesmo sem referência na tabela. Aplique materiais e modelos compatíveis da tabela: mesa continua mesa, alterando seu tampo; tapete, piso e poltronas existentes podem receber novas referências sem mudar a distribuição. Reproduza exatamente os modelos especificados na tabela, incluindo sofá e poltrona: forma, cor, material e detalhes, sem adaptações. Somente se o item não tiver produto especificado, crie apenas a forma do modelo, mantendo função, lugar e dimensões e usando obrigatoriamente os acabamentos, cores e materiais aplicáveis do moodboard. Invente um acabamento somente se não existir nenhuma referência aplicável para essa parte. Não acrescente móveis extras. Preserve arquitetura, câmera, iluminação e ambientes vizinhos salvos.`:draft.trim();
    if(!prompt||pending||roomLoading||saving)return;
    if(targetCatalog.status==='pending'){setError('As referências deste moodboard ainda não foram configuradas.');return;}
    if(!status?.configured){setError('A API ainda não está configurada no servidor.');return;}
    const id=roomId?'ROOM_'+roomId:(activeId??crypto.randomUUID()), requestId=++generation.current;
    const snapshot=automatic?[]:turns.slice(-8);
    const abort=new AbortController();controller.current=abort;
    if(automatic)setVisibleRoomTurns([]);setPending({id,prompt});setError('');setGallery(false);
    try{
      const response=await fetch('/api/astra',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({applyProjectDirection:globalMode&&!automatic,prompt,roomId:roomId??undefined,moodboardNumber:target,fullComposition:!!automatic,useBasePreview:!!automatic||!!previewMoodboard,sourceImageId:previewMoodboard?undefined:snapshot.at(-1)?.image.id,history:snapshot.map(t=>({prompt:t.prompt})),references:globalMode||targetCatalog.referenceStrategy==='instances'?references:targetCatalog.status==='ready'?[]:references,productIds:chosenProducts??(automatic?[]:productIds)})});
      const result=await response.json().catch(()=>null);
      if(!response.ok||!result?.image?.url)throw new Error(result?.error??'A imagem não pôde ser criada. Tente novamente.');
      if(requestId!==generation.current)return;
      const turn:Turn={id:crypto.randomUUID(),prompt,moodboardNumber:target,image:result.image,referenceNames:references.map(r=>r.name)};
      setConversations(prev=>{
        const current=prev.find(c=>c.id===id);
        const updated:Conversation={id,title:currentRoom?.name??current?.title??prompt.slice(0,52),turns:[...(current?.turns??[]),turn].slice(-40),updatedAt:new Date().toISOString()};
        return [updated,...prev.filter(c=>c.id!==id)].slice(0,30);
      });setActiveId(id);setVisibleRoomTurns(prev=>[...prev,turn.id]);setPreviewMoodboard(null);if(!automatic)setDraft('');setReferences([]);
    }catch(e){if(requestId===generation.current&&!abort.signal.aborted)setError(e instanceof Error?e.message:'A conexão foi interrompida. Tente novamente.');}
    finally{if(requestId===generation.current)setPending(null);}
  }
  function onKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void submit();}}
  const composer=<form className="astra-composer" onSubmit={submit}>
    {!!references.length&&<div className="astra-attachments">{references.map((r,index)=><div key={index}><img src={r.dataUrl} alt=""/><span>{r.name}</span><button type="button" disabled={!!pending} aria-label={'Remover '+r.name} onClick={()=>setReferences(prev=>prev.filter((_,i)=>i!==index))}><X size={13}/></button></div>)}</div>}
    <label className="sr-only" htmlFor="astra-prompt">Seu prompt</label>
    <textarea id="astra-prompt" ref={textarea} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={onKeyDown} placeholder="Escreva o que você quer mudar à partir da planta do projeto." rows={2} maxLength={6000} disabled={!!pending||saving}/>
    <div className="astra-composer-tools"><div>
      <button type="button" className="astra-icon-button" title="Anexar referência" aria-label="Anexar referência" disabled={saving||!!pending||references.length>=2||(!globalMode&&activeCatalog.status==='ready'&&activeCatalog.referenceStrategy!=='instances')} onClick={()=>fileInput.current?.click()}><Plus size={20}/></button>
      <button type="button" className="astra-reference-chip" onClick={()=>referenceDialog.current?.showModal()}><ScanLine size={14}/><span>Planta Prismal V2</span><Check size={12}/></button>
      {(turns.length>0||roomId)&&<span className="astra-edit-hint">{currentRoom?.name??'Editando a última imagem'}</span>}
    </div>{pending?<button className="astra-send" type="button" aria-label="Cancelar geração" onClick={cancel}><Square size={13} fill="currentColor"/></button>:<button className="astra-send" type="submit" aria-label="Gerar imagem" disabled={!draft.trim()||!status?.configured||roomLoading||saving||catalogBlocked}><ArrowUp size={20}/></button>}</div>
    <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={e=>void attach(e.target.files)}/>
  </form>;
  function imageView(turn:Turn){return <div className="astra-answer"><div className="astra-image-answer"><button type="button" className="astra-image-open" onClick={()=>setZoomImage(turn.image.url)} aria-label="Ampliar imagem"><img src={turn.image.url} alt={turn.prompt} onLoad={()=>scrollArea.current?.scrollTo({top:scrollArea.current.scrollHeight,behavior:'smooth'})}/></button><div className="astra-image-tools"><a href={turn.image.url} download={'astra-'+turn.image.id+'.png'} aria-label="Baixar imagem" title="Baixar imagem"><Download size={16}/></a><button type="button" aria-label="Ampliar imagem" title="Ampliar imagem" onClick={()=>setZoomImage(turn.image.url)}><Maximize2 size={16}/></button></div></div></div>;}
  return <div className="astra-chat-shell">
    {sidebarOpen&&<button className="astra-sidebar-scrim" aria-label="Fechar menu" onClick={()=>setSidebarOpen(false)}/>}
    <aside className={'astra-sidebar'+(sidebarOpen?' is-open':'')} aria-label="Navegação">
      <div className="astra-sidebar-brand"><button type="button" onClick={newConversation} className="astra-brand"><span>GPZytro</span></button><button className="astra-icon-button astra-mobile-only" aria-label="Fechar menu" onClick={()=>setSidebarOpen(false)}><PanelLeftClose size={17}/></button></div>
      <button type="button" className="astra-new-chat" onClick={newConversation}><Plus size={17}/>Nova imagem</button>
      <nav className="astra-primary-nav"><button className={gallery?'selected':''} onClick={()=>{setGallery(true);setSidebarOpen(false);}}><Images size={17}/>Minhas imagens<span>{imageCount||''}</span></button><button onClick={()=>referenceDialog.current?.showModal()}><ScanLine size={17}/>Planta do projeto</button><button onClick={()=>catalogDialog.current?.showModal()}><Table2 size={17}/>Catálogo de produtos</button></nav>
      <div className="astra-history"><p>Conversas</p>{!conversations.length?<span className="astra-history-empty">Suas criações começam aqui.</span>:conversations.map(c=><button key={c.id} className={activeId===c.id&&!gallery?'selected':''} onClick={()=>openConversation(c.id)} title={c.title}><MessageSquare size={14}/><span>{c.title}</span></button>)}</div>
      <div className="astra-sidebar-bottom"><span className="astra-avatar">P</span><div><strong>Prismal</strong><span>Estúdio de imagens</span></div><span className="astra-online-dot"/></div>
    </aside>
    <main className={"astra-chat-main"+(roomId?" has-room-context":"")}>
      <header className="astra-chat-header"><div><button className="astra-icon-button astra-mobile-only" aria-label="Abrir menu" onClick={()=>setSidebarOpen(true)}><PanelLeftOpen size={20}/></button><span>GPZytro <span className="astra-header-mode">/ Imagens</span></span></div><button className="astra-project-label" onClick={()=>referenceDialog.current?.showModal()}><span className="astra-online-dot"/>Prismal V2</button></header>
      {currentRoom&&<div className="astra-room-context"><button className="astra-room-context-plan" aria-label="Ver ambiente na planta" onClick={()=>referenceDialog.current?.showModal()}><span aria-hidden="true" inert><Floorplan variant="locator" rooms={PROJECT.rooms} drawing={null} image={PROJECT.referenceDocuments[0]} activeRoomId={roomId} onOpenRoom={r=>openRoom(r.id)}/></span></button><div><span>AMBIENTE {String(roomNumber).padStart(2,'0')}</span><strong>{currentRoom.name}</strong></div><button className="astra-switch-room" onClick={()=>referenceDialog.current?.showModal()}>Trocar ambiente</button></div>}
      {!roomId&&!globalMode&&<div className="astra-global-moodboards" aria-label="Moodboard ativo">{(['1','2','3'] as const).map(n=><button key={n} aria-pressed={composition===n} disabled={!!pending} onClick={()=>selectMoodboard(n)}>MOODBOARD {n}</button>)}{catalogBlocked&&<span>Aguardando tabela do MOODBOARD {composition}</span>}</div>}{storageNotice&&<p className="astra-system-notice" role="status">{storageNotice}</p>}
      <div className="astra-chat-scroll" ref={scrollArea}>
        {gallery?<section className="astra-gallery"><span className="astra-overline">SEU ESTÚDIO</span><h1>Minhas imagens</h1>{imageCount?<div className="astra-gallery-grid">{conversations.flatMap(c=>c.turns.map(t=><div className="astra-gallery-card" key={t.id}><button className="astra-gallery-open" onClick={()=>openConversation(c.id)}><img src={t.image.url} alt={t.prompt} loading="lazy"/><span>{t.prompt}</span></button><button className="astra-gallery-delete" aria-label={"Excluir imagem: "+t.prompt} onClick={()=>deleteImage(c.id,t.id)}><Trash2 size={14}/>Excluir</button></div>))}</div>:<div className="astra-gallery-empty"><Images size={28}/><p>As imagens que você criar aparecerão aqui.</p><button onClick={newConversation}>Criar minha primeira imagem</button></div>}</section>:!roomId&&!turns.length&&!pending?<section className="astra-welcome"><div className="astra-welcome-heading"><span className="astra-overline">{globalMode?"DIREÇÃO VISUAL DO PROJETO":"CRIAR IMAGEM DO PROJETO"}</span><h1>O que vamos criar hoje?</h1><p>{globalMode?"Descreva a imagem e a direção visual desejadas. Ao enviar, a API gera a imagem e registra essa direção para as próximas criações do projeto.":"Descreva a imagem que deseja gerar. A API usará as plantas, medidas e os móveis vinculados ao projeto."}</p></div>{composer}<div className="astra-suggestions">{(globalMode?suggestions:[{title:'Copa e convivência',prompt:'Gere uma perspectiva da copa e convivência com os móveis vinculados, incluindo o sofá modular em L, preservando a planta.'},{title:'Sala de conselho',prompt:'Gere uma perspectiva da sala de conselho com as referências cadastradas, preservando os lugares da mesa, cadeiras e balcões.'},{title:'Visão geral do projeto',prompt:'Gere uma vista geral do projeto seguindo as plantas, medidas e posições das instâncias.'}]).map(s=><button key={s.title} onClick={()=>{setDraft(s.prompt);textarea.current?.focus();}}><ImagePlus size={16}/><span>{s.title}</span></button>)}</div><p className="astra-catalog-note">{activeCatalog.status==='ready'?'Materiais da tabela, mantendo os móveis e a organização da planta.':'Catálogo de produtos aguardando sua tabela.'}</p></section>:<section className="astra-thread" aria-label="Conversa">{roomId&&!turns.length&&!pending&&(roomLoading?<div className="astra-room-loading" role="status"><LoaderCircle className="astra-spin" size={20}/><span>Preparando {currentRoom?.name}…</span></div>:latestRoomImage?imageView({id:'ROOM_INITIAL',prompt:'Perspectiva de '+currentRoom?.name,image:latestRoomImage,referenceNames:[]}):<div className="astra-gallery-empty"><Images size={28}/><p>Nenhuma imagem gerada para este ambiente.</p><small>As novas plantas e referências orientarão as próximas criações.</small></div>)}{turns.map(turn=><article key={turn.id} className="astra-turn"><div className="astra-user-message"><p>{turn.prompt}</p>{!!turn.referenceNames.length&&<small>{turn.referenceNames.join(' · ')}</small>}</div>{imageView(turn)}</article>)}{pending&&<article className="astra-turn"><div className="astra-user-message"><p>{pending.prompt}</p></div><div className="astra-generation" role="status"><div><div className="astra-generation-lines"><i/><i/><i/></div><p><LoaderCircle size={14} className="astra-spin"/>Criando sua imagem…</p><small>Isso pode levar alguns minutos.</small></div></div></article>}</section>}
      </div>
      {!gallery&&(roomId||turns.length>0||pending)&&<div className="astra-composer-dock">{composer}<p className="astra-composer-note">A planta do projeto é a referência de todas as imagens.</p></div>}
      {directionNotice&&globalMode&&<p className="astra-system-notice" role="status">{directionNotice}</p>}
      {error&&<div className="astra-chat-error" role="alert"><span>{error}</span><button aria-label="Fechar erro" onClick={()=>setError('')}><X size={15}/></button></div>}
      {status&&!status.configured&&<p className="astra-system-notice">A geração ainda não está configurada no servidor.</p>}
    </main>
    {currentRoom&&<aside className="astra-room-panel" aria-label="Composições do ambiente"><div className="astra-room-panel-title"><span className="astra-overline">DECORAÇÃO COMPLETA</span><h2>Moodboards</h2></div>{roomBoards.length?<><div className="astra-moodboard-capsules">{roomBoards.map(b=><button key={b.id} type="button" disabled={!!pending||saving||roomLoading} aria-pressed={selectedBoardId===b.id} onClick={()=>selectMoodboard(b.number)}>{b.name}</button>)}</div>{roomBoards.filter(b=>b.id===selectedBoardId).map(b=><div className="astra-room-composition" key={b.id}>{b.previewImageUrl&&<img src={b.previewImageUrl} alt={b.name}/>}<h3>{b.description}</h3><ul>{b.composition?.map(item=><li key={item.element}><strong>{item.element}</strong><span>{item.description}</span></li>)}</ul></div>)}</>:<p className="astra-room-no-boards">Os moodboards deste ambiente serão adicionados com as referências do projeto. As novas referências orientarão as próximas imagens.</p>}{catalogBlocked&&<p className="astra-catalog-block" role="status">Envie a tabela do {selectedBoardId.replace("_"," ")}. A geração e o salvamento ficam bloqueados até as referências serem configuradas.</p>}{activeCatalog.status==='ready'&&<button type="button" className="astra-redo-composition" disabled={!!pending||saving||roomLoading} onClick={()=>catalogDialog.current?.showModal()}>Personalizar composição</button>}<button className="astra-save-composition" disabled={!latestRoomImage||roomLoading||saving||!!pending||isSaved||catalogBlocked||!imageMatchesComposition} onClick={()=>void saveComposition()}>{saving?<LoaderCircle size={15} className="astra-spin"/>:isSaved?<Check size={15}/>:null}{saving?'Salvando…':isSaved?'Composição salva':'Salvar composição'}</button><button type="button" className="astra-redo-composition" disabled={roomLoading||saving||!!pending||catalogBlocked||!status?.configured} onClick={()=>void submit(undefined,composition,productIds)}>Refazer composição</button><p className="astra-save-note">A composição salva permanece ao reabrir e orienta as vistas dos ambientes vizinhos.</p>{!!projectState&&<span className="astra-saved-count">{Object.keys(projectState.savedRooms).length} ambientes salvos no projeto</span>}</aside>}
    <dialog ref={referenceDialog} className="astra-dialog" onClose={()=>setPlanRoomId(null)}><div className="astra-dialog-heading"><div><span className="astra-overline">REFERÊNCIA DO PROJETO</span><h2>Planta Prismal V2</h2></div><a href="/instances" className="astra-icon-button plan-settings-button" aria-label="Selecionar instâncias" title="Selecionar instâncias"><Settings size={20}/></a><button className="astra-icon-button" aria-label="Fechar planta" onClick={()=>referenceDialog.current?.close()}><X size={20}/></button></div><ProjectPlan selectedRoomId={planRoomId} onSelectRoom={setPlanRoomId} rooms={PROJECT.rooms} drawing={null} image={PROJECT.referenceDocuments[0]} activeRoomId={roomId} onOpenRoom={r=>openRoom(r.id)}/><div className="astra-plan-room-list">{PROJECT.rooms.map((room,index)=><button key={room.id} disabled={isRoomLocked(room.id)} className={isRoomLocked(room.id)?"is-locked":undefined} aria-pressed={planRoomId===room.id} onClick={()=>setPlanRoomId(current=>current===room.id?null:room.id)}><span>{isRoomLocked(room.id)?<LockKeyhole size={14} aria-label="Área bloqueada"/>:String(index+1).padStart(2,'0')}</span>{room.name}{projectState?.savedRooms[room.id]&&<Check size={11}/>}</button>)}</div><p>Esta planta acompanha todas as criações. Paredes, portas, janelas e distribuição dos ambientes orientam cada imagem.</p></dialog>
    <dialog ref={catalogDialog} className="astra-dialog astra-catalog-dialog"><div className="astra-dialog-heading"><div><span className="astra-overline">REFERÊNCIAS DE PRODUTOS</span><h2>Catálogo · MOODBOARD {composition}</h2></div><button className="astra-icon-button" aria-label="Fechar catálogo" onClick={()=>catalogDialog.current?.close()}><X size={20}/></button></div>{activeCatalog.status==='ready'?<><p>Escolha uma opção por categoria ou deixe no automático. Os móveis permanecem no lugar; os acabamentos seguem o moodboard.</p><div className="astra-product-groups">{productGroups.map(group=><fieldset key={group}><legend>{group}</legend><label><input type="radio" name={'product-'+group} checked={!activeCatalog.products.some(p=>productGroup(p)===group&&productIds.includes(p.id))} onChange={()=>setProductIds(prev=>prev.filter(id=>!activeCatalog.products.some(p=>p.id===id&&productGroup(p)===group)))}/> Automático</label><div className="astra-product-options">{activeCatalog.products.filter(p=>productGroup(p)===group).map(p=><label key={p.id}><input type="radio" name={'product-'+group} checked={productIds.includes(p.id)} onChange={()=>setProductIds(prev=>[...prev.filter(id=>!activeCatalog.products.some(item=>item.id===id&&productGroup(item)===group)),p.id].slice(0,16))}/>{p.image&&<img src={p.image} alt="" loading="lazy"/>}<span>{p.name}</span></label>)}</div></fieldset>)}</div><button className="astra-dialog-action" disabled={!!pending||saving||roomLoading||!status?.configured} onClick={()=>{catalogDialog.current?.close();void submit(undefined,composition,productIds);}}>Gerar com minhas escolhas</button></>:<div className="astra-catalog-empty"><Table2 size={32}/><h3>Aguardando sua tabela</h3><p>Os produtos e materiais deste moodboard ainda não estão disponíveis.</p></div>}</dialog>
    <dialog ref={zoomDialog} className="astra-zoom-dialog" onClose={()=>setZoomImage(null)}><button className="astra-zoom-close" aria-label="Fechar imagem" onClick={()=>zoomDialog.current?.close()}><X size={22}/></button>{zoomImage&&<img src={zoomImage} alt="Imagem ampliada"/>}</dialog>
  </div>;
}