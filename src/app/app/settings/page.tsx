"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Download, FlaskConical, LogOut, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/FadeIn";
import { CalendarConnectionCard } from "@/components/settings/CalendarConnectionCard";
import { BillingActions } from "@/components/settings/BillingActions";
import { CreditsPurchaseButtons } from "@/components/settings/CreditsPurchaseButtons";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { planLimits, PLANS } from "@/lib/billing/plans";
import { usePushNotifications } from "@/lib/push/usePushNotifications";
import type { Plan } from "@/lib/types";

const ALL_PLANS: Plan[] = ["Free", "Student", "Pro", "Max"];

// Billing isn't live yet, so plan changes still go through a direct,
// RLS-permitted profile update — there's no server-side gate that can tell
// "clicked this button" apart from "called the Supabase API directly" for
// that column. Hiding the switcher from everyone except the developer
// account at least stops an ordinary new signup from finding a free
// self-upgrade button; it is not a substitute for the real fix, which is
// routing plan changes through a service-role-only path once Stripe lands.
const PLAN_SWITCHER_EMAILS = ["alexis.stylianides10@gmail.com"];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const THEMES = ["system", "light", "dark"] as const;

export default function SettingsPage() {
  const profile = useAlxioum((s) => s.profile);
  const authUserId = useAlxioum((s) => s.authUserId);
  const updateProfile = useAlxioum((s) => s.updateProfile);
  const signOut = useAlxioum((s) => s.signOut);
  const refreshAll = useAlxioum((s) => s.refreshAll);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(profile?.name ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "UTC");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [calendarBanner, setCalendarBanner] = useState<{ kind: "connected" | "error"; message?: string } | null>(null);

  useEffect(() => {
    setName(profile?.name ?? "");
    setTimezone(profile?.timezone ?? "UTC");
  }, [profile?.name, profile?.timezone]);

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (calendar) {
      setCalendarBanner(calendar === "connected" ? { kind: "connected" } : { kind: "error", message: searchParams.get("message") ?? undefined });
      if (calendar === "connected") refreshAll();
    }
    const billing = searchParams.get("billing");
    if (billing === "success") refreshAll();
    if (calendar || billing) router.replace("/app/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return null;

  const plan = planLimits(profile.plan);
  const isUnlimited = !Number.isFinite(plan.aiMessagesPerMonth);
  const usagePct = isUnlimited ? 0 : Math.min(100, Math.round((profile.aiMessagesUsed / plan.aiMessagesPerMonth) * 100));
  // Student isn't a rung below Max on this ladder — it's Study tools at a
  // discount, and Max doesn't include Study. So Student users don't get an
  // "upgrade to Max" prompt; that would read as a step up but actually
  // drops the thing that plan is for.
  const upgradeTarget = profile.plan === "Free" ? planLimits("Pro") : profile.plan === "Pro" ? planLimits("Max") : null;

  async function exportData() {
    if (!authUserId) return;
    setExporting(true);
    const data = await db.exportAllUserData(authUserId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alxioum-data.json";
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function deleteEverything() {
    if (!authUserId) return;
    if (!confirm("Delete ALL your Alxioum data — calendar, tasks, memory, chat history, and activity? This cannot be undone.")) return;
    setDeleting(true);
    await db.deleteAllUserContent(authUserId);
    setDeleting(false);
    window.location.href = "/app/today";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Settings</h1>
      </div>

      {calendarBanner && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[13px] ${
            calendarBanner.kind === "connected" ? "border-success/30 bg-success-soft text-success" : "border-danger/30 bg-danger-soft text-danger"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {calendarBanner.kind === "connected" ? "Google Calendar connected." : `Couldn't connect Google Calendar: ${calendarBanner.message ?? "Something went wrong."}`}
          </span>
          <button onClick={() => setCalendarBanner(null)} className="shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <FadeIn index={0}>
      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Profile</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted-foreground">Name</span>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && updateProfile({ name: name.trim() })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-muted-foreground">Timezone</span>
              <input className={inputClass} value={timezone} onChange={(e) => setTimezone(e.target.value)} onBlur={() => timezone.trim() && updateProfile({ timezone: timezone.trim() })} />
            </label>
          </div>
          <div>
            <span className="mb-1.5 block text-[12.5px] text-muted-foreground">Theme</span>
            <div className="flex gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => updateProfile({ theme: t })}
                  className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                    profile.theme === t ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </CardContent>
      </Card>
      </FadeIn>

      <FadeIn index={1}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Plan &amp; usage</p>
            <Badge tone={profile.plan === "Free" ? "neutral" : "accent"}>{profile.plan}</Badge>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[12.5px] text-muted-foreground">
              <span>AI actions this month</span>
              <span>{isUnlimited ? `${profile.aiMessagesUsed} used · Unlimited` : `${profile.aiMessagesUsed} / ${plan.aiMessagesPerMonth}`}</span>
            </div>
            {!isUnlimited && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${usagePct}%` }} />
              </div>
            )}
          </div>
          {upgradeTarget && (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-[13px] font-medium text-foreground">
                {upgradeTarget.name} — €{upgradeTarget.priceMonthlyEUR}/month
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-muted-foreground">
                {upgradeTarget.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <div className="mt-2">
                <BillingActions upgradeTarget={upgradeTarget} hasStripeCustomer={false} />
              </div>
            </div>
          )}
          {profile.plan !== "Free" && <BillingActions upgradeTarget={null} hasStripeCustomer={Boolean(profile.stripeCustomerId)} />}
        </CardContent>
      </Card>
      </FadeIn>

      <FadeIn index={2}>
        <CalendarConnectionCard />
      </FadeIn>

      <FadeIn index={3}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Buy more AI actions</p>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Running low before your plan renews? Buy extra AI actions without changing your plan
            {profile.creditsBalance > 0 && ` — you have ${profile.creditsBalance.toLocaleString()} credited now.`}
          </p>
          <CreditsPurchaseButtons />
        </CardContent>
      </Card>
      </FadeIn>

      {PLAN_SWITCHER_EMAILS.includes(profile.email) && (
        <FadeIn index={4}>
        <Card className="border-dashed border-accent/40 bg-accent-soft/20">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-accent" />
              <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">Testing — plan switcher</p>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Billing isn&apos;t live yet, so you can freely switch your own account between plans to test the app. This
              panel will be removed once Alxioum publishes real payments.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PLANS.map((p) => (
                <button
                  key={p}
                  onClick={() => updateProfile({ plan: p })}
                  className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    profile.plan === p ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {PLANS[p].name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        </FadeIn>
      )}

      <FadeIn index={5}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
          <ToggleRow
            label="Deadline reminders"
            checked={profile.notificationPrefs.deadlines}
            onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, deadlines: v } })}
          />
          <ToggleRow
            label="Free-time / schedule gap suggestions"
            checked={profile.notificationPrefs.scheduleGaps}
            onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, scheduleGaps: v } })}
          />
          <ToggleRow
            label="Daily briefing"
            checked={profile.notificationPrefs.dailyBriefing}
            onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, dailyBriefing: v } })}
          />
          <div className="my-1 border-t border-border" />
          <PushNotificationRow />
        </CardContent>
      </Card>
      </FadeIn>

      <FadeIn index={6}>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">What Alxioum knows</p>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Your calendar events, tasks, memories, and activity history are stored so Alxioum can act on them. You can export or
            delete everything at any time. Review individual items on the Calendar, Tasks, and Memory pages.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportData} disabled={exporting}>
              <Download className="h-3.5 w-3.5" /> {exporting ? "Preparing…" : "Export my data"}
            </Button>
            <Button variant="danger" size="sm" onClick={deleteEverything} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete all my data"}
            </Button>
          </div>
        </CardContent>
      </Card>
      </FadeIn>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13.5px] text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PushNotificationRow() {
  const { supported, subscribed, busy, error, subscribe, unsubscribe, sendTest } = usePushNotifications();

  if (!supported) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] text-muted-foreground">Push notifications on this device</span>
          <span className="text-[12px] text-muted-foreground">Not supported here</span>
        </div>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          On iPhone/iPad, add Alxioum to your Home Screen first (Safari doesn&apos;t allow push in a regular browser tab).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] text-foreground">Push notifications on this device</span>
        <Switch checked={subscribed} onCheckedChange={(v) => (v ? subscribe() : unsubscribe())} disabled={busy} />
      </div>
      {subscribed && (
        <button onClick={sendTest} disabled={busy} className="text-[12.5px] font-medium text-accent underline underline-offset-2 disabled:opacity-50">
          Send a test notification
        </button>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
