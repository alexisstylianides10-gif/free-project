"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import {
  CalendarEventRow,
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
} from "@/lib/calendarEvents";

type View = "day" | "week" | "month";

function rangeFor(view: View, anchor: Date) {
  if (view === "day") return { from: anchor, to: addDays(anchor, 1) };
  if (view === "week") return { from: startOfWeek(anchor), to: addDays(endOfWeek(anchor), 1) };
  return { from: startOfWeek(startOfMonth(anchor)), to: addDays(endOfWeek(endOfMonth(anchor)), 1) };
}

export default function CalendarPage() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalEvent, setModalEvent] = useState<CalendarEventRow | "new" | null>(null);
  const [newEventAt, setNewEventAt] = useState<Date>(new Date());

  function openNewEvent(at: Date) {
    setNewEventAt(at);
    setModalEvent("new");
  }

  const { from, to } = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listEvents(from.toISOString(), to.toISOString());
      setEvents(rows);
    } catch {
      setError("Couldn't load your calendar. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    reload();
  }, [reload]);

  function shift(dir: 1 | -1) {
    if (view === "day") setAnchor((d) => addDays(d, dir));
    else if (view === "week") setAnchor((d) => addWeeks(d, dir));
    else setAnchor((d) => addMonths(d, dir));
  }

  const title =
    view === "day"
      ? format(anchor, "EEEE, MMMM d")
      : view === "week"
        ? `${format(startOfWeek(anchor), "MMM d")} – ${format(endOfWeek(anchor), "MMM d, yyyy")}`
        : format(anchor, "MMMM yyyy");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="text-[13.5px] text-muted-foreground">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => openNewEvent(anchor)}>
            <Plus className="h-3.5 w-3.5" /> New event
          </Button>
        </div>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {loading ? (
        <Card className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading...</Card>
      ) : view === "month" ? (
        <MonthGrid
          anchor={anchor}
          events={events}
          onDayClick={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      ) : (
        <TimeGrid
          days={view === "day" ? [startOfDay(anchor)] : eachDayOfInterval({ start: startOfWeek(anchor), end: endOfWeek(anchor) })}
          events={events}
          onEdit={setModalEvent}
          onCreateAt={openNewEvent}
        />
      )}

      {modalEvent && (
        <EventModal
          value={modalEvent}
          defaultDate={newEventAt}
          onClose={() => setModalEvent(null)}
          onSaved={() => {
            setModalEvent(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

const HOUR_HEIGHT = 60; // px per hour
const GRID_HOURS = Array.from({ length: 24 }, (_, i) => i);

interface PositionedEvent {
  event: CalendarEventRow;
  top: number;
  height: number;
  col: number;
  cols: number;
}

/** Greedy same-day overlap layout: events that overlap in time share columns,
 * like a real calendar, so nothing visually collides. */
function layoutDayEvents(dayEvents: CalendarEventRow[]): PositionedEvent[] {
  const sorted = [...dayEvents].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const result: PositionedEvent[] = [];
  let cluster: CalendarEventRow[] = [];
  let clusterEnd = -Infinity;

  function flush() {
    if (!cluster.length) return;
    const colEndTimes: number[] = [];
    const assigned: { event: CalendarEventRow; col: number }[] = [];
    for (const ev of cluster) {
      const start = new Date(ev.start_time).getTime();
      let col = colEndTimes.findIndex((endTime) => endTime <= start);
      if (col === -1) {
        col = colEndTimes.length;
        colEndTimes.push(0);
      }
      colEndTimes[col] = new Date(ev.end_time).getTime();
      assigned.push({ event: ev, col });
    }
    const cols = colEndTimes.length;
    for (const { event, col } of assigned) {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT;
      const height = Math.max(((end.getTime() - start.getTime()) / 3_600_000) * HOUR_HEIGHT, 24);
      result.push({ event, top, height, col, cols });
    }
    cluster = [];
  }

  for (const ev of sorted) {
    const start = new Date(ev.start_time).getTime();
    if (cluster.length && start >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, new Date(ev.end_time).getTime());
  }
  flush();
  return result;
}

function TimeGrid({
  days,
  events,
  onEdit,
  onCreateAt,
}: {
  days: Date[];
  events: CalendarEventRow[];
  onEdit: (e: CalendarEventRow) => void;
  onCreateAt: (at: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (today.getHours() - 2) * HOUR_HEIGHT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  return (
    <Card className="overflow-hidden p-0">
      {days.length > 1 && (
        <div className="flex border-b border-border pl-14">
          {days.map((day) => (
            <div key={day.toISOString()} className="flex-1 border-l border-border py-2 text-center">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                {format(day, "EEE")}
              </p>
              <p
                className={cn(
                  "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px]",
                  isSameDay(day, today) ? "bg-accent font-semibold text-accent-foreground" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="flex max-h-[600px] overflow-y-auto">
        <div className="w-14 shrink-0">
          {GRID_HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
              {h > 0 && (
                <span className="absolute -top-2 right-2 text-[10.5px] text-muted-foreground">
                  {format(setHours(today, h), "h a")}
                </span>
              )}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), day));
          const positioned = layoutDayEvents(dayEvents);
          const isToday = isSameDay(day, today);
          const nowTop = (today.getHours() + today.getMinutes() / 60) * HOUR_HEIGHT;
          return (
            <div
              key={day.toISOString()}
              className="relative flex-1 border-l border-border"
              style={{ height: HOUR_HEIGHT * 24 }}
            >
              {GRID_HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => onCreateAt(setMinutes(setHours(day, h), 0))}
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  className="absolute inset-x-0 border-t border-border/60 hover:bg-muted/40"
                  aria-label={`New event at ${format(setHours(day, h), "h a")} on ${format(day, "EEEE, MMM d")}`}
                />
              ))}
              {isToday && (
                <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                  <div className="h-px bg-danger" />
                  <div className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-danger" />
                </div>
              )}
              {positioned.map(({ event, top, height, col, cols }) => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(event);
                  }}
                  style={{
                    top,
                    height,
                    left: `${(col / cols) * 100}%`,
                    width: `${(1 / cols) * 100}%`,
                  }}
                  className="absolute z-[5] overflow-hidden rounded-md border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-left text-accent transition-colors hover:brightness-95"
                >
                  <p className="truncate text-[10.5px] font-medium leading-tight">{event.title}</p>
                  <p className="truncate text-[9px] leading-tight opacity-80">{format(new Date(event.start_time), "h:mm a")}</p>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MonthGrid({
  anchor,
  events,
  onDayClick,
}: {
  anchor: Date;
  events: CalendarEventRow[];
  onDayClick: (d: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor)),
    end: endOfWeek(endOfMonth(anchor)),
  });

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="px-1 pb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), day));
        const inMonth = isSameMonth(day, anchor);
        const isToday = isSameDay(day, new Date());
        return (
          <button
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={`flex min-h-[64px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors hover:bg-muted ${
              inMonth ? "border-border" : "border-transparent opacity-40"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] ${
                isToday ? "bg-accent text-accent-foreground" : "text-foreground"
              }`}
            >
              {format(day, "d")}
            </span>
            {dayEvents.slice(0, 2).map((e) => (
              <span key={e.id} className="w-full truncate rounded bg-accent-soft px-1 text-[10px] text-accent">
                {e.title}
              </span>
            ))}
            {dayEvents.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>}
          </button>
        );
      })}
    </div>
  );
}

function EventModal({
  value,
  defaultDate,
  onClose,
  onSaved,
}: {
  value: CalendarEventRow | "new";
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = value === "new";
  const existing = isNew ? null : value;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [start, setStart] = useState(toLocalInput(existing ? new Date(existing.start_time) : roundToHour(defaultDate)));
  const [end, setEnd] = useState(
    toLocalInput(existing ? new Date(existing.end_time) : addHour(roundToHour(defaultDate)))
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setFormError("Give the event a title.");
      return;
    }
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      setFormError("End time has to be after start time.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (isNew) {
        await createEvent({ title: title.trim(), start_time: startIso, end_time: endIso, notes: notes.trim() || undefined });
      } else {
        await updateEvent(existing!.id, { title: title.trim(), start_time: startIso, end_time: endIso, notes: notes.trim() || null });
      }
      onSaved();
    } catch {
      setFormError("Couldn't save that event. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      await deleteEvent(existing.id);
      onSaved();
    } catch {
      setFormError("Couldn't delete that event. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? "New event" : "Edit event"}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-muted-foreground">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Dentist appointment"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-muted-foreground">Starts</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-muted-foreground">Ends</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-muted-foreground">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {formError && <p className="text-[12.5px] text-danger">{formError}</p>}

        <div className="flex items-center justify-between pt-1">
          {!isNew ? (
            <Button variant="danger" size="sm" disabled={busy} onClick={remove} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {isNew ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function roundToHour(d: Date) {
  const copy = new Date(d);
  const onTheHour = copy.getMinutes() === 0 && copy.getSeconds() === 0 && copy.getMilliseconds() === 0;
  copy.setMinutes(0, 0, 0);
  if (!onTheHour) copy.setHours(copy.getHours() + 1);
  return copy;
}
function addHour(d: Date) {
  return new Date(d.getTime() + 60 * 60 * 1000);
}
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
