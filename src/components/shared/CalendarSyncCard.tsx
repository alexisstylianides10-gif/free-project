"use client";

import { useState } from "react";
import { CalendarPlus, Copy, Check, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/branding";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * One-time-subscribe calendar feed: the URL itself (via /api/calendar/
 * [token]) regenerates its contents on every fetch, so a student's phone/
 * computer calendar app stays in sync with new exams/homework automatically
 * once they've added it — no manual re-export needed each time a deadline
 * changes.
 */
export function CalendarSyncCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!profile?.calendar_token) return null;

  const httpsUrl = `${siteUrl}/api/calendar/${profile.calendar_token}`;
  // webcal:// is the URI scheme calendar apps recognize as "subscribe to
  // this feed" (vs. https://, which most calendar apps just download once).
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, non-HTTPS context)
      // — the link is still visible on screen to copy manually.
    }
  }

  async function regenerate() {
    if (!supabase || !user || regenerating) return;
    if (!confirm("Get a new calendar link? Your old link will stop working, so you'll need to re-add the new one to your calendar app.")) return;
    setRegenerating(true);
    try {
      await supabase.from("profiles").update({ calendar_token: crypto.randomUUID() }).eq("id", user.id);
      await refreshProfile();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card className="border-accent/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <CalendarPlus className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Sync to your calendar</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add this link once in Google Calendar, Apple Calendar, or Outlook — it updates automatically as deadlines change.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-muted px-3 py-2 text-2xs text-muted-foreground">{webcalUrl}</code>
          <Button variant="secondary" size="sm" onClick={copyLink} aria-label="Copy calendar link">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="mt-2.5 flex items-center gap-1 text-2xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" /> Get a new link
        </button>
      </CardContent>
    </Card>
  );
}
