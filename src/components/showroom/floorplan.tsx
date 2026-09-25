"use client";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import type { PlanDrawing, PlanPoint, ReferenceDocument, Room } from "@/domain/models";
import {usePlanAreas} from '../chat/use-plan-areas';
import {applyPlanAreas} from '../../domain/plan-areas';
import {LockKeyhole} from 'lucide-react';
import {isRoomLocked} from '../../domain/room-availability';
import { PlanFurniture } from "./plan-symbols";

export interface FloorplanProps {
  overlay?: ReactNode;
  rooms: Room[];
  drawing: PlanDrawing | null | undefined;
  image: ReferenceDocument | null;
  onOpenRoom: (room: Room) => void;
  /** Rooms that have design sets, shown with a subtle marker. */
  configuredRoomIds?: Set<unknown>;
  activeRoomId?: string | null;
  focusSelection?: boolean;
  focusImages?: { sharp: string; blurred: string };
  hoveredRoomId?: string | null;
  onHoverRoom?: (roomId: string | null) => void;
  variant?: "full" | "locator";
}

const pathOf = (points: PlanPoint[]) => "M" + points.map(p => p.join(" ")).join("L") + "Z";
export function polygonArea(points: PlanPoint[]) {
  let sum = 0;
  points.forEach(([x1, y1], i) => { const [x2, y2] = points[(i + 1) % points.length]; sum += x1 * y2 - x2 * y1; });
  return Math.abs(sum / 2);
}
function labelPoint(points: PlanPoint[]): PlanPoint {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}
function gapRect(from: PlanPoint, to: PlanPoint, thickness: number) {
  const x = Math.min(from[0], to[0]), y = Math.min(from[1], to[1]);
  const horizontal = from[1] === to[1];
  return horizontal
    ? { x, y: y - thickness / 2, width: Math.abs(to[0] - from[0]), height: thickness }
    : { x: x - thickness / 2, y, width: thickness, height: Math.abs(to[1] - from[1]) };
}

/**
 * The floorplan is the primary navigation. With a supplied floorplan image, rooms are mapped as polygons over it.
 * Without one, an illustrative vector plan (demo) is drawn. Architecture here is display-only and never editable.
 */
