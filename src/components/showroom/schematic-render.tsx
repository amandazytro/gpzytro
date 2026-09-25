import type { Asset, Moodboard } from "@/domain/models";
import { elementKey } from "@/domain/catalog";

/**
 * Schematic perspective used while no image provider is connected.
 * It is a line sketch driven by the configuration snapshot — deliberately not photographic,
 * and always presented with a "placeholder" label.
 */
export function SchematicRender({ roomKind, assets, moodboards, muted = false }: { roomKind: string; assets: Asset[]; moodboards: Moodboard[]; muted?: boolean }) {
  // Match whole words of the element key: "bed" must not match "bedside_lamp".
  const matches = (a: Asset, word: string) => elementKey(a).split("_").includes(word);
  const tone = (element: string, index: number, fallback: string) => {
    const asset = assets.find(a => matches(a, element));
    if (!asset) return null;
    return moodboards.find(b => b.id === asset.moodboardId)?.palette?.[index] ?? fallback;
  };
  const has = (element: string) => assets.some(a => matches(a, element));
  const wall = tone("wall", 1, "#e4e0d8") ?? "#efece6";
  const floor = tone("floor", 0, "#cbc4b8") ?? "#e6e2da";
  const bedroom = roomKind === "bedroom";
  const ink = "#3a3834";

  const planks = [];
  for (let i = 1; i < 14; i++) {
    const x = (i / 14) * 1600;
    planks.push(<path key={i} d={`M${x} 1000L${460 + (x / 1600) * 680} 690`} />);
  }

  return (
    <svg className={"schematic" + (muted ? " is-muted" : "")} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke={ink} strokeWidth="1.4" strokeLinejoin="round">
        {/* Locked architecture: shell, window, door, ceiling. */}
        <path d="M0 0L460 250H1140L1600 0Z" fill="#f6f4ef" />
        <path d="M0 0L460 250V690L0 1000Z" fill={wall} style={{ filter: "brightness(.96)" }} />
        <path d="M1600 0L1140 250V690L1600 1000Z" fill={wall} style={{ filter: "brightness(.92)" }} />
        <rect x="460" y="250" width="680" height="440" fill={wall} />
        <path d="M0 1000H1600L1140 690H460Z" fill={floor} />
        {has("floor") && <g stroke={ink} strokeWidth=".6" opacity=".35">{planks}<path d="M280 812H1320M140 905H1460M390 740H1210" /></g>}
        <g fill="#e9eef0">
          <rect x="590" y="290" width="420" height="230" />
          <path d="M800 290V520M590 405H1010" fill="none" strokeWidth=".8" />
        </g>
        <path d="M1320 150L1500 54V870L1320 800Z" fill={wall} style={{ filter: "brightness(.86)" }} />
        <path d="M1450 470l-14 6" />
        <path d="M200 110L380 207" strokeWidth=".6" opacity=".5" />

        {!bedroom && <>
          {has("rug") && <path d="M420 950H1180L1070 760H530Z" fill={tone("rug", 3, "#8f8a82")!} fillOpacity=".55" />}
          {has("sofa") && <g fill={tone("sofa", 2, "#8f8a82")!}>
            <rect x="570" y="572" width="460" height="64" rx="10" />
            <rect x="575" y="632" width="450" height="46" rx="6" style={{ filter: "brightness(1.12)" }} />
            <rect x="546" y="598" width="34" height="86" rx="8" />
            <rect x="1020" y="598" width="34" height="86" rx="8" />
            <path d="M725 632v46M875 632v46" fill="none" strokeWidth=".7" />
            <path d="M566 684v10M1034 684v10" />
          </g>}
          {has("table") && <g fill={tone("table", 3, "#6d6a64")!}>
            <path d="M688 802v58M912 802v58M760 812v40M840 812v40" fill="none" />
            <ellipse cx="800" cy="800" rx="124" ry="24" />
          </g>}
          {has("armchair") && <g fill={tone("armchair", 0, "#a39d93")!}>
            <path d="M1190 690L1340 670L1360 830L1210 860Z" />
            <path d="M1210 780L1360 760L1370 840L1215 870Z" style={{ filter: "brightness(1.1)" }} />
            <path d="M1215 870v22M1366 840v22" fill="none" />
          </g>}
        </>}

        {bedroom && <>
          {has("rug") && <path d="M360 990H1240L1110 800H490Z" fill={tone("rug", 3, "#8f8a82")!} fillOpacity=".5" />}
          {has("bed") && <g>
            <rect x="600" y="520" width="400" height="120" rx="6" fill={tone("bed", 2, "#8f8a82")!} />
            <path d="M600 640H1000L1110 850H490Z" fill={tone("bed", 1, "#eee")!} />
            <path d="M490 850H1110V880H490Z" fill={tone("bed", 1, "#eee")!} style={{ filter: "brightness(.9)" }} />
            <rect x="640" y="600" width="150" height="46" rx="16" fill="#faf9f6" />
            <rect x="810" y="600" width="150" height="46" rx="16" fill="#faf9f6" />
            <path d="M560 740H1040" fill="none" strokeWidth=".7" />
          </g>}
          {has("nightstand") && <g fill={tone("nightstand", 3, "#6d6a64")!}>
            <rect x="500" y="600" width="80" height="90" /><rect x="1020" y="600" width="80" height="90" />
          </g>}
          {has("lamp") && <g fill={tone("lamp", 0, "#c9c3b8")!}>
            <path d="M516 560h48l10 36h-68Z" /><path d="M1036 560h48l10 36h-68Z" />
          </g>}
        </>}

        {has("pendant") ? <g fill={tone("pendant", 3, "#6d6a64")!}>
          <path d="M800 130V330" fill="none" />
          <path d="M740 380a60 50 0 0 1 120 0Z" />
        </g> : null}
      </g>
    </svg>
  );
}
