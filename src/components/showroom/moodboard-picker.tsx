"use client";
import type { RoomView } from '@/services/application';
export function MoodboardPicker({roomView,disabled,onChoose}:{roomView:RoomView;disabled:boolean;onChoose:(id:string)=>void}) {
  const boards=roomView.moodboards.filter(b=>b.previewImageUrl);
  if(!boards.length)return null;
  const selected=roomView.configuration?.moodboardId??boards[0]?.id;
  const active=boards.find(b=>b.id===selected);
  return <section className="composition-picker" aria-label="Composições do ambiente">
    <div className="composition-options">
      {boards.map(board=><button key={board.id} type="button" className={'composition-card'+(board.id===selected?' is-selected':'')} aria-label={board.name} aria-pressed={board.id===selected} disabled={disabled} onClick={()=>onChoose(board.id)}>
        <img src={board.previewImageUrl!} alt="" loading="eager" />
        <span className="composition-card-title">{board.name}<span className="composition-radio" aria-hidden="true" /></span>
        <span className="composition-description">{board.description}</span>
        <span className="composition-palette" aria-hidden="true">{board.palette?.map(c=><i key={c} style={{background:c}} />)}</span>
      </button>)}
    </div>
    {active?.composition&&<div className="composition-details"><p>O conjunto completo inclui</p><ul>{active.composition.map(item=><li key={item.element}><strong>{item.element}</strong><span>{item.description}</span></li>)}</ul></div>}
  </section>;
}