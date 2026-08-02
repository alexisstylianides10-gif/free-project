"use client";

import { useState } from "react";
import { User, Palette, Bell, Lock, LogOut } from "lucide-react";
import { backendConfigured, useTriply } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "account", label: "Account", icon: User },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "privacy", label: "Privacy", icon: Lock },
];

export default function SettingsPage() {
  const profile = useTriply((s) => s.profile);
  const updateProfile = useTriply((s) => s.updateProfile);
  const authEmail = useTriply((s) => s.authEmail);
  const signOut = useTriply((s) => s.signOut);
  const [section, setSection] = useState("account");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-[13.5px] text-muted-foreground">Manage your account, privacy, and notifications.</p>
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
              {backendConfigured && authEmail && <Badge tone="success">Synced account</Badge>}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={profile.name} onChange={(v) => updateProfile({ name: v })} />
              <Field label="Email" value={profile.email} onChange={(v) => updateProfile({ email: v })} />
              <Field label="Home city" value={profile.homeCity} onChange={(v) => updateProfile({ homeCity: v })} />
            </div>
          </Card>

          {backendConfigured && authEmail ? (
            <Card className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-[13.5px] font-medium text-foreground">Signed in as {authEmail}</p>
                <p className="text-[12.5px] text-muted-foreground">Your trips are saved to your account and synced automatically.</p>
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
              label="Flight & booking changes"
              body="Get notified when a flight time or booking changes."
              checked={profile.notificationPrefs.flights}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, flights: v } })}
            />
            <PrefRow
              label="Polls"
              body="Get notified when someone starts a new group poll."
              checked={profile.notificationPrefs.polls}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, polls: v } })}
            />
            <PrefRow
              label="Itinerary conflicts"
              body="Get notified when two activities overlap."
              checked={profile.notificationPrefs.conflicts}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, conflicts: v } })}
            />
            <PrefRow
              label="Trip updates"
              body="Members joining, itinerary changes, and more."
              checked={profile.notificationPrefs.tripUpdates}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, tripUpdates: v } })}
            />
            <PrefRow
              label="Chat messages"
              body="Get notified about new trip chat messages."
              checked={profile.notificationPrefs.chat}
              onChange={(v) => updateProfile({ notificationPrefs: { ...profile.notificationPrefs, chat: v } })}
            />
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-4">
          <Card className="space-y-3 p-5">
            <p className="text-[13.5px] font-semibold text-foreground">Your data, visible to your group</p>
            <p className="text-[13px] text-muted-foreground">
              {backendConfigured && authEmail
                ? "Trip data is only visible to people you've added as travelers, protected by row-level security. No one outside your trip can read or write it."
                : "This app isn't connected to a backend yet — everything shown lives only in this browser session and is not sent anywhere."}
            </p>
          </Card>
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
