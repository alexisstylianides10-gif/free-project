"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, PartyPopper } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { useUserMissions } from "@/lib/hooks/domain";
import { getMission } from "@/lib/catalog/missions";
import { completeMission } from "@/lib/actions/missions";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { data: userMissions, refetch } = useUserMissions(user?.id);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const t = useTranslations("MissionDetailPage");
  const tMissions = useTranslations("Missions");
  const tSkills = useTranslations("Skills");
  const tMissionCard = useTranslations("MissionCard");

  const mission = getMission(id);
  const record = userMissions.find((m) => m.mission_id === id);
  const alreadyCompleted = record?.status === "completed";

  const isFirstOfCategory = useMemo(() => {
    return (category: string) =>
      !userMissions.some((m) => m.status === "completed" && getMission(m.mission_id)?.category === category);
  }, [userMissions]);

  if (!mission) {
    return (
      <div className="animate-fade-in py-16 text-center text-sm text-muted-foreground">
        {t("notFound")}{" "}
        <Link href="/app/missions" className="text-accent underline underline-offset-4">
          {t("backToMissions")}
        </Link>
      </div>
    );
  }

  async function handleComplete() {
    if (!user || !profile || !supabase || !mission) return;
    setCompleting(true);
    await completeMission(supabase, user.id, mission, profile, isFirstOfCategory);
    await Promise.all([refreshProfile(), refetch()]);
    setCompleting(false);
    setJustCompleted(true);
  }

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mt-2 rounded-3xl bg-gradient-mission p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wide text-white/85">{tMissionCard(`categoryLabel.${mission.category}`)}</p>
        <h1 className="mt-2 text-xl font-bold leading-snug">{tMissions(`${mission.id}.title`)}</h1>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/15 px-2.5 py-1 capitalize">{tMissionCard(`difficulty.${mission.difficulty}`)}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">{tMissionCard("minutes", { minutes: mission.minutes })}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">+{mission.xp} XP</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-foreground">{tMissions(`${mission.id}.description`)}</p>

      {mission.skillKeys && mission.skillKeys.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {mission.skillKeys.map((k) => (
            <Badge key={k} tone="accent">
              {t("builds", { skill: tSkills(k) })}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-8">
        {alreadyCompleted || justCompleted ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-success/40 bg-success-soft px-4 py-3.5 text-sm font-semibold text-success">
            <PartyPopper className="h-4.5 w-4.5" />
            {t("missionComplete", { xp: mission.xp })}
          </div>
        ) : (
          <Button size="lg" variant="mission" className="w-full" onClick={handleComplete} disabled={completing}>
            <CheckCircle2 className="h-4 w-4" />
            {completing ? t("saving") : t("iCompletedThis")}
          </Button>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("beHonest")}
        </p>
      </div>
    </div>
  );
}
