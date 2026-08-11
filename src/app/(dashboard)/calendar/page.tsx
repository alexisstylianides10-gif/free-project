"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DayGrid } from "@/components/domain/DayGrid";
import { WeekAgenda } from "@/components/domain/WeekAgenda";
import { MonthGrid } from "@/components/domain/MonthGrid";
import { EventEditModal } from "@/components/domain/EventEditModal";
import { CalendarEvent } from "@/lib/types";
import { addDaysISO, todayISO } from "@/lib/utils";

const AI_PROMPTS = [
  "Find me 30 minutes tomorrow.",
  "Move my study session.",
  "Do I have time to go to the gym?",
  "Build my schedule for tomorrow.",
];

type View = "day" | "week" | "month";

function mondayOf(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysISO(dateISO, diff);
}

export default function CalendarPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(() => todayISO());
  const [editing, setEditing] = useState<CalendarEvent | "new" | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);

  const events = useAlxioum((s) => s.events);
  const sendChatMessage = useAlxioum((s) => s.sendChatMessage);

  const dayEvents = useMemo(() => events.filter((e) => e.date === date), [events, date]);
  const weekStart = useMemo(() => mondayOf(date), [date]);

  function step(dir: 1 | -1) {
    if (view === "day") setDate(addDaysISO(date, dir));
    else if (view === "week") setDate(addDaysISO(date, dir * 7));
    else {
      const d = new Date(date + "T00:00:00");
      d.setMonth(d.getMonth() + dir);
      setDate(d.toISOString().slice(0, 10));
    }
  }

  function askAI(prompt: string) {
    sendChatMessage(prompt);
    router.push("/ai");
  }

  const heading = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    if (view === "month") return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "day") return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const end = new Date(weekStart + "T00:00:00");
    end.setDate(end.getDate() + 6);
    return `${new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [date, view, weekStart]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="text-[13.5px] text-muted-foreground">{heading}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate(todayISO())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setPrefillDate(date);
              setEditing("new");
            }}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {AI_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => askAI(p)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
          >
            <Sparkles className="h-3 w-3 text-accent" /> {p}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Your calendar is empty"
          body="Create your first event, or ask Alxioum to build a schedule from your tasks and goals."
          action={
            <>
              <Button
                size="sm"
                onClick={() => {
                  setPrefillDate(date);
                  setEditing("new");
                }}
              >
                Create event
              </Button>
              <Button size="sm" variant="outline" onClick={() => askAI("Build my schedule for tomorrow.")}>
                Ask AI to plan
              </Button>
            </>
          }
        />
      ) : (
        <>
          {view === "day" && (
            <DayGrid
              date={date}
              events={dayEvents}
              onEventClick={(e) => {
                setEditing(e);
              }}
            />
          )}
          {view === "week" && (
            <WeekAgenda
              weekStart={weekStart}
              events={events}
              onEventClick={(e) => setEditing(e)}
              onAddDay={(d) => {
                setPrefillDate(d);
                setEditing("new");
              }}
            />
          )}
          {view === "month" && (
            <MonthGrid
              monthISO={date}
              events={events}
              onDayClick={(d) => {
                setDate(d);
                setView("day");
              }}
            />
          )}
        </>
      )}

      <EventEditModal
        event={editing === "new" || editing === null ? null : editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        defaultDate={prefillDate ?? date}
      />
    </div>
  );
}
