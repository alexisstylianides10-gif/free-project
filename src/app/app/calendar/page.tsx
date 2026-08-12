"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { DayGrid } from "@/components/domain/DayGrid";
import { WeekAgenda } from "@/components/domain/WeekAgenda";
import { MonthGrid } from "@/components/domain/MonthGrid";
import { EventEditModal } from "@/components/domain/EventEditModal";
import { useAlxioum } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";
import { addDaysISO, formatDayLabel, todayISO } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

function startOfWeekISO(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  return addDaysISO(iso, -day);
}

export default function CalendarPage() {
  const events = useAlxioum((s) => s.events);
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(todayISO());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const weekStart = useMemo(() => startOfWeekISO(anchor), [anchor]);
  const dayEvents = useMemo(() => events.filter((e) => e.date === anchor).sort((a, b) => a.startTime.localeCompare(b.startTime)), [events, anchor]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{heading}</p>
        </div>
        <div className="flex items-center gap-2">
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

      <EventEditModal event={editing} open={modalOpen} onOpenChange={setModalOpen} defaultDate={defaultDate} />
    </div>
  );
}
