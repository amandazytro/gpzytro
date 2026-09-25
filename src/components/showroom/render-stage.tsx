"use client";
import type { RoomRender } from '@/domain/models';
import type { RoomView } from '@/services/application';
import { SchematicRender } from './schematic-render';
export function RenderStage({roomView,latest,rendering,onGenerate,providerConnected}:{
  roomView:RoomView; renders:RoomRender[]; latest:RoomRender|null; rendering:boolean;pendingChanges:number;onGenerate:()=>void;providerConnected:boolean;
}) {
  return <section className="stage" aria-label={`${roomView.room.name} render`}>
    <div className={'stage-frame'+(rendering?' is-rendering':'')} aria-busy={rendering}>
      {latest?.imageUrl&&!latest.isPlaceholder
        ? <img className="stage-image" src={latest.imageUrl} alt={`Perspectiva de ${roomView.room.name}`} />
        : <SchematicRender roomKind={roomView.room.kind} assets={latest?.assetSnapshot??[]} moodboards={roomView.moodboards} muted={!latest} />}
      {!latest&&!rendering&&<div className="stage-empty"><h2>Perspectiva ainda não disponível</h2><button className="button-primary" onClick={onGenerate}>Gerar perspectiva</button></div>}
      {rendering&&<div className="stage-progress" role="status"><span className="progress-line" /><p>{providerConnected?'Preparando perspectiva…':'Preparando visualização…'}</p></div>}
    </div>
  </section>;
}