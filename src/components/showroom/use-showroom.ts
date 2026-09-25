"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EditRoomRenderAction, Room, RoomRender } from "@/domain/models";
import { elementKey, selectedAssetsByElement } from "@/domain/catalog";
import { blankConfiguration, loadResidence, loadRoom, type ApplicationServices, type ResidenceView, type RoomView } from "@/services/application";
import { createBrowserServices, resetBrowserWorkspace, type WorkspaceMode } from "@/services/browser";
import { parseAstraCommand, resolveAstraIntents, type AstraResolution } from "@/services/astra";
import type { GeneratedRender } from "@/services/render-provider";

export interface AstraExchange { id: number; request: string; results: AstraResolution[] }

const asGenerated = (render: RoomRender): GeneratedRender => ({ ...render, message: "" });
const errorText = (reason: unknown) => reason instanceof Error ? reason.message : "Something went wrong. Please try again.";

export function useShowroom(mode: WorkspaceMode) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const layoutParam = params.get("layout"), roomParam = params.get("room"), unitParam = params.get("unit");

  const [services, setServices] = useState<ApplicationServices | null>(null);
  const [notice, setNotice] = useState("");
  const [residence, setResidence] = useState<ResidenceView | null>(null);
  const [roomView, setRoomView] = useState<RoomView | null>(null);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<"selecting" | "rendering" | null>(null);
  const [actionError, setActionError] = useState("");
  const [astra, setAstra] = useState<AstraExchange[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const created = createBrowserServices(mode);
    setServices(created.services); setNotice(created.notice);
    return () => abort.current?.abort();
  }, [mode]);

  useEffect(() => {
    if (!services) return;
    let live = true;
    loadResidence(services.repository, unitParam, layoutParam)
      .then(next => { if (live) { setResidence(next); setLoadError(""); } })
      .catch(reason => { if (live) setLoadError(errorText(reason)); });
    return () => { live = false; };
  }, [services, unitParam, layoutParam, revision]);

  const roomId = residence?.rooms.some(r => r.id === roomParam) ? roomParam : null;
  useEffect(() => {
    if (!services || !residence || !roomId) { setRoomView(null); return; }
    let live = true;
    loadRoom(services.repository, residence, roomId)
      .then(next => { if (live) setRoomView(next); })
      .catch(reason => { if (live) setLoadError(errorText(reason)); });
    return () => { live = false; };
  }, [services, residence, roomId]);

  const navigate = useCallback((next: { layout?: string | null; room?: string | null }) => {
    const query = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) v ? query.set(k, v) : query.delete(k);
    const qs = query.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  const openRoom = useCallback((room: Room) => {
    setActionError(""); setAstra([]);
    router.push("/?room=" + encodeURIComponent(room.id));
  }, [navigate]);
  const closeRoom = useCallback(() => { setActionError(""); setAstra([]); navigate({ room: null }); }, [navigate]);
  const selectLayout = useCallback((layoutId: string) => navigate({ layout: layoutId, room: null }), [navigate]);

  const reloadRoom = useCallback(async () => {
    if (!services || !residence || !roomId) return;
    setRoomView(await loadRoom(services.repository, residence, roomId));
  }, [services, residence, roomId]);

  // Derived configuration state.
  const derived = useMemo(() => {
    if (!roomView) return null;
    const selected = selectedAssetsByElement(roomView, roomView.configuration);
    const renders = [...roomView.renders].sort((a, b) => Number(b.id.startsWith("PREVIEW_V1_")) - Number(a.id.startsWith("PREVIEW_V1_")) || a.createdAt.localeCompare(b.createdAt));
    const latest = renders.at(-1) ?? null;
    const rendered = latest ? selectedAssetsByElement({ assets: latest.assetSnapshot }, latest.configurationSnapshot) : {};
    const keys = new Set([...Object.keys(selected), ...Object.keys(rendered)]);
    const changes: EditRoomRenderAction[] = [...keys]
      .filter(k => selected[k] !== rendered[k])
      .map(k => ({ action: "edit_room_render", room: roomView.room.id, layout: roomView.room.layoutId, element: k, asset: selected[k] ?? null, previous_asset: rendered[k] ?? null }));
    const elements = new Set(roomView.assets.map(elementKey));
    const sets = new Set(Object.values(selected).map(id => roomView.assets.find(a => a.id === id)?.moodboardId));
    return { selected, renders, latest, changes, elementCount: elements.size, setCount: sets.size };
  }, [roomView]);

  const toggleAsset = useCallback(async (assetId: string, toggle = true) => {
    if (!services || !roomView) return;
    setBusy("selecting"); setActionError("");
    try { await services.applyAssetToggle(roomView.room.id, roomView.room.layoutId, assetId, toggle); await reloadRoom(); }
    catch (reason) { setActionError(errorText(reason)); }
    finally { setBusy(null); }
  }, [services, roomView, reloadRoom]);

  const render = useCallback(async () => {
    if (!services || !roomView || !derived) return;
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    setBusy("rendering"); setActionError("");
    try {
      if (!roomView.configuration) await services.saveConfiguration(blankConfiguration(roomView.room.id, roomView.room.layoutId));
      const source = derived.latest && !derived.latest.isPlaceholder && derived.latest.imageUrl ? asGenerated(derived.latest) : undefined;
      const summary = derived.changes.map(c => `${c.element}: ${c.previous_asset ?? "none"} → ${c.asset ?? "none"}`).join("; ");
      await services.generate(source ? "edit" : "base", roomView.room.id, source ? `Apply configuration changes. ${summary}` : "Base room render from the floorplan and architectural documentation.", source, 1, controller.signal, derived.changes);
      if (!controller.signal.aborted) await reloadRoom();
    } catch (reason) {
      if (!controller.signal.aborted) setActionError(errorText(reason));
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }, [services, roomView, derived, reloadRoom]);

  const chooseMoodboard = useCallback(async (id: string) => {
    if (!services || !roomView || busy) return;
    setBusy('selecting'); setActionError('');
    try { await services.repository.selectRoomMoodboard(roomView.room.id, id); await reloadRoom(); }
    catch (reason) { setActionError(errorText(reason)); }
    finally { setBusy(null); }
  }, [services, roomView, busy, reloadRoom]);

  const askAstra = useCallback(async (text: string) => {
    if (!services || !roomView || !derived || !text.trim()) return;
    const catalog = { moodboards: roomView.moodboards, assets: roomView.assets };
    const results = resolveAstraIntents(catalog, derived.selected, parseAstraCommand(text, catalog));
    const exchange: AstraExchange = { id: Date.now(), request: text.trim(), results: results.length ? results : [{ kind: "reject", message: "Tell me which element to change, for example “use the rug from Set 3”." }] };
    setAstra(items => [...items.slice(-3), exchange]);
    const changes = results.filter(r => r.kind === "select" || r.kind === "clear");
    if (!changes.length) return;
    setBusy("selecting"); setActionError("");
    try {
      for (const change of changes) {
        if (change.kind === "select") await services.applyAssetToggle(roomView.room.id, roomView.room.layoutId, change.assetId, false);
        else if (change.kind === "clear" && derived.selected[change.element]) await services.applyAssetToggle(roomView.room.id, roomView.room.layoutId, derived.selected[change.element], true);
      }
      await reloadRoom();
    } catch (reason) { setActionError(errorText(reason)); }
    finally { setBusy(null); }
  }, [services, roomView, derived, reloadRoom]);

  const resetDemo = useCallback(() => {
    resetBrowserWorkspace(mode);
    const created = createBrowserServices(mode);
    setServices(created.services); setRoomView(null); setAstra([]); setRevision(r => r + 1);
    navigate({ room: null, layout: null });
  }, [mode, navigate]);

  return {
    loading: !residence && !loadError, loadError, notice, residence, roomId, roomView, derived,
    busy, actionError, astra, imageProviderConnected: services?.imageGeneration.generatesImages ?? false,
    openRoom, closeRoom, selectLayout, toggleAsset, render, chooseMoodboard, askAstra, resetDemo, clearError: () => setActionError(""),
  };
}
export type Showroom = ReturnType<typeof useShowroom>;
