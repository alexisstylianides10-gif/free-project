import type { Player } from "@/engine/core/types";

/** Six headline stats (0-99) derived from the 1-20 attributes, in the style of card-based career modes. */
export function faceStats(p: Pick<Player, "attributes" | "position">): { label: string; value: number }[] {
  const a = p.attributes;
  const s = (v: number) => Math.max(1, Math.min(99, Math.round(v * 5)));
  if (p.position === "GK") {
    return [
      { label: "DIV", value: s((a.reflexes + a.agility) / 2) },
      { label: "HAN", value: s(a.handling) },
      { label: "KIC", value: s(a.kicking) },
      { label: "REF", value: s(a.reflexes) },
      { label: "SPD", value: s((a.pace + a.acceleration) / 2) },
      { label: "POS", value: s((a.positioning + a.commandOfArea + a.oneOnOnes) / 3) },
    ];
  }
  return [
    { label: "PAC", value: s((a.pace + a.acceleration) / 2) },
    { label: "SHO", value: s((a.finishing * 2 + a.longShots + a.composure + a.offTheBall) / 5) },
    { label: "PAS", value: s((a.passing * 2 + a.vision + a.crossing + a.technique) / 5) },
    { label: "DRI", value: s((a.dribbling * 2 + a.agility + a.firstTouch + a.technique) / 5) },
    { label: "DEF", value: s((a.tackling * 2 + a.marking + a.positioning + a.anticipation) / 5) },
    { label: "PHY", value: s((a.strength + a.stamina + a.jumping + a.aggression) / 4) },
  ];
}

export function statTone(v: number): string {
  return v >= 80 ? "text-gold" : v >= 70 ? "text-accent" : v >= 60 ? "text-fg" : v >= 50 ? "text-muted" : "text-danger/80";
}
