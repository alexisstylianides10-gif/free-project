"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Star, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCareerPaths } from "@/lib/hooks/domain";
import { getCareer } from "@/lib/catalog/careers";
import { awardXP } from "@/lib/actions/xp";
import { awardAchievementOnce } from "@/lib/actions/achievements";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useOnboardingResponse, getPercentForSlug } from "../_lib/matches";

export default function CareerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { data: careerPaths, refetch } = useCareerPaths(user?.id);
  const { data: onboarding } = useOnboardingResponse(user?.id);

  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const career = getCareer(slug);
  const percent = useMemo(() => getPercentForSlug(slug, onboarding, careerPaths), [slug, onboarding, careerPaths]);
  const alreadyAdded = justAdded || careerPaths.some((c) => c.career_slug === slug);

  if (!career) {
    return (
      <div className="animate-fade-in py-16 text-center text-sm text-muted-foreground">
        Career not found.{" "}
        <Link href="/app/future" className="text-accent underline underline-offset-4">
          Back to Your Future
        </Link>
      </div>
    );
  }

  async function handleAdd() {
    if (!user || !profile || !supabase || !career) return;
    setSaving(true);
    const isFirstEver = careerPaths.length === 0;
    await supabase
      .from("career_paths")
      .upsert(
        { user_id: user.id, career_slug: career.slug, match_percent: percent, is_primary: isFirstEver },
        { onConflict: "user_id,career_slug" }
      );
    await awardXP(supabase, user.id, profile, { xp_career: 25 });
    if (isFirstEver) await awardAchievementOnce(supabase, user.id, "career_path_chosen");
    await Promise.all([refreshProfile(), refetch()]);
    setSaving(false);
    setJustAdded(true);
  }

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted">
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand">
          <career.icon className="h-7 w-7 text-white" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-snug text-foreground">{career.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{career.tagline}</p>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Why this matches you</p>
            <span className="shrink-0 text-lg font-bold text-accent">{percent}% match</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{career.whyItMatches}</p>
        </CardContent>
      </Card>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">School subjects</h2>
        <Card>
          <CardContent className="space-y-3 p-5">
            {career.subjects.map((s) => (
              <div key={s.subject} className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{s.subject}</span>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={i < s.stars ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4 text-border-strong"}
                    />
                  ))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Skills to build</h2>
        <div className="flex flex-wrap gap-1.5">
          {career.skills.map((skill) => (
            <Badge key={skill} tone="accent">
              {skill}
            </Badge>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Projects to try</h2>
        <Card>
          <CardContent className="p-5">
            <ol className="space-y-3">
              {career.projects.map((project, i) => (
                <li key={project} className="flex gap-3 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-caption font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{project}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Try now</h2>
        <ul className="space-y-2">
          {career.tryNow.map((item) => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Education routes</h2>
        <ul className="space-y-1.5">
          {career.educationRoutes.map((route) => (
            <li key={route} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
              <span className="leading-relaxed">{route}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Career progression</h2>
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {career.progression.map((stage, i) => (
            <div key={stage} className="flex shrink-0 items-center gap-2">
              <span className="whitespace-nowrap rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground">
                {stage}
              </span>
              {i < career.progression.length - 1 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8">
        {alreadyAdded ? (
          <Button size="lg" className="w-full" disabled>
            <Check className="h-4 w-4" />
            Added to your path
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={handleAdd} disabled={saving}>
            {saving ? "Adding…" : "Add This Career To My Path"}
          </Button>
        )}
      </div>
    </div>
  );
}
