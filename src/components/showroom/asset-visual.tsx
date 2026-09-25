import type { Asset } from "@/domain/models";
import { elementKey } from "@/domain/catalog";

const NEUTRAL = ["#cfcac1", "#ebe7e0", "#a19c93", "#5d5a55"];

/**
 * Asset image. Real catalog assets show their reference image. Without one we draw an abstract,
 * clearly non-photographic glyph so nothing can be mistaken for a real product.
 */
export function AssetVisual({ asset, palette, isDemo }: { asset: Asset; palette?: string[]; isDemo: boolean }) {
  if (asset.previewImageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="asset-visual" src={asset.previewImageUrl} alt={asset.referenceName} loading="lazy" />;
  }
  const [base, light, mid, dark] = palette?.length ? palette : NEUTRAL;
  const key = elementKey(asset);
  return (
    <svg className="asset-visual" viewBox="0 0 120 120" role="img" aria-label={`${asset.referenceName} — ${isDemo ? "demo illustration" : "image pending"}`}>
      <rect width="120" height="120" fill={light} />
      {glyph(key, asset.category.toLowerCase(), { base, light, mid, dark })}
      {!isDemo && <text x="60" y="112" textAnchor="middle" className="asset-visual-note">IMAGE PENDING</text>}
    </svg>
  );
}

type Tones = { base: string; light: string; mid: string; dark: string };
function glyph(key: string, category: string, t: Tones) {
  const line = { stroke: t.dark, strokeWidth: 1.4, strokeLinejoin: "round" as const };
  if (key.includes("floor")) {
    const planks = [];
    for (let i = 0; i < 7; i++) planks.push(<path key={i} d={`M0 ${i * 18 + 4}H120`} stroke={t.mid} strokeWidth="0.9" />);
    for (let i = 0; i < 7; i++) planks.push(<path key={"j" + i} d={`M${(i * 37) % 110 + 8} ${i * 18 + 4}v18`} stroke={t.mid} strokeWidth="0.9" />);
    return <><rect width="120" height="120" fill={t.base} />{planks}</>;
  }
  if (key.includes("wall") || key.includes("paint") || key.includes("finish") || category.includes("finish")) {
    return <><rect width="120" height="120" fill={t.light} /><rect x="18" y="18" width="84" height="84" fill={t.base} opacity="0.55" /><rect x="40" y="40" width="40" height="40" fill={t.mid} opacity="0.55" /></>;
  }
  if (category.includes("material")) {
    return <><rect width="120" height="120" fill={t.base} /><path d="M0 80L120 40V120H0Z" fill={t.mid} opacity=".4" /></>;
  }
  if (key.includes("sofa")) return <g><rect x="14" y="44" width="92" height="36" rx="6" fill={t.base} {...line} /><rect x="20" y="58" width="80" height="16" rx="3" fill={t.light} {...line} /><path d="M20 80v8M100 80v8" {...line} /></g>;
  if (key.includes("armchair") || key.includes("chair")) return <g><rect x="34" y="38" width="52" height="44" rx="8" fill={t.base} {...line} /><rect x="42" y="58" width="36" height="16" rx="3" fill={t.light} {...line} /><path d="M40 82v8M80 82v8" {...line} /></g>;
  if (key.includes("table") && !key.includes("night")) return <g><ellipse cx="60" cy="58" rx="40" ry="11" fill={t.base} {...line} /><path d="M60 69v20M44 90h32" {...line} /></g>;
  if (key.includes("rug")) return <g><path d="M22 76L42 40H98L78 76Z" fill={t.base} {...line} /><path d="M34 70L48 46H90L76 70Z" fill="none" stroke={t.dark} strokeWidth=".7" opacity=".6" /></g>;
  if (key.includes("lamp")) return <g><path d="M46 36h28l8 22H38Z" fill={t.base} {...line} /><path d="M60 58v26M48 86h24" {...line} /></g>;
  if (key.includes("bed")) return <g><rect x="16" y="54" width="88" height="26" rx="3" fill={t.base} {...line} /><rect x="16" y="36" width="88" height="20" rx="3" fill={t.mid} {...line} /><rect x="24" y="46" width="30" height="10" rx="4" fill={t.light} {...line} /><rect x="66" y="46" width="30" height="10" rx="4" fill={t.light} {...line} /></g>;
  if (key.includes("night")) return <g><rect x="38" y="44" width="44" height="42" rx="2" fill={t.base} {...line} /><path d="M38 64h44" {...line} /></g>;
  if (key.includes("pendant") || key.includes("light") || category.includes("light")) return <g><path d="M60 10v30" {...line} /><path d="M40 62a20 20 0 0 1 40 0Z" fill={t.base} {...line} /><circle cx="60" cy="68" r="4" fill={t.light} {...line} /></g>;
  return <g><circle cx="60" cy="58" r="24" fill={t.base} {...line} /></g>;
}
