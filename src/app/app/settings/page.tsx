"use client";

import { useEffect, useState } from "react";
import { Download, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { planLimits } from "@/lib/billing/plans";
import { usePushNotifications } from "@/lib/push/usePushNotifications";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const THEMES = ["system", "light", "dark"] as const;

export default function SettingsPage() {
  const profile = useAlxioum((s) => s.profile);
  const authUserId = useAlxioum((s) => s.authUserId);
  const updateProfile = useAlxioum((s) => s.updateProfile);
  const signOut = useAlxioum((s) => s.signOut);

  const [name, setName] = useState(profile?.name ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "UTC");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? "");
    setTimezone(profile?.timezone ?? "UTC");
  }, [profile?.name, profile?.timezone]);

  if (!profile) return null;

  const plan = planLimits(profile.plan);
  const isUnlimited = !Number.isFinite(plan.aiMessagesPerMonth);
  const usagePct = isUnlimited ? 0 : Math.min(100, Math.round((profile.aiMessagesUsed / plan.aiMessagesPerMonth) * 100));
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
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Settings</h1>
      </div>

      <FadeIn index={0}>
      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Profile</p>
          <div className="grid gap-3 sm:grid-cols-2">
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
              {profile.proInterestAt ? (
                <p className="mt-2 text-[12.5px] text-accent">Thanks — we&apos;ll let you know when billing is open.</p>
              ) : (
                <Button size="sm" className="mt-2" onClick={() => updateProfile({ proInterestAt: new Date().toISOString() })}>
                  <Sparkles className="h-3.5 w-3.5" /> Interested in {upgradeTarget.name}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </FadeIn>

      <FadeIn index={2}>
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

      <FadeIn index={3}>
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
