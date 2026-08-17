"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { DayGrid } from "@/components/domain/DayGrid";
import { WeekAgenda } from "@/components/domain/WeekAgenda";
import { MonthGrid } from "@/components/domain/MonthGrid";
import { EventEditModal } from "@/components/domain/EventEditModal";
import { useAlxioum } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";
import { addDaysISO, eventOccursOn, formatDayLabel, todayISO } from "@/lib/utils";

const SYNC_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Best-effort — a no-op if Google Calendar isn't connected. Throttled per
 * browser tab so revisiting Calendar doesn't hammer the API. If the sync
 * itself fails, checks whether it's specifically because the connection
 * needs reconnecting (vs. a transient network blip) so the page can show a
 * real banner instead of staying silently stale forever.
 */
function useAutoSyncGoogleCalendar() {
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  useEffect(() => {
    const lastSync = Number(sessionStorage.getItem("alxioum:lastGoogleSync") ?? 0);
    if (Date.now() - lastSync < SYNC_THROTTLE_MS) return;
    sessionStorage.setItem("alxioum:lastGoogleSync", String(Date.now()));
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/calendar/google/sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (res?.ok) {
        const result = await res.json();
        if (result.imported > 0 || result.updated > 0 || result.removed > 0) refreshAll();
        return;
      }
      try {
        const statusRes = await fetch("/api/calendar/google/status", { headers: { Authorization: `Bearer ${token}` } });
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.connected && status.needsReconnect) setNeedsReconnect(true);
        }
      } catch {
        // best-effort — leave the banner off if we can't even check
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { needsReconnect };
}

type ViewMode = "day" | "week" | "month";

function startOfWeekISO(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  return addDaysISO(iso, -day);
}

export default function CalendarPage() {
  const events = useAlxioum((s) => s.events);
  const { needsReconnect } = useAutoSyncGoogleCalendar();
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(todayISO());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const weekStart = useMemo(() => startOfWeekISO(anchor), [anchor]);
  const dayEvents = useMemo(() => events.filter((e) => eventOccursOn(e, anchor)).sort((a, b) => a.startTime.localeCompare(b.startTime)), [events, anchor]);

  function shift(delta: number) {
    if (view === "day") setAnchor(addDaysISO(anchor, delta));
    else if (view === "week") setAnchor(addDaysISO(anchor, delta * 7));
    else {
      const d = new Date(anchor + "T00:00:00");
      d.setMonth(d.getMonth() + delta);
      setAnchor(d.toISOString().slice(0, 10));
    }
  }

  function openNew(date?: string) {
    setEditing(null);
    setDefaultDate(date ?? anchor);
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setModalOpen(true);
  }

  const heading = view === "day" ? formatDayLabel(anchor) : view === "week" ? `Week of ${formatDayLabel(weekStart)}` : new Date(anchor + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      {needsReconnect && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning">
          <span className="flex items-center gap-1.5">
            <TriangleAlert className="h-4 w-4 shrink-0" /> Your Google Calendar connection needs to be reconnected — changes aren&apos;t syncing.
          </span>
          <Link href="/app/settings" className="shrink-0 font-semibold underline underline-offset-2">
            Reconnect
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Calendar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{heading}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border">
            <button onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setAnchor(todayISO())} className="px-2.5 text-[12.5px] font-medium text-foreground hover:bg-muted h-8">
              Today
            </button>
            <button onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${view}-${anchor}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {view === "day" && <DayGrid date={anchor} events={dayEvents} onEventClick={openEdit} />}
          {view === "week" && <WeekAgenda weekStart={weekStart} events={events} onEventClick={openEdit} onAddDay={openNew} />}
          {view === "month" && (
            <MonthGrid
              monthISO={anchor}
              events={events}
              onDayClick={(date) => {
                setAnchor(date);
                setView("day");
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <EventEditModal event={editing} open={modalOpen} onOpenChange={setModalOpen} defaultDate={defaultDate} />
    </div>
  );
}
