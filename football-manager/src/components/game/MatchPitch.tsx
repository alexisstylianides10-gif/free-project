"use client";
import type { MatchRecord } from "@/engine/core/types";

const W = 1050;
const H = 680;

export interface PitchDot {
  id: string;
  side: 0 | 1;
  x: number; // home frame 0..100 (home attacks to the right)
  y: number;
  label: string;
  hasBall?: boolean;
  number?: number;
}

function textOn(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#111" : "#fff";
}

export function MatchPitch({ dots, ball, homeColor, awayColor, highlight, banner }: { dots: PitchDot[]; ball: { x: number; y: number }; homeColor: string; awayColor: string; highlight?: string | null; banner?: string | null }) {
  const px = (x: number) => 25 + (x / 100) * (W - 50);
  const py = (y: number) => 25 + (y / 100) * (H - 50);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-xl" data-testid="match-pitch" role="img" aria-label="Live match view">
      <rect width={W} height={H} fill="#13492d" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * (W / 12)} y={0} width={W / 24} height={H} fill="#155232" />)}
      <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={3}>
        <rect x={25} y={25} width={W - 50} height={H - 50} />
        <line x1={W / 2} y1={25} x2={W / 2} y2={H - 25} />
        <circle cx={W / 2} cy={H / 2} r={80} />
        <rect x={25} y={H / 2 - 185} width={150} height={370} />
        <rect x={W - 175} y={H / 2 - 185} width={150} height={370} />
        <rect x={25} y={H / 2 - 80} width={52} height={160} />
        <rect x={W - 77} y={H / 2 - 80} width={52} height={160} />
        <rect x={12} y={H / 2 - 37} width={13} height={74} stroke="#fff" />
        <rect x={W - 25} y={H / 2 - 37} width={13} height={74} stroke="#fff" />
      </g>
      {dots.map((d) => (
        <g key={d.id} style={{ transform: `translate(${px(d.x)}px, ${py(d.y)}px)`, transition: "transform 380ms linear" }}>
          {d.hasBall ? <circle r={30} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} /> : null}
          <circle r={d.id === highlight ? 24 : 21} fill={d.side === 0 ? homeColor : awayColor} stroke={d.hasBall ? "#ffffff" : "rgba(0,0,0,0.65)"} strokeWidth={d.hasBall ? 5 : 3} />
          {d.number ? <text y={7} textAnchor="middle" fontSize={20} fontWeight={800} fill={textOn(d.side === 0 ? homeColor : awayColor)}>{d.number}</text> : null}
          <text y={48} textAnchor="middle" fontSize={22} fontWeight={600} fill="#fff" style={{ paintOrder: "stroke" }} stroke="rgba(0,0,0,0.75)" strokeWidth={5}>{d.label}</text>
        </g>
      ))}
      <g style={{ transform: `translate(${px(ball.x)}px, ${py(ball.y)}px)`, transition: "transform 380ms linear" }}>
        <circle r={11} fill="#ffffff" stroke="#111" strokeWidth={3} />
      </g>
      {banner ? (
        <g>
          <rect x={W / 2 - 260} y={H / 2 - 70} width={520} height={140} rx={24} fill="rgba(0,0,0,0.72)" />
          <text x={W / 2} y={H / 2 + 34} textAnchor="middle" fontSize={96} fontWeight={900} fill="#22d38b" letterSpacing={6}>{banner}</text>
        </g>
      ) : null}
    </svg>
  );
}

/** Approximate player positions for a replayed event from the stored shapes. */
export function replayDots(m: MatchRecord, ball: { x: number; y: number }, possession: 0 | 1, onPitch: Set<string>, names: Record<string, string>): PitchDot[] {
  if (!m.shapes) return [];
  const out: PitchDot[] = [];
  for (const s of m.shapes) {
    if (!onPitch.has(s.playerId)) continue;
    const own = s.side === 0 ? ball : { x: 100 - ball.x, y: 100 - ball.y };
    const attacking = s.side === possession;
    const base = attacking ? s.ip : s.op;
    let x = base.x + (own.x - 50) * 0.3;
    let y = base.y + (attacking ? 0 : (own.y - 50) * 0.25);
    x = Math.max(2, Math.min(98, x));
    y = Math.max(3, Math.min(97, y));
    out.push({ id: s.playerId, side: s.side, x: s.side === 0 ? x : 100 - x, y: s.side === 0 ? y : 100 - y, label: names[s.playerId] ?? "" });
  }
  return out;
}
