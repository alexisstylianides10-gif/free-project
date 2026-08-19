import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Mission } from "@/lib/catalog/missions";

/** The large hero mission card shown on Home — matches the Canva reference's
 * gradient "Today's Mission" card with a black pill CTA. */
export function MissionHeroCard({ mission, eyebrow = "Future Mission" }: { mission: Mission; eyebrow?: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-mission p-5 text-white shadow-glow-mission">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/85">
          <span aria-hidden>🚀</span> {eyebrow}
        </p>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">+{mission.xp} XP</span>
      </div>
      <p className="mt-3 text-lg font-bold leading-snug">{mission.title}</p>
      <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-white/15 px-2.5 py-1 capitalize">{mission.difficulty}</span>
        <span className="rounded-full bg-white/15 px-2.5 py-1">{mission.minutes} min</span>
      </div>
      <Link
        href={`/app/missions/${mission.id}`}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-black/85 text-sm font-semibold text-white transition-colors hover:bg-black"
      >
        Start Mission
      </Link>
    </div>
  );
}

const categoryMeta: Record<Mission["category"], { label: string; icon: string; className: string }> = {
  school: { label: "School mission", icon: "📚", className: "bg-school/15 text-school" },
  skill: { label: "Skill mission", icon: "🧠", className: "bg-accent-soft text-accent" },
  career: { label: "Career mission", icon: "🚀", className: "bg-future/15 text-future" },
  business: { label: "Business mission", icon: "💼", className: "bg-mission-via/15 text-mission-via" },
  creative: { label: "Creative mission", icon: "🎨", className: "bg-mission-from/15 text-mission-from" },
};

export function MissionListItem({
  mission,
  status = "available",
  onClick,
}: {
  mission: Mission;
  status?: "available" | "active" | "completed";
  onClick?: () => void;
}) {
  const meta = categoryMeta[mission.category];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-border-strong",
        status === "completed" && "opacity-60"
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg", meta.className)}>
        {meta.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{mission.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {meta.label} · {mission.minutes} min
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
        {status === "completed" ? "Done" : `+${mission.xp} XP`}
      </span>
    </button>
  );
}
