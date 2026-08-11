"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  User,
  Palette,
  Bell,
  Lock,
  ShieldCheck,
  Sparkles,
  BrainCircuit,
  Plug,
  CreditCard,
  Database,
  Check,
  Download,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { backendConfigured, useAlxioum } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProactivityLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "account", label: "Account", icon: User },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "privacy", label: "Privacy", icon: Lock },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "memory", label: "Memory", icon: BrainCircuit },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "data", label: "Data", icon: Database },
];

const INTEGRATIONS = [
  { name: "Google Calendar", access: "Read and write calendar events", action: "Sync your schedule both ways" },
  { name: "Google Drive", access: "Read files you choose to share", action: "Pull documents into your library" },
  { name: "Gmail", access: "Read subject lines and dates you approve", action: "Surface action items and deadlines" },
  { name: "Microsoft Outlook", access: "Read and write calendar events", action: "Sync your schedule both ways" },
  { name: "Microsoft Calendar", access: "Read and write calendar events", action: "Sync your schedule both ways" },
  { name: "Apple Calendar", access: "Read and write calendar events", action: "Sync your schedule both ways" },
  { name: "Slack", access: "Read messages you flag", action: "Turn messages into tasks" },
  { name: "Notion", access: "Read and write pages you select", action: "Two-way sync with your workspace" },
];

const PLANS = [
  { name: "Free" as const, price: "€0", features: ["Core Alxioum features", "Up to 3 agents", "7-day AI history"] },
  { name: "Pro" as const, price: "€9/mo", features: ["Unlimited agents", "Full AI history", "Document AI analysis", "Priority insights"] },
  { name: "Ultra" as const, price: "€19/mo", features: ["Everything in Pro", "Advanced automations", "Early access features", "Priority support"] },
];

