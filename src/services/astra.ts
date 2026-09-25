import type { Asset, Moodboard } from "../domain/models";
import { elementKey, setLabel, setNumber } from "../domain/catalog";

/**
 * Astra command layer.
 *
 * Today: a small rule-based parser (no AI) that turns phrases such as
 * "use the sofa from Set 2" or "keep the sofa but use the rug from Set 3" into structured intents.
 * Later: a conversational model replaces `parseAstraCommand` and emits the same `AstraIntent`s.
 * Resolution against the approved catalog stays deterministic either way, so Astra can never
 * select something that is not approved for this room, and can never touch the architecture.
 */
export type AstraIntent =
  | { type: "use_from_set"; element: string; set: number }
  | { type: "change"; element: string }
  | { type: "keep"; element: string }
  | { type: "remove"; element: string }
  | { type: "architecture"; text: string }
  | { type: "unknown"; text: string };

export type AstraResolution =
  | { kind: "select"; element: string; assetId: string; message: string }
  | { kind: "clear"; element: string; message: string }
  | { kind: "keep"; element: string; message: string }
  | { kind: "clarify"; element: string | null; message: string; options: { assetId: string; label: string }[] }
  | { kind: "reject"; message: string };

/** Approved catalog for one room. */
export interface AstraRoomCatalog { moodboards: Moodboard[]; assets: Asset[] }

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, first: 1, second: 2, third: 3 };
const LOCKED_TERMS = /\b(walls?|doors?|windows?|ceilings?|columns?|beams?|structure|structural|joinery|layout|room size|dimensions?|move the|enlarge|demolish)\b/;

function elementsIn(catalog: AstraRoomCatalog) {
  const names = new Map<string, string>();
  for (const asset of catalog.assets) names.set(elementKey(asset), asset.element.toLowerCase());
  // Longest names first so "coffee table" wins over "table".
  return [...names.entries()].sort((a, b) => b[1].length - a[1].length);
}

export function parseAstraCommand(text: string, catalog: AstraRoomCatalog): AstraIntent[] {
  const normalized = text.toLowerCase().replace(/^\s*(hey\s+)?astra[,:]?\s*/, "").trim();
  if (!normalized) return [];
  const elements = elementsIn(catalog);
  const clauses = normalized.split(/\s*(?:[,;.]|\bbut\b|\band then\b|\bthen\b|\band\b)\s*/).filter(Boolean);
  const intents: AstraIntent[] = [];
  for (const clause of clauses) {
    const match = elements.find(([, name]) => new RegExp(`\\b${name.replace(/\s+/g, "\\s+")}s?\\b`).test(clause));
    if (!match) {
      intents.push(LOCKED_TERMS.test(clause) ? { type: "architecture", text: clause } : { type: "unknown", text: clause });
      continue;
    }
    const element = match[0];
    const set = clause.match(/\b(?:set|moodboard|option)\s*(\d+|one|two|three|four|five|six)\b/) ?? clause.match(/\b(first|second|third)\s+(?:set|moodboard)\b/);
    if (/\b(remove|without|take away|clear|get rid of|no)\b/.test(clause)) intents.push({ type: "remove", element });
    else if (/\bkeep\b/.test(clause) && !set) intents.push({ type: "keep", element });
    else if (set) intents.push({ type: "use_from_set", element, set: NUMBER_WORDS[set[1]] ?? Number(set[1]) });
    else intents.push({ type: "change", element });
  }
  return intents;
}

export function resolveAstraIntents(catalog: AstraRoomCatalog, selectedByElement: Record<string, string>, intents: AstraIntent[]): AstraResolution[] {
  const selection = { ...selectedByElement };
  const label = (asset: Asset) => `${asset.referenceName} · ${setLabel(catalog, asset.moodboardId)}`;
  const elementName = (key: string) => catalog.assets.find(a => elementKey(a) === key)?.element ?? key;
  const results: AstraResolution[] = [];

  for (const intent of intents) {
    if (intent.type === "architecture") {
      results.push({ kind: "reject", message: "The architecture is locked — walls, doors, windows, dimensions and ceilings follow the floorplan. I can change furniture, materials, finishes and lighting." });
      continue;
    }
    if (intent.type === "unknown") {
      results.push({ kind: "reject", message: `I couldn't match “${intent.text}” to an approved element in this room.` });
      continue;
    }
    const candidates = catalog.assets.filter(a => a.approved && elementKey(a) === intent.element);
    const name = elementName(intent.element);
    if (intent.type === "keep") { results.push({ kind: "keep", element: intent.element, message: `Keeping the current ${name.toLowerCase()}.` }); continue; }
    if (intent.type === "remove") {
      if (!selection[intent.element]) results.push({ kind: "keep", element: intent.element, message: `No ${name.toLowerCase()} is selected.` });
      else { delete selection[intent.element]; results.push({ kind: "clear", element: intent.element, message: `Removed the ${name.toLowerCase()}.` }); }
      continue;
    }
    let chosen: Asset | undefined;
    if (intent.type === "use_from_set") {
      chosen = candidates.find(a => setNumber(catalog, a.moodboardId) === intent.set);
      if (!chosen) {
        results.push({ kind: "clarify", element: intent.element, message: `There is no approved ${name.toLowerCase()} in Set ${String(intent.set).padStart(2, "0")}.`, options: candidates.map(a => ({ assetId: a.id, label: label(a) })) });
        continue;
      }
    } else {
      const others = candidates.filter(a => a.id !== selection[intent.element]);
      if (others.length !== 1) {
        results.push(others.length
          ? { kind: "clarify", element: intent.element, message: `Which ${name.toLowerCase()} would you like?`, options: others.map(a => ({ assetId: a.id, label: label(a) })) }
          : { kind: "reject", message: `There are no other approved options for the ${name.toLowerCase()}.` });
        continue;
      }
      chosen = others[0];
    }
    const conflicts = Object.entries(selection)
      .filter(([key]) => key !== intent.element)
      .map(([, id]) => catalog.assets.find(a => a.id === id))
      .filter((a): a is Asset => !!a && a.moodboardId !== chosen!.moodboardId && (!a.canBeMixed || !chosen!.canBeMixed));
    if (conflicts.length) {
      results.push({ kind: "reject", message: `${label(chosen)} can't be combined with items from other sets.` });
      continue;
    }
    selection[intent.element] = chosen.id;
    results.push({ kind: "select", element: intent.element, assetId: chosen.id, message: `${name} → ${label(chosen)}.` });
  }
  return results;
}
