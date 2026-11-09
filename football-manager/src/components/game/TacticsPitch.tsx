"use client";
import { useRef } from "react";
import type { Player, TacticSlot } from "@/engine/core/types";
import { ratingInPosition } from "@/engine/core/ratings";
import { ROLE_MAP } from "@/engine/tactics/roles";

const W = 680;
const H = 1000;

export function PitchLines() {
  return (
    <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3}>
      <rect x={20} y={20} width={W - 40} height={H - 40} rx={4} />
      <line x1={20} y1={H / 2} x2={W - 20} y2={H / 2} />
      <circle cx={W / 2} cy={H / 2} r={80} />
      <rect x={W / 2 - 180} y={20} width={360} height={150} />
      <rect x={W / 2 - 80} y={20} width={160} height={55} />
      <rect x={W / 2 - 180} y={H - 170} width={360} height={150} />
      <rect x={W / 2 - 80} y={H - 75} width={160} height={55} />
      <circle cx={W / 2} cy={H / 2} r={4} fill="rgba(255,255,255,0.5)" />
    </g>
  );
}

export function PitchStripes() {
  return (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#13492d" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={0} y={i * (H / 10)} width={W} height={H / 20} fill="#155232" />
      ))}
    </>
  );
}

/** Vertical tactics board. x (0 own goal → 100 opponent goal) is drawn bottom → top. */
export function TacticsPitch({ slots, shape, players, selected, onSelect, onMove, ghostShape }: {
  slots: TacticSlot[];
  shape: "op" | "ip";
  players: Record<string, Player | undefined>;
  selected: string | null;
  onSelect: (slotId: string) => void;
  onMove: (slotId: string, x: number, y: number, done: boolean) => void;
  ghostShape: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<string | null>(null);
  const toCoords = (e: React.PointerEvent): { x: number; y: number } => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    const x = Math.max(2, Math.min(98, 100 - ((py - 20) / (H - 40)) * 100));
    const y = Math.max(2, Math.min(98, ((px - 20) / (W - 40)) * 100));
    return { x: Math.round(x), y: Math.round(y) };
  };
  const pos = (c: { x: number; y: number }) => ({ cx: 20 + (c.y / 100) * (W - 40), cy: 20 + ((100 - c.x) / 100) * (H - 40) });
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full touch-none select-none rounded-xl"
      data-testid="tactics-pitch"
      onPointerMove={(e) => {
        if (!drag.current) return;
        const c = toCoords(e);
        onMove(drag.current, c.x, c.y, false);
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        const c = toCoords(e);
        onMove(drag.current, c.x, c.y, true);
        drag.current = null;
      }}
      onPointerLeave={() => (drag.current = null)}
    >
      <PitchStripes />
      <PitchLines />
      {ghostShape
        ? slots.map((s) => {
            const a = pos(shape === "op" ? s.inPossession : s.outOfPossession);
            const b = pos(shape === "op" ? s.outOfPossession : s.inPossession);
            return <line key={`g${s.id}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="rgba(255,255,255,0.25)" strokeDasharray="6 6" strokeWidth={2} />;
          })
        : null}
      {ghostShape
        ? slots.map((s) => {
            const c = pos(shape === "op" ? s.inPossession : s.outOfPossession);
            return <circle key={`gc${s.id}`} cx={c.cx} cy={c.cy} r={10} fill="rgba(255,255,255,0.18)" />;
          })
        : null}
      {slots.map((s) => {
        const c = pos(shape === "op" ? s.outOfPossession : s.inPossession);
        const p = players[s.id];
        const rating = p ? ratingInPosition(p, s.position) : null;
        const fam = p ? (p.position === s.position ? 2 : p.altPositions.includes(s.position) ? 1 : 0) : -1;
        const ring = fam === 2 ? "#22d38b" : fam === 1 ? "#f5c451" : fam === 0 ? "#ef5350" : "#8b9bb0";
        const isSel = selected === s.id;
        return (
          <g
            key={s.id}
            transform={`translate(${c.cx},${c.cy})`}
            className="cursor-grab active:cursor-grabbing"
            data-testid={`slot-${s.id}`}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              drag.current = s.id;
              onSelect(s.id);
            }}
          >
            <circle r={isSel ? 34 : 30} fill={s.position === "GK" ? "#f5c451" : "#0e131a"} stroke={isSel ? "#ffffff" : ring} strokeWidth={isSel ? 5 : 4} />
            <text y={-2} textAnchor="middle" fontSize={17} fontWeight={800} fill={s.position === "GK" ? "#111" : "#e6edf3"}>{s.position}</text>
            <text y={17} textAnchor="middle" fontSize={13} fontWeight={600} fill={s.position === "GK" ? "#111" : "#8b9bb0"}>{rating ?? "—"}</text>
            <text y={54} textAnchor="middle" fontSize={17} fontWeight={600} fill="#fff" style={{ paintOrder: "stroke" }} stroke="rgba(0,0,0,0.65)" strokeWidth={4}>
              {p ? p.lastName.slice(0, 13) : "Empty"}
            </text>
            <text y={73} textAnchor="middle" fontSize={12} fill="#cfe9dc" style={{ paintOrder: "stroke" }} stroke="rgba(0,0,0,0.6)" strokeWidth={3}>
              {(ROLE_MAP[s.role]?.name ?? s.role) + " · " + s.duty.charAt(0).toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
