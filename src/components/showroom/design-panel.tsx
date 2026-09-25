"use client";
import { useMemo, useState } from "react";
import { Check, Info } from "lucide-react";
import type { Asset } from "@/domain/models";
import { elementKey, setLabel } from "@/domain/catalog";
import type { RoomView } from "@/services/application";
import { AssetVisual } from "./asset-visual";
import { AssetSheet } from "./asset-sheet";

export function DesignPanel({ roomView, selected, isDemo, disabled, onToggle }: {
  roomView: RoomView; selected: Record<string, string>; isDemo: boolean; disabled: boolean; onToggle: (assetId: string) => void;
}) {
  const [focusSet, setFocusSet] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<Asset | null>(null);
  const boards = useMemo(() => [...roomView.moodboards].sort((a, b) => (a.optionNumber ?? a.name).localeCompare(b.optionNumber ?? b.name)), [roomView.moodboards]);

  // Category → element → assets (ordered by set).
  const groups = useMemo(() => {
    const order = (a: Asset) => boards.findIndex(b => b.id === a.moodboardId);
    const byCategory = new Map<string, Map<string, Asset[]>>();
    for (const asset of [...roomView.assets].sort((a, b) => order(a) - order(b))) {
      const elements = byCategory.get(asset.category) ?? new Map<string, Asset[]>();
      const key = elementKey(asset);
      elements.set(key, [...(elements.get(key) ?? []), asset]);
      byCategory.set(asset.category, elements);
    }
    return [...byCategory.entries()];
  }, [roomView.assets, boards]);

  const paletteOf = (asset: Asset) => roomView.moodboards.find(b => b.id === asset.moodboardId)?.palette;

  return (
    <aside className="design-panel" aria-label="Design configuration">
      <header className="panel-head">
        <span className="eyebrow">Design</span>
        {isDemo && <span className="demo-tag">Demo catalog</span>}
      </header>

      <section className="panel-section">
        <div className="section-title"><h3>Moodboards</h3>{boards.length > 0 && <span>{boards.length} sets</span>}</div>
        {!boards.length ? (
          <p className="panel-empty">No moodboards have been added for this room.</p>
        ) : (
          <>
            <div className="set-row">
              {boards.map(board => {
                const count = roomView.assets.filter(a => a.moodboardId === board.id).length;
                const active = focusSet === board.id;
                return (
                  <button key={board.id} className={"set-card" + (active ? " is-focused" : "")} aria-pressed={active} onClick={() => setFocusSet(active ? null : board.id)}>
                    <span className="set-swatch" aria-hidden="true">
                      {(board.palette?.length ? board.palette : ["#d9d4ca", "#ebe7df", "#bdb7ac", "#8b877e"]).slice(0, 4).map((c, i) => <i key={i} style={{ background: c }} />)}
                    </span>
                    <span className="set-name">{setLabel(roomView, board.id)}</span>
                    <span className="set-meta">{count} {count === 1 ? "piece" : "pieces"}</span>
                  </button>
                );
              })}
            </div>
            <p className="panel-hint">{focusSet ? `Highlighting pieces from ${setLabel(roomView, focusSet)}. Nothing is applied until you choose a piece.` : "Sets are sources, not packages — choose each piece individually and mix freely."}</p>
          </>
        )}
      </section>

      {boards.length > 0 && !roomView.assets.length && <p className="panel-empty">No approved assets available.</p>}

      {groups.map(([category, elements]) => (
        <section key={category} className="panel-section">
          <div className="section-title"><h3>{category}</h3></div>
          {[...elements.entries()].map(([key, assets]) => {
            const chosen = assets.find(a => a.id === selected[key]);
            return (
              <div key={key} className="element">
                <div className="element-head">
                  <h4>{assets[0].element}</h4>
                  <span className={chosen ? "element-choice" : "element-choice is-empty"}>{chosen ? setLabel(roomView, chosen.moodboardId) : "Not selected"}</span>
                </div>
                <ul className="asset-row">
                  {assets.map(asset => {
                    const isSelected = selected[key] === asset.id;
                    const dimmed = focusSet !== null && asset.moodboardId !== focusSet;
                    return (
                      <li key={asset.id} className={"asset-tile" + (isSelected ? " is-selected" : "") + (dimmed ? " is-dimmed" : "")}>
                        <button className="asset-pick" disabled={disabled} aria-pressed={isSelected} onClick={() => onToggle(asset.id)} aria-label={`${asset.referenceName}, ${setLabel(roomView, asset.moodboardId)}${isSelected ? ", selected" : ""}`}>
                          <span className="asset-image">
                            <AssetVisual asset={asset} palette={paletteOf(asset)} isDemo={isDemo} />
                            {isSelected && <span className="asset-check"><Check size={11} strokeWidth={2.4} /></span>}
                          </span>
                          <span className="asset-name">{asset.referenceName}</span>
                          <span className="asset-set">{setLabel(roomView, asset.moodboardId)}</span>
                        </button>
                        <button className="asset-info" onClick={() => setInspecting(asset)} aria-label={`About ${asset.referenceName}`}><Info size={12} strokeWidth={1.6} /></button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ))}

      {inspecting && <AssetSheet asset={inspecting} roomView={roomView} isDemo={isDemo} selected={selected[elementKey(inspecting)] === inspecting.id} onToggle={() => { onToggle(inspecting.id); setInspecting(null); }} onClose={() => setInspecting(null)} />}
    </aside>
  );
}
