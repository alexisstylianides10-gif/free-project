"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Lock, LogOut, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useUserSkills, useUserAchievements, useRoadmapProgress } from "@/lib/hooks/domain";
import { ACHIEVEMENTS } from "@/lib/catalog/achievements";
import { skillLabel } from "@/lib/catalog/skills";
import { ROADMAP_LEVELS } from "@/lib/catalog/roadmap";
import { xpToPercent, totalXP, levelFromXP } from "@/lib/xp";
import { initials, cn } from "@/lib/utils";
import { authedFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { RoadmapTimeline, RoadmapStep } from "@/components/shared/RoadmapTimeline";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { EmptyState } from "@/components/shared/EmptyState";
import { InstallAppCard } from "@/components/shared/InstallAppCard";
import { branding } from "@/lib/branding";

const DELETE_CONFIRM_PHRASE = "DELETE";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
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
        return { level: lvl.level, title: lvl.title, description: lvl.description, status };
      }),
    [roadmapProgress]
  );

  if (!profile) return null;

  const level = levelFromXP(totalXP(profile));

  const isBusiness = profile.track === "business";
  const progressStats: { label: string; value: number; cap: number; tone: "school" | "future" | "brand" | "mission" }[] = [
    { label: isBusiness ? "Plan XP" : "School XP", value: profile.xp_school, cap: 220, tone: "school" },
    { label: isBusiness ? "Business XP" : "Career XP", value: profile.xp_career, cap: 260, tone: "future" },
    { label: "Skill XP", value: profile.xp_skill, cap: 250, tone: "brand" },
    { label: "Project XP", value: profile.xp_project, cap: 200, tone: "mission" },
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
        setDeleteError(json.error || "Couldn't delete your account. Try again.");
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
      setDeleteError("Couldn't reach the server. Check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-7 pb-4">
      <ScreenHeader eyebrow="Profile" title="Your progress" subtitle="Everything you've built, in one place." action={<NotificationBell className="md:hidden" />} />

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-brand p-[2.5px] shadow-glow-accent">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-surface text-2xl">
              {profile.avatar_emoji || initials(profile.full_name)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile.year_group}</p>
          </div>
          <Badge tone="accent">Level {level}</Badge>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Progress</h2>
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
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Achievements</h2>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.filter((a) => !a.track || a.track === profile.track).map((a) => {
            const earned = earnedKeys.has(a.key);
            return (
              <Card key={a.key} className={cn(!earned && "opacity-55")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-2xl", !earned && "grayscale")}>{a.icon}</span>
                    {!earned && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{a.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Skills</h2>
        {sortedSkills.length === 0 ? (
          <EmptyState icon={Sparkles} title="No skills yet" subtitle="Complete missions to start building skills." />
        ) : (
          <Card>
            <CardContent className="space-y-4 p-5">
              {sortedSkills.map((s) => (
                <div key={s.skill_key}>
                  <p className="text-sm font-medium text-foreground">
                    {skillLabel(s.skill_key)} · {s.proficiency}%
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Career Journey</h2>
          <Link href="/app/weekly-review" className="flex items-center gap-0.5 text-xs font-semibold text-accent">
            Weekly Review <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-5">
            <RoadmapTimeline steps={roadmapSteps} />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Settings</h2>
        <InstallAppCard />
        <Card className="mt-3">
          <CardContent className="p-4">
            <p className="mb-2.5 text-sm font-medium text-foreground">Appearance</p>
            <ThemeToggle />
          </CardContent>
        </Card>
        <Card className="mt-3">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{branding.name} Plus</p>
              <p className="text-xs text-muted-foreground">
                {profile.plan === "plus"
                  ? "Manage your subscription"
                  : isBusiness
                    ? "AI Coach, business snapshot & content helper"
                    : "AI Coach, study plans, quizzes & more"}
              </p>
            </div>
            <Link href="/app/upgrade">
              <Button size="sm" variant="outline">
                {profile.plan === "plus" ? "Manage" : "Activate"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Button variant="outline" size="lg" className="w-full" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-danger">Danger zone</h2>
        <Card className="border-danger/40">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently deletes your account and everything in it. This can&rsquo;t be undone.
              </p>
            </div>
            <Button size="sm" variant="danger" onClick={openDeleteModal}>
              Delete
            </Button>
          </CardContent>
        </Card>
      </section>

      <Modal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteModalOpen(open);
        }}
        title="Delete your account?"
        description="This permanently deletes your profile, progress, XP, missions, study materials, chat history, and (if you're subscribed) cancels your Alxioum Plus subscription. There is no way to undo this."
      >
        <div className="space-y-4">
          {profile.plan === "plus" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>You&rsquo;re on {branding.name} Plus. Your subscription will be canceled automatically as part of deletion.</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Type <span className="font-bold text-foreground">{DELETE_CONFIRM_PHRASE}</span> to confirm
            </span>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRM_PHRASE}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              disabled={deleting}
              className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-danger/60"
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
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== DELETE_CONFIRM_PHRASE}
              type="button"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