export default function SettingsPage() {
  const profile = useAlxioum((s) => s.profile);
  const updateProfile = useAlxioum((s) => s.updateProfile);
  const chat = useAlxioum((s) => s.chat);
  const authEmail = useAlxioum((s) => s.authEmail);
  const signOut = useAlxioum((s) => s.signOut);
  const [section, setSection] = useState("account");
  const exportRef = useRef<HTMLAnchorElement>(null);

  function exportData() {
    const state = useAlxioum.getState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    if (exportRef.current) {
      exportRef.current.href = url;
      exportRef.current.download = "lifeos-data.json";
      exportRef.current.click();
    }
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-[13.5px] text-muted-foreground">Manage your account, privacy, and how Alxioum behaves.</p>
      </div>

      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="w-full flex-wrap justify-start gap-1 md:w-auto">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="mt-4 space-y-3">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar initials={profile.avatarInitials} size="lg" />
                <div>
                  <p className="text-[15px] font-semibold text-foreground">{profile.name}</p>
                  <p className="text-[13px] text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              {backendConfigured && authEmail && (
                <Badge tone="success">Synced account</Badge>
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={profile.name} onChange={(v) => updateProfile({ name: v })} />
              <Field label="Email" value={profile.email} onChange={(v) => updateProfile({ email: v })} />
              <Field label="Timezone" value={profile.timezone} onChange={(v) => updateProfile({ timezone: v })} />
              <Field label="Location" value={profile.location} onChange={(v) => updateProfile({ location: v })} />
            </div>
          </Card>

          {backendConfigured && authEmail ? (
            <Card className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-[13.5px] font-medium text-foreground">Signed in as {authEmail}</p>
                <p className="text-[12.5px] text-muted-foreground">Your data is saved to your account and synced automatically.</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => signOut()}>
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </Button>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-[13px] text-muted-foreground">
                This app isn&apos;t connected to a backend yet — you&apos;re using local demo data that resets on refresh.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <Card className="p-5">
            <p className="text-[13.5px] font-semibold text-foreground">Theme</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">The design system stays consistent — only light and dark tone shift.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateProfile({ theme: t })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                    profile.theme === t ? "border-accent bg-accent-soft" : "border-border hover:bg-muted"
                  )}
                >
                  <span className={cn("text-[13px] font-medium capitalize", profile.theme === t ? "text-accent" : "text-foreground")}>{t}</span>
                </button>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="divide-y divide-border">
            <PrefRow
              label="Deadline reminders"
              body="Get notified when a task or exam deadline is approaching."
              checked={profile.notificationPrefs.deadlines}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, deadlines: v } })}
            />
            <PrefRow
              label="Finance alerts"
              body="Get notified about bills, subscriptions, and budget limits."
              checked={profile.notificationPrefs.financeAlerts}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, financeAlerts: v } })}
            />
            <PrefRow
              label="Schedule gaps"
              body="Get notified when Alxioum finds useful free time in your day."
              checked={profile.notificationPrefs.scheduleGaps}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, scheduleGaps: v } })}
            />
            <PrefRow
              label="Goal nudges"
              body="Get notified if a goal hasn't had progress in a while."
              checked={profile.notificationPrefs.goalNudges}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, goalNudges: v } })}
            />
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-4">
          <Card className="space-y-3 p-5">
            <p className="text-[13.5px] font-semibold text-foreground">Your data, visible to you</p>
            <p className="text-[13px] text-muted-foreground">
              {backendConfigured && authEmail
                ? "Your data is stored in your own account, protected by row-level security so only you can read or write it. Nothing here is shared with anyone else, and no third party (including the app's developer) can query other users' data through the app."
                : "This app isn't connected to a backend yet — everything shown lives only in this browser session and is not sent anywhere. Once connected, this section will control exactly what Alxioum can read, how long data is kept, and who it's shared with."}
            </p>
            <Link href="/memory" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:opacity-80">
              Review what Alxioum remembers <Sparkles className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="divide-y divide-border">
            {[
              {
                label: "Password",
                body:
                  backendConfigured && authEmail
                    ? "Managed by your account's authentication provider."
                    : "Not available — connect a backend first.",
              },
              { label: "Two-factor authentication", body: "Not built yet — on the roadmap." },
              { label: "Active sessions", body: "Not built yet — on the roadmap." },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-[13.5px] font-medium text-foreground">{row.label}</p>
                  <p className="text-[12px] text-muted-foreground">{row.body}</p>
                </div>
                <Button size="sm" variant="outline" disabled>
                  Manage
                </Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card className="p-5">
            <p className="text-[13.5px] font-semibold text-foreground">How proactive should Alxioum be?</p>
            <div className="mt-3 space-y-2">
              {(
                [
                  { key: "low", title: "Low", body: "Only notify when necessary." },
                  { key: "balanced", title: "Balanced", body: "Suggest useful actions." },
                  { key: "high", title: "High", body: "Actively plan and recommend things." },
                ] as { key: ProactivityLevel; title: string; body: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => updateProfile({ proactivity: opt.key })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-colors",
                    profile.proactivity === opt.key ? "border-accent bg-accent-soft" : "border-border hover:bg-muted"
                  )}
                >
                  <div>
                    <p className="text-[13.5px] font-medium text-foreground">{opt.title}</p>
                    <p className="text-[12.5px] text-muted-foreground">{opt.body}</p>
                  </div>
                  {profile.proactivity === opt.key && <Check className="h-4 w-4 shrink-0 text-accent" />}
                </button>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="mt-4">
          <Card className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-[13.5px] font-semibold text-foreground">Alxioum Memory</p>
              <p className="text-[12.5px] text-muted-foreground">Manage exactly what Alxioum remembers about you.</p>
            </div>
            <Link href="/memory">
              <Button size="sm" variant="outline">
                Open Memory
              </Button>
            </Link>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {INTEGRATIONS.map((i) => (
              <Card key={i.name} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-foreground">{i.name}</p>
                  <Badge tone="neutral">Coming soon</Badge>
                </div>
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                  <span className="font-medium text-foreground">Access:</span> {i.access}
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  <span className="font-medium text-foreground">Alxioum could:</span> {i.action}
                </p>
                <Button size="sm" variant="outline" className="mt-3" disabled>
                  Connect
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-4">
          <Card className="p-4">
            <p className="text-[12.5px] text-muted-foreground">
              All plans are unlocked in this testing environment — no payment method required.
            </p>
          </Card>
          <div className="grid gap-3 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card key={plan.name} className={cn("p-5", profile.plan === plan.name && "border-accent/50 ring-1 ring-accent/30")}>
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-semibold text-foreground">{plan.name}</p>
                  {profile.plan === plan.name && <Badge tone="accent">Current</Badge>}
                </div>
                <p className="mt-1 text-[20px] font-semibold text-foreground">{plan.price}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                      <Check className="h-3 w-3 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={profile.plan === plan.name ? "outline" : "primary"}
                  className="mt-4 w-full"
                  disabled={profile.plan === plan.name}
                  onClick={() => updateProfile({ plan: plan.name })}
                >
                  {profile.plan === plan.name ? "Current plan" : "Switch plan"}
                </Button>
              </Card>
            ))}
          </div>
          <Card className="p-4">
            <p className="text-[13px] font-medium text-foreground">Usage this session</p>
            <p className="text-[12.5px] text-muted-foreground">{chat.length} AI messages exchanged</p>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-3">
          <Card className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-[13.5px] font-medium text-foreground">Export your data</p>
              <p className="text-[12.5px] text-muted-foreground">Download everything Alxioum has stored for you as JSON.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={exportData}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </Card>
          <Card className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-[13.5px] font-medium text-foreground">
                {backendConfigured && authEmail ? "Reload my data" : "Reset to demo data"}
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                {backendConfigured && authEmail
                  ? "Refetches your latest saved data from your account."
                  : "Clears session changes and reloads the original demo state."}
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.location.reload()}>
              <RotateCcw className="h-3.5 w-3.5" /> {backendConfigured && authEmail ? "Reload" : "Reset"}
            </Button>
          </Card>
          <a ref={exportRef} className="hidden" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
    </label>
  );
}

function PrefRow({ label, body, checked, onChange }: { label: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-[13.5px] font-medium text-foreground">{label}</p>
        <p className="text-[12.5px] text-muted-foreground">{body}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