export function Floorplan({ rooms, drawing, image, onOpenRoom, configuredRoomIds, activeRoomId = null, focusSelection = false, focusImages, hoveredRoomId, onHoverRoom, variant = "full", overlay }: FloorplanProps) {
  const [localHover, setLocalHover] = useState<string | null>(null);
  const hovered = hoveredRoomId !== undefined ? hoveredRoomId : localHover;
  const setHover = (id: string | null) => { setLocalHover(id); onHoverRoom?.(id); };
  const maskId = useId().replace(/:/g, "");
  const locator = variant === "locator";

  const width = image?.previewImageUrl ? image.previewWidth ?? 1000 : drawing?.width ?? 1000;
  const height = image?.previewImageUrl ? image.previewHeight ?? 700 : drawing?.height ?? 700;
  const {areas}=usePlanAreas();
  const roomPolygons = applyPlanAreas(rooms,areas)
    .filter(room => room.planRegion?.points.length)
    .map(room => ({ room, points: room.planRegion!.points.map(p => [p.x * width, p.y * height] as PlanPoint), label: room.planLabel ? [room.planLabel.x * width, room.planLabel.y * height] as PlanPoint : null }));
  const pad = image?.previewImageUrl ? width * (locator ? .016 : .025) : locator ? 40 : 110;
  const unitsToMetres = drawing ? 0.01 : null;
  const focusedRoom = focusSelection && !locator ? roomPolygons.find(({ room }) => room.id === activeRoomId && !isRoomLocked(room.id)) : undefined;
  const [focusX, focusY] = focusedRoom ? labelPoint(focusedRoom.points) : [width / 2, height / 2];
  const focusScale = focusedRoom ? 1.14 : 1;

  const key = (room: Room) => (event: KeyboardEvent) => {
    if (isRoomLocked(room.id)) return;
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenRoom(room); }
  };

  return (
    <svg
      className={"floorplan " + (image?.previewImageUrl ? "has-plan-image " : "") + (locator ? "floorplan-locator" : "floorplan-full")}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      role="group"
      aria-label={locator ? "Floorplan locator" : "Planta do projeto — selecione um ambiente"}
    >
      <defs><clipPath id={maskId + '-focus'}>{focusedRoom && <path d={pathOf(focusedRoom.points)} />}</clipPath></defs>
      <g className="plan-focus-scene" style={{ transform: 'translate(' + focusX * (1 - focusScale) + 'px, ' + focusY * (1 - focusScale) + 'px) scale(' + focusScale + ')' }}>
      {image?.previewImageUrl && <>
        <image href={focusImages?.sharp ?? image.previewImageUrl} x={0} y={0} width={width} height={height} className="plan-image" />
        {focusSelection && <>
          <image href={focusImages?.blurred ?? image.previewImageUrl} x={0} y={0} width={width} height={height} className="plan-focus-background" style={{ opacity: focusedRoom ? 1 : 0, filter: focusImages ? undefined : 'blur(' + width * .0012 + 'px)' }} pointerEvents="none" />
          <image href={focusImages?.sharp ?? image.previewImageUrl} x={0} y={0} width={width} height={height} clipPath={'url(#' + maskId + '-focus)'} pointerEvents="none" />
        </>}
      </>}

      {/* Highlight wash sits beneath the linework. */}
      <g className="plan-washes">
        {roomPolygons.map(({ room, points }) => (
          <path key={room.id} d={pathOf(points)} className={"plan-wash" + (isRoomLocked(room.id) ? " is-locked" : "") + (hovered === room.id ? " is-hovered" : "") + (activeRoomId === room.id ? " is-active" : "")} />
        ))}
      </g>

      {drawing && !image?.previewImageUrl && (
        <>
          {!locator && <g className="plan-furniture">{drawing.furniture.map((symbol, i) => <PlanFurniture key={i} symbol={symbol} />)}</g>}
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-pad} y={-pad} width={width + pad * 2} height={height + pad * 2}>
            <rect x={-pad} y={-pad} width={width + pad * 2} height={height + pad * 2} fill="white" />
            {[...drawing.openings, ...drawing.windows, ...drawing.doors.map(d => ({ from: d.hinge, to: d.jamb }))].map((gap, i) => (
              <rect key={i} {...gapRect(gap.from, gap.to, 60)} fill="black" />
            ))}
          </mask>
          <g className="plan-walls" mask={locator ? undefined : `url(#${maskId})`}>
            {roomPolygons.map(({ room, points }) => <path key={room.id} d={pathOf(points)} className="wall-interior" />)}
            {drawing.circulation.map((c, i) => <path key={i} d={pathOf(c.polygon)} className="wall-interior" />)}
            <path d={pathOf(drawing.exterior)} className="wall-exterior" />
          </g>
          <g className="plan-windows">
            {drawing.windows.map((w, i) => {
              const horizontal = w.from[1] === w.to[1];
              const lines = [-13, 0, 13].map(o => horizontal ? `M${w.from[0]} ${w.from[1] + o}H${w.to[0]}` : `M${w.from[0] + o} ${w.from[1]}V${w.to[1]}`).join("");
              const caps = horizontal ? `M${w.from[0]} ${w.from[1] - 13}v26M${w.to[0]} ${w.to[1] - 13}v26` : `M${w.from[0] - 13} ${w.from[1]}h26M${w.to[0] - 13} ${w.to[1]}h26`;
              return <path key={i} d={lines + caps} />;
            })}
          </g>
          {!locator && (
            <g className="plan-doors">
              {drawing.doors.map((door, i) => {
                const [hx, hy] = door.hinge, vx = door.jamb[0] - hx, vy = door.jamb[1] - hy;
                const r = Math.hypot(vx, vy), ox = hx - vy * door.swing, oy = hy + vx * door.swing;
                const sweep = (ox - hx) * vy - (oy - hy) * vx > 0 ? 1 : 0;
                return <g key={i}><path d={`M${hx} ${hy}L${ox} ${oy}`} className="door-leaf" /><path d={`M${ox} ${oy}A${r} ${r} 0 0 ${sweep} ${door.jamb[0]} ${door.jamb[1]}`} className="door-swing" /></g>;
              })}
            </g>
          )}
          {!locator && drawing.circulation.map((c, i) => {
            const [x, y] = labelPoint(c.polygon.slice(0, 3));
            return <text key={i} x={x} y={y + 6} className="plan-label-minor">{c.label.toUpperCase()}</text>;
          })}
        </>
      )}

      {!locator && roomPolygons.map(({ room, points, label }, index) => {
        const [x, y] = label ?? labelPoint(points);
        const area = unitsToMetres ? polygonArea(points) * unitsToMetres * unitsToMetres : null;
        return (
          <g key={room.id} className={"plan-label" + (isRoomLocked(room.id) ? " is-locked" : "") + (hovered === room.id ? " is-hovered" : "")} transform={`translate(${x} ${y}) scale(${image?.previewImageUrl ? width / 2445 : 1})`}>
            {image?.previewImageUrl && <circle r={22} className="plan-room-number-bg" />}
            {isRoomLocked(room.id) ? <LockKeyhole x={-13} y={-14} width={26} height={26} className="plan-room-lock" aria-hidden="true"/> : <text y={image?.previewImageUrl ? 7 : -4} className="plan-label-name">{image?.previewImageUrl ? String(index + 1).padStart(2, "0") : room.name.toUpperCase()}</text>}
            {area !== null && <text y={24} className="plan-label-area">{area.toFixed(1)} m²</text>}
            {configuredRoomIds?.has(room.id) && <circle cy={48} r={4.5} className="plan-label-dot" />}
          </g>
        );
      })}

      {drawing && !locator && !image?.previewImageUrl && <PlanAnnotations width={width} height={height} />}

      {/* Interaction layer: the whole room is the target. */}
      <g className="plan-hits">
        {roomPolygons.map(({ room, points }) => (
          <path
            key={room.id}
            d={pathOf(points)}
            className={"plan-hit"+(isRoomLocked(room.id)?" is-locked":"")}
            role="button"
            tabIndex={isRoomLocked(room.id)?-1:0}
            aria-disabled={isRoomLocked(room.id)||undefined}
            aria-label={isRoomLocked(room.id)?room.name+" — área bloqueada":`Open ${room.name}`}
            aria-current={activeRoomId === room.id ? "page" : undefined}
            onPointerEnter={() => setHover(room.id)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(room.id)}
            onBlur={() => setHover(null)}
            onClick={() => {if(!isRoomLocked(room.id))onOpenRoom(room);}}
            onKeyDown={key(room)}
          >
            <title>{room.name}</title>
          </path>
        ))}
      </g>
      {!locator && overlay}
      </g>
    </svg>
  );
}

