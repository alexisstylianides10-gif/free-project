"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, RefreshCw, Unlink } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface Status {
  connected: boolean;
  configured: boolean;
  connectedAt?: string;
  lastSyncedAt?: string;
}

export function CalendarConnectionCard() {
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);

  const [status, setStatus] = useState<Status | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch("/api/calendar/google/status", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setConnecting(true);
    const token = await getAccessToken();
    if (!token) {
      setConnecting(false);
      return;
    }
    window.location.href = `/api/calendar/google/connect?token=${encodeURIComponent(token)}`;
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired.");
      const res = await fetch("/api/calendar/google/sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).error ?? "Sync failed.");
      await loadStatus();
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setSyncing(false);
  }

  async function disconnectCalendar() {
    if (!confirm("Disconnect Google Calendar? Events already synced into Alxioum will stay, but nothing will sync going forward.")) return;
    setDisconnecting(true);
    const token = await getAccessToken();
    if (token) {
      await fetch("/api/calendar/google/disconnect", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    await loadStatus();
    setDisconnecting(false);
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar connection…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Google Calendar
        </div>

        {!status.configured ? (
          <p className="text-[12.5px] text-muted-foreground">
            Google Calendar sync isn&apos;t set up on the server yet — this shows up once it is.
          </p>
        ) : status.connected ? (
          <>
            <div className="flex items-center gap-2 text-[13.5px] text-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-success">
                <Check className="h-3 w-3" />
              </span>
              Connected
              {status.lastSyncedAt && <span className="text-muted-foreground">· last synced {new Date(status.lastSyncedAt).toLocaleString()}</span>}
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              New events you create in Alxioum are added to your Google Calendar, and events from Google show up here too. Recurring events aren&apos;t synced yet.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}>
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
              <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={disconnectCalendar} disabled={disconnecting}>
                <Unlink className="h-3.5 w-3.5" /> Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12.5px] text-muted-foreground">
              Connect your Google Calendar so Alxioum can see your real schedule and add events it creates directly to your calendar.
            </p>
            <Button size="sm" onClick={connect} disabled={connecting}>
              {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
              Connect Google Calendar
            </Button>
          </>
        )}

        {error && <p className="text-[12px] text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
