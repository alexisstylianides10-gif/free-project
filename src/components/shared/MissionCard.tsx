import Link from "next/link";
import { Rocket, BookOpen, Brain, Briefcase, Palette, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Mission } from "@/lib/catalog/missions";
import { Button } from "@/components/ui/Button";

/** Home-screen mission card — flat surface, not the full 3-stop mission
 * gradient. Home already has three brand colors in view (the accent
 * gradient in the greeting, `school` blue, `future` orange); a fourth,
 * louder gradient competing for the same glance is exactly the kind of
 * decorative-not-functional color use the de-vibe audit flagged (see
 * PRODUCT_SPECS_DEVIBE.md §3.1). The single `mission-via` accent color
 * carries just the eyebrow label and the "+XP" badge — enough to say "this
 * is a mission, not a task" without a second competing gradient. The full
 * `bg-gradient-mission` treatment is reserved for the mission detail screen
 * (missions/[id]/page.tsx), where a user has intentionally navigated in to
 * look at one specific mission. */
export function MissionHomeCard({ mission, eyebrow }: { mission: Mission; eyebrow?: string }) {
  const t = useTranslations("MissionCard");
  const tMissions = useTranslations("Missions");
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mission-via">
          <Rocket className="h-3.5 w-3.5" aria-hidden /> {eyebrow ?? t("futureMission")}
        </p>
        <span className="rounded-full bg-mission-via/15 px-2.5 py-1 text-xs font-bold text-mission-via">+{mission.xp} XP</span>
      </div>
      <p className="mt-3 text-lg font-bold leading-snug text-foreground">{tMissions(`${mission.id}.title`)}</p>
      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1 capitalize">{t(`difficulty.${mission.difficulty}`)}</span>
        <span className="rounded-full bg-muted px-2.5 py-1">{t("minutes", { minutes: mission.minutes })}</span>
      </div>
      <Link href={`/app/missions/${mission.id}`} className="mt-4 block">
        <Button size="lg" variant="secondary" className="w-full">
          {t("startMission")}
        </Button>
      </Link>
    </div>
  );
}

const categoryMeta: Record<Mission["category"], { icon: LucideIcon; className: string }> = {
  school: { icon: BookOpen, className: "bg-school/15 text-school" },
  skill: { icon: Brain, className: "bg-accent-soft text-accent" },
  career: { icon: Rocket, className: "bg-future/15 text-future" },
  business: { icon: Briefcase, className: "bg-mission-via/15 text-mission-via" },
  creative: { icon: Palette, className: "bg-mission-from/15 text-mission-from" },
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
  const t = useTranslations("MissionCard");
  const tMissions = useTranslations("Missions");
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
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.className)}>
        <meta.icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{tMissions(`${mission.id}.title`)}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {t(`categoryLabel.${mission.category}`)} · {t("minutes", { minutes: mission.minutes })}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
        {status === "completed" ? t("done") : `+${mission.xp} XP`}
      </span>
    </button>
  );
}
