"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Sun, CalendarClock, ArrowRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarEventRow, listEvents } from "@/lib/calendarEvents";
import { buildDailyBriefing } from "@/lib/briefing";
import { useAlxioum } from "@/lib/store";

export default function MyDayPage() {
  const router = useRouter();
  const profile = useAlxioum((s) => s.profile);
  const [events, setEvents] = useState<CalendarEventRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setDate(to.getDate() + 1);
        to.setHours(23, 59, 59, 999);
        const rows = await listEvents(from.toISOString(), to.toISOString());
        if (!cancelled) setEvents(rows);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const briefing = useMemo(() => (events ? buildDailyBriefing(events, now) : null), [events, now]);

  function ask(text: string) {
    router.push(`/app?q=${encodeURIComponent(text)}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">My Day</h1>
        <p className="text-[13.5px] text-muted-foreground">{format(now, "EEEE, MMMM d")}</p>
      </div>

      {loading ? (
        <Card className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading...</Card>
      ) : error ? (
        <Card className="p-5">
          <p className="text-[13.5px] text-foreground">Your calendar couldn&apos;t be loaded right now.</p>
        </Card>
      ) : !briefing || briefing.isClear ? (
        <EmptyState
          icon={Sun}
          title="My Day is clear"
          body="Nothing scheduled today or tomorrow. Ask Alxioum to add something whenever you're ready."
          action={
            <Button size="sm" variant="outline" onClick={() => ask("")}>
              Open chat
            </Button>
          }
        />
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className="p-5">
              <p className="text-[16px] font-semibold text-foreground">
                {briefing.greeting} {profile.name?.split(" ")[0] ? `Here's your day, ${profile.name.split(" ")[0]}.` : "Here's your day."}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {briefing.todayRemaining.length === 0
                  ? briefing.todayCompleted.length > 0
                    ? "Nothing left on today's schedule."
                    : "Nothing scheduled for the rest of today."
                  : `You have ${briefing.todayRemaining.length} event${briefing.todayRemaining.length === 1 ? "" : "s"} left today.`}
              </p>
            </Card>
          </motion.div>

          {briefing.todayRemaining.length > 0 && (
            <Section title="Today">
              <div className="space-y-2">
                {briefing.todayRemaining.map((e, i) => (
                  <EventRow key={e.id} event={e} index={i} onAsk={ask} />
                ))}
              </div>
            </Section>
          )}

          {briefing.freeGaps.length > 0 && (
            <div className="space-y-1.5">
              {briefing.freeGaps.map((g, i) => (
                <p key={i} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  You appear to have free time from {format(g.start, "h:mm a")} to {format(g.end, "h:mm a")}.
                </p>
              ))}
            </div>
          )}

          {briefing.todayCompleted.length > 0 && (
            <p className="text-[12px] text-muted-foreground">
              {briefing.todayCompleted.length} earlier today: {briefing.todayCompleted.map((e) => e.title).join(", ")}
            </p>
          )}

          {briefing.tomorrow.length > 0 && (
            <Section title="Tomorrow">
              <div className="space-y-2">
                {briefing.tomorrow.map((e, i) => (
                  <EventRow key={e.id} event={e} index={i} onAsk={ask} />
                ))}
              </div>
            </Section>
          )}

          <button
            onClick={() => ask("Add ")}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Add something
          </button>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function EventRow({ event, index, onAsk }: { event: CalendarEventRow; index: number; onAsk: (text: string) => void }) {
  const when = `${format(new Date(event.start_time), "h:mm a")}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 6) * 0.03 }}
    >
      <Card className="flex flex-wrap items-center justify-between gap-2 p-3.5">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-foreground">{event.title}</p>
          <p className="text-[12px] text-muted-foreground">
            {when} – {format(new Date(event.end_time), "h:mm a")}
            {event.notes ? ` · ${event.notes}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[12px]"
            onClick={() => onAsk(`Move my "${event.title}" event (today at ${when}) to `)}
          >
            Move
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[12px] text-danger"
            onClick={() => onAsk(`Cancel my "${event.title}" event today at ${when}.`)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 justify-center px-0"
            aria-label="Ask Alxioum about this"
            onClick={() => onAsk(`About my "${event.title}" event today at ${when}: `)}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
