"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { WorkspaceMode } from "@/services/browser";
import { Floorplan, polygonArea } from "./floorplan";
import { RenderStage } from "./render-stage";
import { MoodboardPicker } from "./moodboard-picker";
import { useShowroom, type Showroom as ShowroomState } from "./use-showroom";

export function Showroom({ mode }: { mode: WorkspaceMode }) {
  const s = useShowroom(mode);
  const isDemo = !!s.residence?.project?.isDemo;

  return (
    <div className={"showroom" + (s.roomView ? " is-room" : "")}>
      <TopBar s={s} isDemo={isDemo} />
      {s.notice && <p className="notice" role="status">{s.notice}</p>}
      {s.loadError ? (
        <EmptyScene title="The project could not be opened." text={s.loadError} />
      ) : s.loading ? (
        <div className="loading" role="status"><span>Opening residence</span></div>
      ) : !s.residence?.project ? (
        <EmptyScene
          eyebrow="GPZytro"
          title="No project has been connected yet."
          text="When a project’s floorplans, moodboards and approved catalog are connected, the residence opens here."
          action={mode === "real" ? <Link className="button-secondary" href="/demo">Explore the demo residence</Link> : null}
        />
      ) : s.roomId && s.roomView ? (
        <RoomScreen s={s} isDemo={isDemo} />
      ) : s.roomId ? (
        <div className="loading" role="status"><span>Opening room</span></div>
      ) : (
        <FloorplanScreen s={s} isDemo={isDemo} />
      )}
    </div>
  );
}

function TopBar({ s, isDemo }: { s: ShowroomState; isDemo: boolean }) {
  const r = s.residence;
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link href={isDemo ? "/demo" : "/"} className="wordmark" aria-label="GPZytro — back to floorplan">GPZytro</Link>
        {s.roomView && (
          <button className="back-button" onClick={s.closeRoom}><ArrowLeft size={14} strokeWidth={1.5} /> Floorplan</button>
        )}
        {r?.project && s.roomView && <span className="crumbs">{r.building?.name} <i>/</i> {r.unit?.name} <i>/</i> {r.layout?.name}</span>}
      </div>
      <div className="topbar-right">
        {isDemo && <span className="demo-pill" title="Illustrative data only — no real products, files or project drawings">Demo</span>}
        {isDemo && <button className="quiet-button" onClick={s.resetDemo}><RotateCcw size={12} strokeWidth={1.6} /> Reset demo</button>}
        {isDemo && <Link className="quiet-button" href="/">Exit demo</Link>}
      </div>
    </header>
  );
}

function FloorplanScreen({ s, isDemo }: { s: ShowroomState; isDemo: boolean }) {
  const r = s.residence!;
  const [hovered, setHovered] = useState<string | null>(null);
  const drawing = r.layout?.illustrativePlan;
  const hasPlan = !!(r.floorplan?.previewImageUrl || drawing);
  const area = (points: { x: number; y: number }[]) => drawing ? polygonArea(points.map(p => [p.x * drawing.width, p.y * drawing.height])) / 10000 : null;

  return (
    <main className="floor-screen">
      <div className="floor-intro">
        <div>
          <span className="eyebrow">{[r.building?.name, r.floor?.name].filter(Boolean).join(" · ")}</span>
          <h1>{r.unit?.name ?? "Unit not available"}</h1>
        </div>
        {r.layouts.length > 0 && (
          <nav className="layout-switch" aria-label="Layouts">
            {r.layouts.map(layout => (
              <button key={layout.id} aria-pressed={layout.id === r.layout?.id} onClick={() => s.selectLayout(layout.id)}>{layout.name}</button>
            ))}
          </nav>
        )}
      </div>

      {!r.layout ? (
        <EmptyScene compact title="Floorplan not available." text="No layouts have been connected for this unit yet." />
      ) : (
        <>
          <div className="plan-stage" key={r.layout.id}>
            {hasPlan && r.rooms.length ? (
              <Floorplan rooms={r.rooms} drawing={drawing} image={r.floorplan} onOpenRoom={s.openRoom} configuredRoomIds={r.configuredRoomIds} hoveredRoomId={hovered} onHoverRoom={setHovered} />
            ) : (
              <EmptyScene compact title="Floorplan not available." text={r.rooms.length ? "Rooms can still be opened from the list below." : "No rooms have been mapped for this layout yet."} />
            )}
          </div>
          <div className="floor-foot">
            {r.floorplan?.storageReference && <a className="quiet-button" href={r.floorplan.storageReference} target="_blank" rel="noreferrer">Abrir PDF original</a>}
            <ul className="room-index" aria-label="Rooms">
              {r.rooms.map(room => {
                const m2 = room.planRegion ? area(room.planRegion.points) : null;
                return (
                  <li key={room.id}>
                    <button className={hovered === room.id ? "is-hovered" : ""} onPointerEnter={() => setHovered(room.id)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(room.id)} onBlur={() => setHovered(null)} onClick={() => s.openRoom(room)}>
                      <span>{r.floorplan && <small>{String(r.rooms.indexOf(room) + 1).padStart(2, "0")} ? </small>}{room.name}</span>
                      {m2 !== null && <small>{m2.toFixed(1)} m²</small>}
                      {r.configuredRoomIds.has(room.id) && <i className="dot" title="Design sets available" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="floor-note">
              {drawing && !r.floorplan ? (isDemo ? "Demo · illustrative plan, not project drawings" : "Illustrative plan") : "Clique em um ambiente para ver sua perspectiva"}
              {r.configuredRoomIds.size > 0 && <><i className="dot" /> Design sets available</>}
            </p>
          </div>
        </>
      )}
    </main>
  );
}

function RoomScreen({ s }: { s: ShowroomState; isDemo: boolean }) {
  const r = s.residence!, room = s.roomView!, d = s.derived!;
  return <main className="room-screen room-compositions" key={room.room.id}>
    <div className="room-main">
      <div className="room-title"><div><span className="eyebrow">Ambiente {String(r.rooms.findIndex(item=>item.id===room.room.id)+1).padStart(2,'0')} · {r.layout?.name}</span><h1>{room.room.name}</h1></div>
        {r.layout&&<div className="locator"><Floorplan variant="locator" rooms={r.rooms} drawing={r.layout.illustrativePlan} image={r.floorplan} activeRoomId={room.room.id} onOpenRoom={s.openRoom}/></div>}
      </div>
      <RenderStage key={room.room.id} roomView={room} renders={d.renders} latest={d.latest} rendering={s.busy==='rendering'} pendingChanges={d.changes.length} onGenerate={s.render} providerConnected={s.imageProviderConnected}/>
      <MoodboardPicker roomView={room} disabled={s.busy!==null} onChoose={s.chooseMoodboard}/>
      {s.actionError&&<p role="alert" className="panel-error">{s.actionError}</p>}
    </div>
  </main>;
}

function EmptyScene({ eyebrow, title, text, action, compact = false }: { eyebrow?: string; title: string; text?: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <section className={"empty-scene" + (compact ? " is-compact" : "")}>
      <svg className="empty-lines" viewBox="0 0 400 260" aria-hidden="true">
        <path d="M20 20H380V240H20Z M20 130H150M210 130H380M230 20V100M230 160V240" />
        <path d="M150 130A60 60 0 0 1 210 70" className="thin" />
      </svg>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </section>
  );
}
