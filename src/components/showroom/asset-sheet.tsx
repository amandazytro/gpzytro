"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Asset } from "@/domain/models";
import { setLabel } from "@/domain/catalog";
import type { RoomView } from "@/services/application";
import { AssetVisual } from "./asset-visual";

/** Reference detail. The client sees the image and set; provenance is available but quiet. */
export function AssetSheet({ asset, roomView, isDemo, selected, onToggle, onClose }: {
  asset: Asset; roomView: RoomView; isDemo: boolean; selected: boolean; onToggle: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  const board = roomView.moodboards.find(b => b.id === asset.moodboardId);
  const pdf = roomView.documents.find(d => d.id === asset.sourcePdfId);
  const provenance: [string, string | number | null][] = [
    ["Set", setLabel(roomView, asset.moodboardId)],
    ["Moodboard", board ? `${board.name} · ${board.id}` : asset.moodboardId],
    ["Source document", pdf?.fileName ?? asset.sourcePdfName],
    ["Page", asset.referencePage],
    ["Finish / material", asset.finishMaterial],
    ["Colour", asset.colour],
    ["Asset ID", asset.id],
  ];

  return (
    <dialog ref={ref} className="sheet" aria-label={asset.referenceName} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-body">
        <button className="sheet-close" onClick={onClose} aria-label="Close"><X size={16} strokeWidth={1.5} /></button>
        <div className="sheet-visual"><AssetVisual asset={asset} palette={board?.palette} isDemo={isDemo} /></div>
        <div className="sheet-text">
          <span className="eyebrow">{asset.category} · {asset.element}</span>
          <h2>{asset.referenceName}</h2>
          {isDemo && <p className="sheet-demo">Demo illustration — not a real product or reference.</p>}
          <dl>
            {provenance.filter(([, v]) => v !== null && v !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <button className={selected ? "button-secondary" : "button-primary"} onClick={onToggle}>{selected ? "Remove from room" : "Use in this room"}</button>
        </div>
      </div>
    </dialog>
  );
}
