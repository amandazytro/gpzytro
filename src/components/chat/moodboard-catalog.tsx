"use client";
import {useState} from 'react';
import {useMoodboardCatalog} from './use-moodboard-catalog';
import {referenceOrigin,referenceProvenance} from '../../domain/reference-products';
import './moodboard-catalog.css';
export function MoodboardCatalog(){
 const {data,error}=useMoodboardCatalog(),[room,setRoom]=useState(''),[search,setSearch]=useState(''),[origin,setOrigin]=useState('');
 if(!data)return <main className="pdf-catalog"><a href="/instances">← Voltar às instâncias</a><p role={error?'alert':'status'}>{error||'Carregando referências…'}</p></main>;
 const currentAssignments=data.assignments.filter(a=>!room||a.roomId===room);
 const products=data.products.filter(p=>(!room||!p.roomIds?.length||p.roomIds.includes(room))&&(!origin||p.sourceKind===origin)&&[p.id,p.name,p.group].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
 return <main className="pdf-catalog">
  <header><a href="/instances">← Voltar às instâncias</a><small>REFERÊNCIAS DO PROJETO</small><h1>Móveis da planta</h1><p>Capturas, PDF atual e modelos fictícios criados do zero, relacionados às posições da planta.</p></header>
  <div className="pdf-catalog-stats"><span><strong>{data.products.length}</strong> referências</span><span><strong>{data.summary.instances}</strong> instâncias na planta</span><span><strong>{data.captures.length}</strong> capturas</span></div>
  <p className="pdf-catalog-state">{data.externalDelivery==='authorized'?'Referências conectadas à API. Cada geração usa os vínculos atuais da planta.':'Prévia local. Integração externa aguardando ativação.'}</p>
  {error&&<p role="alert">{error}</p>}
  <div className="pdf-catalog-filters">
   <label>Ambiente<select value={room} onChange={e=>setRoom(e.target.value)}><option value="">Todos os ambientes</option>{data.rooms.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
   <label>Origem<select value={origin} onChange={e=>setOrigin(e.target.value)}><option value="">Todas as referências</option><option value="capture">Capturas enviadas</option><option value="original">Criações fictícias</option><option value="pdf">PDF atual</option></select></label>
   <label>Buscar referência<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome ou código do móvel"/></label>
  </div>
  <p className="pdf-catalog-note">A planta define a quantidade e o contorno. Medidas comerciais são nominais. Fotos de conjuntos não acrescentam móveis. Criações fictícias não usam moodboards antigos.</p>
  <section className="pdf-catalog-grid" aria-label="Referências padronizadas">
   {products.map(p=>{
    const linked=currentAssignments.filter(a=>a.productId===p.id),pages=[...new Set(p.sourceOccurrences?.map(r=>r.page))],dims=p.sourceDimensions??{};
    return <article key={p.id} data-product-id={p.id}>
     <a href={p.image} target="_blank" rel="noreferrer" aria-label={'Ampliar '+p.name}><img src={p.image} alt={p.name} loading="lazy"/></a>
     <div><small>{referenceOrigin(p)} · {p.id}</small><h2>{p.name}</h2>
      <span className={'pdf-catalog-badge'+(p.finishStatus==='proposed'?' is-proposed':'')}>{p.sourceKind==='original'?'Modelo fictício original':p.finishStatus==='proposed'?'Adaptação proposta':'Acabamento da referência'}</span>
      <p>{p.standardizedFinish}</p>
      <p className="pdf-catalog-count">{linked.length?linked.length+' instâncias vinculadas':'Disponível · sem vínculo atual'}</p>
      <details><summary>Origem, posição e medidas</summary>
       <p>{referenceProvenance(p)}</p>
       {p.sourceQuantity!==undefined&&<p>Quantidade no documento: {p.sourceQuantity}; não limita a distribuição na planta.</p>}
       <p>Medidas nominais: {Object.entries(dims).map(([key,value])=>({widthMm:'L',depthMm:'P',heightMm:'A',diameterMm:'Ø',seatHeightMm:'Altura do assento',planterHeightMm:'Altura da jardineira'}[key]??key)+' '+value+' mm').join(' · ')||'não informadas'}</p>
       <p>{p.adaptationNotes}</p><p>Fabricante: {p.manufacturer}</p>
       {linked.map(a=><p key={a.instanceId}>{a.instanceCode} · {data.rooms.find(r=>r.id===a.roomId)?.name}</p>)}
       {p.sourceCapture?<a href={p.sourceCapture.url} target="_blank" rel="noreferrer">Ver captura original</a>:p.sourceKind==='pdf'&&data.source&&pages.length>0?<a href={data.source.url+'#page='+pages[0]} target="_blank" rel="noreferrer">Ver página no PDF</a>:null}
      </details>
     </div>
    </article>;
   })}
  </section>
  {!products.length&&<p role="status">Nenhuma referência corresponde aos filtros.</p>}
  <section className="pdf-catalog-sources"><h2>Referências do projeto</h2><p>Os limites refinados, a planta de teto e as cotas fornecidas orientam a compatibilização dos modelos.</p><div><a href={data.sources.floorplan.image} target="_blank" rel="noreferrer">Planta baixa</a><a href={data.sources.ceiling.image} target="_blank" rel="noreferrer">Planta de teto</a><a href={data.sources.dimensions.image} target="_blank" rel="noreferrer">Planta de medidas</a></div></section>
 </main>;
}
