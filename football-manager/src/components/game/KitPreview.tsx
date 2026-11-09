import type { ClubKit } from "@/engine/core/types";
import { isLight } from "./Crest";

/** Generic kit renderer (no real-world brand assets). */
export function KitPreview({ kit, size = 220 }: { kit: ClubKit; size?: number }) {
  const id = `k-${kit.slot}`;
  const p = kit.primary, s = kit.secondary;
  const pattern = (() => {
    switch (kit.pattern) {
      case "stripes": return Array.from({ length: 5 }, (_, i) => <rect key={i} x={40 + i * 26} y={0} width={13} height={220} fill={s} />);
      case "pinstripes": return Array.from({ length: 12 }, (_, i) => <rect key={i} x={36 + i * 11} y={0} width={2.5} height={220} fill={s} />);
      case "hoops": return Array.from({ length: 5 }, (_, i) => <rect key={i} x={0} y={40 + i * 34} width={200} height={16} fill={s} />);
      case "halves": return <rect x={100} y={0} width={100} height={220} fill={s} />;
      case "quarters": return <><rect x={100} y={0} width={100} height={105} fill={s} /><rect x={0} y={105} width={100} height={120} fill={s} /></>;
      case "sash": return <polygon points="40,20 75,20 165,200 130,200" fill={s} />;
      case "chevron": return <polygon points="30,60 100,110 170,60 170,85 100,135 30,85" fill={s} />;
      default: return null;
    }
  })();
  const text = isLight(p) ? "#111" : "#fff";
  const sleeve = kit.sleeves === "contrast" ? s : p;
  return (
    <svg width={size} height={size * 1.45} viewBox="0 0 200 290" role="img" aria-label={`${kit.slot} kit preview`}>
      <defs><clipPath id={id}><path d="M60 10 L140 10 L190 45 L170 85 L150 72 L150 190 L50 190 L50 72 L30 85 L10 45 Z" /></clipPath></defs>
      <path d="M60 10 L140 10 L190 45 L170 85 L150 72 L150 190 L50 190 L50 72 L30 85 L10 45 Z" fill={p} />
      <g clipPath={`url(#${id})`}>{pattern}</g>
      <path d="M140 10 L190 45 L170 85 L150 72 Z" fill={sleeve} /><path d="M60 10 L10 45 L30 85 L50 72 Z" fill={sleeve} />
      <path d="M60 10 L140 10 L190 45 L170 85 L150 72 L150 190 L50 190 L50 72 L30 85 L10 45 Z" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={2} />
      {kit.collar === "v" ? <path d="M82 10 L100 34 L118 10" fill="none" stroke={kit.accent} strokeWidth={5} /> : kit.collar === "polo" ? <path d="M78 10 Q100 28 122 10 L115 2 L85 2 Z" fill={kit.accent} /> : <path d="M80 10 Q100 24 120 10" fill="none" stroke={kit.accent} strokeWidth={5} />}
      <text x={100} y={115} textAnchor="middle" fontSize={kit.sponsorText.length > 12 ? 11 : 14} fontWeight={800} fill={text} fontFamily="ui-sans-serif, system-ui">{kit.sponsorText.toUpperCase()}</text>
      <text x={128} y={48} textAnchor="middle" fontSize={7} fill={text} opacity={0.8}>{kit.manufacturer.split(" ")[0]?.toUpperCase()}</text>
      <path d="M52 196 L148 196 L152 245 L106 245 L100 225 L94 245 L48 245 Z" fill={kit.shorts} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
      <rect x={60} y={252} width={22} height={34} rx={3} fill={kit.socks} stroke="rgba(0,0,0,0.4)" />
      <rect x={118} y={252} width={22} height={34} rx={3} fill={kit.socks} stroke="rgba(0,0,0,0.4)" />
    </svg>
  );
}