function PlanAnnotations({ width, height }: { width: number; height: number }) {
  const metres = (v: number) => (v / 100).toFixed(2);
  return (
    <g className="plan-annotations">
      <path d={`M0 -64V-44M${width} -64V-44M0 -54H${width}`} />
      <path d={`M-6 -60L6 -48M${width - 6} -60L${width + 6} -48`} />
      <text x={width / 2} y={-66} className="plan-dim">{metres(width)}</text>
      <path d={`M-64 0H-44M-64 ${height}H-44M-54 0V${height}`} />
      <path d={`M-60 -6L-48 6M-60 ${height - 6}L-48 ${height + 6}`} />
      <text x={-66} y={height / 2} className="plan-dim" transform={`rotate(-90 -66 ${height / 2})`}>{metres(height)}</text>
      <g transform={`translate(${width + 62} ${height - 30})`}>
        <circle r={22} className="plan-north-ring" />
        <path d="M0 -18L7 8L0 3L-7 8Z" className="plan-north" />
        <text y={-30} className="plan-dim">N</text>
      </g>
      <g transform={`translate(0 ${height + 62})`}>
        <path d="M0 0H100M0 -6V6M50 -4V4M100 -6V6" />
        <text x={0} y={30} className="plan-dim plan-dim-start">0</text>
        <text x={100} y={30} className="plan-dim">1 m</text>
      </g>
    </g>
  );
}
