import type { PlanSymbol } from "@/domain/models";

/** Furniture symbols in architectural plan convention. Drawn in a local box with the "back" at the top. */
export function PlanFurniture({ symbol }: { symbol: PlanSymbol }) {
  const rotate = symbol.rotate ?? 0;
  const sideways = rotate === 90 || rotate === 270;
  const w = sideways ? symbol.h : symbol.w, h = sideways ? symbol.w : symbol.h;
  const angle = { 0: 0, 90: -90, 180: 180, 270: 90 }[rotate];
  const cx = symbol.x + symbol.w / 2, cy = symbol.y + symbol.h / 2;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle}) translate(${-w / 2} ${-h / 2})`} className={"plan-symbol plan-symbol-" + symbol.kind}>
      {draw(symbol.kind, w, h, symbol.seats ?? 4)}
    </g>
  );
}

function draw(kind: PlanSymbol["kind"], w: number, h: number, seats: number) {
  switch (kind) {
    case "sofa": {
      const arm = Math.min(w * 0.1, 22), back = h * 0.28, seat = (w - arm * 2) / 3;
      return <>
        <rect width={w} height={h} rx={8} />
        <path d={`M0 ${back}H${w}M${arm} ${back}V${h}M${w - arm} ${back}V${h}M${arm + seat} ${back}V${h - 6}M${arm + seat * 2} ${back}V${h - 6}`} />
      </>;
    }
    case "armchair": {
      const arm = w * 0.16, back = h * 0.26;
      return <><rect width={w} height={h} rx={8} /><path d={`M0 ${back}H${w}M${arm} ${back}V${h}M${w - arm} ${back}V${h}`} /></>;
    }
    case "coffee_table": return <><rect width={w} height={h} rx={4} /><rect x={6} y={6} width={w - 12} height={h - 12} rx={2} className="fine" /></>;
    case "rug": return <><rect width={w} height={h} className="rug" /><rect x={12} y={12} width={w - 24} height={h - 24} className="rug fine" /></>;
    case "console": return <><rect width={w} height={h} /><path d={`M8 ${h / 2}H${w - 8}`} className="fine" /></>;
    case "dining": {
      const perSide = Math.max(1, Math.floor((seats - 2) / 2)), cw = 44, cd = 34, gap = w / perSide;
      const chairs = [];
      for (let i = 0; i < perSide; i++) {
        const x = gap * i + gap / 2 - cw / 2;
        chairs.push(<rect key={"t" + i} x={x} y={-cd - 6} width={cw} height={cd} rx={6} />, <rect key={"b" + i} x={x} y={h + 6} width={cw} height={cd} rx={6} />);
      }
      if (seats > perSide * 2) chairs.push(<rect key="l" x={-cd - 6} y={h / 2 - cw / 2} width={cd} height={cw} rx={6} />, <rect key="r" x={w + 6} y={h / 2 - cw / 2} width={cd} height={cw} rx={6} />);
      return <>{chairs}<rect width={w} height={h} rx={3} /></>;
    }
    case "round_dining": {
      const r = Math.min(w, h) / 2 * 0.62;
      return <>
        {Array.from({ length: seats }, (_, i) => {
          const a = (i / seats) * Math.PI * 2 + Math.PI / 4;
          return <rect key={i} x={w / 2 + Math.cos(a) * (r + 26) - 20} y={h / 2 + Math.sin(a) * (r + 26) - 16} width={40} height={32} rx={6} transform={`rotate(${(a * 180) / Math.PI + 90} ${w / 2 + Math.cos(a) * (r + 26)} ${h / 2 + Math.sin(a) * (r + 26)})`} />;
        })}
        <circle cx={w / 2} cy={h / 2} r={r} />
      </>;
    }
    case "bed": {
      const head = h * 0.06, pillowH = h * 0.14, pw = (w - 30) / 2;
      return <>
        <rect width={w} height={h} rx={4} />
        <path d={`M0 ${head}H${w}`} />
        <rect x={10} y={head + 10} width={pw} height={pillowH} rx={8} className="fine" />
        <rect x={20 + pw} y={head + 10} width={pw} height={pillowH} rx={8} className="fine" />
        <path d={`M0 ${h * 0.38}H${w}M${w} ${h * 0.38}L${w - 40} ${h * 0.48}`} className="fine" />
      </>;
    }
    case "nightstand": return <><rect width={w} height={h} rx={3} /><circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.22} className="fine" /></>;
    case "wardrobe": {
      const ticks = [];
      for (let y = 24; y < h - 10; y += 32) ticks.push(`M${w * 0.2} ${y - 10}L${w * 0.8} ${y + 10}`);
      return <><rect width={w} height={h} /><path d={`M${w / 2} 6V${h - 6}`} className="fine" /><path d={ticks.join("")} className="fine" /></>;
    }
    case "counter": return <rect width={w} height={h} className="counter" />;
    case "island": return <><rect width={w} height={h} /><rect x={8} y={8} width={w - 16} height={h - 16} className="fine" /></>;
    case "hob": {
      const r = Math.min(w, h) * 0.17;
      return <><rect width={w} height={h} rx={3} className="fine" />{[[0.3, 0.28], [0.7, 0.28], [0.3, 0.72], [0.7, 0.72]].map(([x, y], i) => <circle key={i} cx={w * x} cy={h * y} r={r} className="fine" />)}</>;
    }
    case "sink": return <><rect x={4} y={4} width={w - 8} height={h - 8} rx={10} className="fine" /><circle cx={w / 2} cy={h / 2} r={3} className="fine" /></>;
    case "bathtub": return <><rect width={w} height={h} rx={6} /><rect x={10} y={10} width={w - 20} height={h - 20} rx={Math.min(w, h) / 3} className="fine" /><circle cx={w - 28} cy={h / 2} r={4} className="fine" /></>;
    case "shower": return <><rect width={w} height={h} /><path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} className="fine" /><circle cx={w / 2} cy={h / 2} r={5} /></>;
    case "wc": return <><rect x={w * 0.05} width={w * 0.9} height={h * 0.28} rx={4} /><ellipse cx={w / 2} cy={h * 0.62} rx={w * 0.42} ry={h * 0.36} /></>;
    case "basin": return <><rect width={w} height={h} className="counter" /><ellipse cx={w * 0.52} cy={h / 2} rx={w * 0.3} ry={Math.min(h * 0.3, 28)} className="fine" /></>;
    case "desk": return <><rect width={w} height={h} /><rect x={w / 2 - 24} y={h + 8} width={48} height={40} rx={8} /></>;
    case "plant": return <><circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} className="fine" /><path d={leaf(w / 2, h / 2, Math.min(w, h) / 2 - 4)} className="fine" /></>;
  }
}

function leaf(cx: number, cy: number, r: number) {
  let d = "";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    d += `M${cx} ${cy}L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`;
  }
  return d;
}
