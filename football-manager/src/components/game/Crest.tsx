import type { Club } from "@/engine/core/types";

/** Generic generated crest (no real-world branding). */
export function Crest({ club, size = 28 }: { club: Pick<Club, "colors" | "code" | "name">; size?: number }) {
  const { primary, secondary } = club.colors;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" role="img" aria-label={`${club.name} crest`} className="shrink-0">
      <path d="M20 1 L38 7 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V7 Z" fill={primary} stroke={secondary} strokeWidth="2.5" />
      <path d="M20 4 L35 9 V22 C35 32 28 38 20 42 Z" fill={secondary} opacity="0.35" />
      <text x="20" y="27" textAnchor="middle" fontSize="11" fontWeight="800" fill={isLight(primary) ? "#111" : "#fff"} fontFamily="ui-sans-serif, system-ui" letterSpacing="0.5">
        {club.code.slice(0, 3)}
      </text>
    </svg>
  );
}

export function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 165;
}
