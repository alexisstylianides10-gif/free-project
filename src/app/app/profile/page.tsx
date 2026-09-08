"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Lock, LogOut, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { useUserSkills, useUserAchievements, useRoadmapProgress } from "@/lib/hooks/domain";
import { ACHIEVEMENTS } from "@/lib/catalog/achievements";
import { ROADMAP_LEVELS } from "@/lib/catalog/roadmap";
import { xpToPercent, totalXP, levelFromXP } from "@/lib/xp";
import { initials, cn } from "@/lib/utils";
import { authedFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { RoadmapTimeline, RoadmapStep } from "@/components/shared/RoadmapTimeline";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { EmptyState } from "@/components/shared/EmptyState";
import { InstallAppCard } from "@/components/shared/InstallAppCard";
import { PushNotificationToggle } from "@/components/shared/PushNotificationToggle";
import { branding } from "@/lib/branding";

const DELETE_CONFIRM_PHRASE = "DELETE";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const t = useTranslations("ProfilePage");
  const tAchievements = useTranslations("Achievements");
  const tSkills = useTranslations("Skills");
  const tRoadmap = useTranslations("RoadmapLevels");
  const { data: skills } = useUserSkills(user?.id);
  const { data: achievements } = useUserAchievements(user?.id);
  const { data: roadmapProgress } = useRoadmapProgress(user?.id);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const earnedKeys = useMemo(() => new Set(achievements.map((a) => a.achievement_key)), [achievements]);

  const sortedSkills = useMemo(() => [...skills].sort((a, b) => b.proficiency - a.proficiency), [skills]);

  const roadmapSteps: RoadmapStep[] = useMemo(
    () =>
      ROADMAP_LEVELS.map((lvl) => {
        const progress = roadmapProgress.find((r) => r.level_number === lvl.level);
        const status: RoadmapStep["status"] = progress?.completed_at ? "completed" : progress?.unlocked ? "unlocked" : "locked";
        return { level: lvl.level, title: tRoadmap(`${lvl.level}.title`), description: tRoadmap(`${lvl.level}.description`), status };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roadmapProgress]
  );

  if (!profile) return null;

  const level = levelFromXP(totalXP(profile));

  const isBusiness = profile.track === "business";
  const progressStats: { label: string; value: number; cap: number; tone: "school" | "future" | "brand" | "mission" }[] = [
    { label: isBusiness ? t("planXp") : t("schoolXp"), value: profile.xp_school, cap: 220, tone: "school" },
    { label: isBusiness ? t("businessXp") : t("careerXp"), value: profile.xp_career, cap: 260, tone: "future" },
    { label: t("skillXp"), value: profile.xp_skill, cap: 250, tone: "brand" },
    { label: t("projectXp"), value: profile.xp_project, cap: 200, tone: "mission" },
  ];

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  function openDeleteModal() {
    setDeleteError(null);
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== DELETE_CONFIRM_PHRASE) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await authedFetch("/api/account/delete", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(json.error || t("deleteFailed"));
        setDeleting(false);
        return;
      }
      // Server-side deletion already succeeded — sign out locally (the
      // deleted user's access token is no longer valid server-side anyway,
      // this just clears the local session state) and route to a
      // logged-out screen that confirms what happened.
      await signOut();
      router.push("/?deleted=1");
    } catch {
      setDeleteError(t("deleteNetworkError"));
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-7 pb-4">
      <ScreenHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} action={<NotificationBell className="md:hidden" />} />

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-brand p-[2.5px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-surface text-2xl">
              {profile.avatar_emoji || initials(profile.full_name)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile.year_group}</p>
          </div>
          <Badge tone="accent">{t("level", { level })}</Badge>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("progress")}</h2>
        <Card>
          <CardContent className="grid grid-cols-2 gap-5 p-5">
            {progressStats.map((stat) => (
              <div key={stat.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="shrink-0 text-sm font-bold text-foreground">{stat.value} XP</p>
                </div>
                <ProgressBar value={xpToPercent(stat.value, stat.cap)} tone={stat.tone} className="mt-2 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("achievements")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.filter((a) => !a.track || a.track === profile.track).map((a) => {
            const earned = earnedKeys.has(a.key);
            const AchievementIcon = a.icon;
            return (
              <Card key={a.key} className={cn(!earned && "opacity-55")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        earned ? "bg-accent-soft text-accent" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <AchievementIcon className="h-4 w-4" aria-hidden />
                    </span>
                    {!earned && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{tAchievements(`${a.key}.title`)}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{tAchievements(`${a.key}.description`)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("skills")}</h2>
        {sortedSkills.length === 0 ? (
          <EmptyState icon={Sparkles} title={t("noSkillsYet")} subtitle={t("noSkillsSubtitle")} />
        ) : (
          <Card>
            <CardContent className="space-y-4 p-5">
              {sortedSkills.map((s) => (
                <div key={s.skill_key}>
                  <p className="text-sm font-medium text-foreground">
                    {tSkills(s.skill_key)} · {s.proficiency}%
                  </p>
                  <ProgressBar value={s.proficiency} tone="brand" className="mt-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("careerJourney")}</h2>
          <Link href="/app/weekly-review" className="flex items-center gap-0.5 text-xs font-semibold text-accent">
            {t("weeklyReview")} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-5">
            <RoadmapTimeline steps={roadmapSteps} />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("settings")}</h2>
        <InstallAppCard />
        <Card className="mt-3">
          <CardContent className="p-4">
            <p className="mb-2.5 text-sm font-medium text-foreground">{t("appearance")}</p>
            <ThemeToggle />
          </CardContent>
        </Card>
        <Card className="mt-3">
          <CardContent className="p-4">
            <p className="mb-2.5 text-sm font-medium text-foreground">Notifications</p>
            <PushNotificationToggle />
          </CardContent>
        </Card>
        <Card className="mt-3">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm font-medium text-foreground">{t("language")}</p>
            <LanguageSwitcher />
          </CardContent>
        </Card>
        <Card className="mt-3">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("planName", { name: branding.name })}</p>
              <p className="text-xs text-muted-foreground">
                {profile.plan === "plus"
                  ? t("manageSubscription")
                  : isBusiness
                    ? t("businessPlanBlurb")
                    : t("studentPlanBlurb")}
              </p>
            </div>
            <Link href="/app/upgrade">
              <Button size="sm" variant="outline">
                {profile.plan === "plus" ? t("manage") : t("activate")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Button variant="outline" size="lg" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        {t("signOut")}
      </Button>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-danger">{t("dangerZone")}</h2>
        <Card className="border-danger/40">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("deleteAccount")}</p>
              <p className="text-xs text-muted-foreground">
                {t("deleteAccountBody")}
              </p>
            </div>
            <Button size="sm" variant="danger" onClick={openDeleteModal}>
              {t("delete")}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Modal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteModalOpen(open);
        }}
        title={t("deleteModalTitle")}
        description={t("deleteModalDescription", { name: branding.name })}
      >
        <div className="space-y-4">
          {profile.plan === "plus" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>{t("onPlusWarning", { name: branding.name })}</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t.rich("typeToConfirm", { phrase: DELETE_CONFIRM_PHRASE, b: (chunks) => <span className="font-bold text-foreground">{chunks}</span> })}
            </span>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRM_PHRASE}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              disabled={deleting}
              className="focus:border-danger/60"
            />
          </label>

          {deleteError && <p className="text-sm text-danger">{deleteError}</p>}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              type="button"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== DELETE_CONFIRM_PHRASE}
              type="button"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("deletePermanently")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
