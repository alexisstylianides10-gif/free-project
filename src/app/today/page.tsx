"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Check, Pencil, MessageCircle, CalendarDays } from "lucide-react";
import { useLifeOS } from "@/lib/store";
import { findFreeSlots, rankTasks } from "@/lib/aiEngine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventEditModal } from "@/components/domain/EventEditModal";
import { eventTypeMeta } from "@/lib/eventStyle";
import { addDaysISO, formatDayLabel, formatTime12, todayISO } from "@/lib/utils";
import { CalendarEvent } from "@/lib/types";

interface Proposal {
  title: string;
  startTime: string;
  endTime: string;
  linkedTaskId?: string;
}

export default function TodayPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => todayISO());
  const [editing, setEditing] = useState<CalendarEvent | null | "new">(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const tasks = useLifeOS((s) => s.tasks);
  const events = useLifeOS((s) => s.events);
  const toggleTask = useLifeOS((s) => s.toggleTask);
  const addEvent = useLifeOS((s) => s.addEvent);
  const sendChatMessage = useLifeOS((s) => s.sendChatMessage);

  const dayEvents = useMemo(
    () => events.filter((e) => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, date]
  );

  const plannedCount = dayEvents.filter((e) => e.aiGenerated).length;

  function regenerate() {
    const ranked = rankTasks(tasks).find((t) => t.dueDate);
    const slots = findFreeSlots(events.filter((e) => e.date === date), date, 30).sort((a, b) => b.minutes - a.minutes);
    const best = slots[0];
    if (!ranked || !best) {
      setProposal(null);
      return;
    }
    const useMin = Math.min(best.minutes, ranked.estimatedMinutes ?? 45);
    const [h, m] = best.start.split(":").map(Number);
    const endTotal = h * 60 + m + useMin;
    const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
    setProposal({ title: `Study — ${ranked.title}`, startTime: best.start, endTime, linkedTaskId: ranked.id });
  }

  function acceptPlan() {
    if (proposal) {
      addEvent({
        title: proposal.title,
        date,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        type: "study",
        aiGenerated: true,
        movable: true,
        linkedTaskId: proposal.linkedTaskId,
      });
      setProposal(null);
    }
  }

  function askAbout(title: string) {
    sendChatMessage(`What should I do about "${title}"?`);
    router.push("/ai");
  }

  const isToday = date === todayISO();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
            {isToday ? "Today" : formatDayLabel(date)}
          </h1>
          <p className="text-[13.5px] text-muted-foreground">
            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={() => setDate(addDaysISO(date, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setDate(todayISO())}>
              Today
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setDate(addDaysISO(date, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-accent/25 bg-accent-soft/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div>
              <p className="text-[13.5px] font-semibold text-foreground">AI Plan</p>
              <p className="text-[13px] text-muted-foreground">
                {plannedCount > 0
                  ? `${plannedCount} block${plannedCount > 1 ? "s" : ""} on this day ${plannedCount > 1 ? "were" : "was"} planned by LifeOS around your deadlines and habits.`
                  : "LifeOS can build a recommended schedule from your calendar, tasks, goals, and habits."}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={acceptPlan} disabled={!proposal}>
            Accept plan
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={regenerate}>
            Regenerate
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h2>
        <Button size="sm" variant="ghost" className="gap-1.5 text-accent" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {dayEvents.length === 0 && !proposal ? (
        <EmptyState
          icon={CalendarDays}
          title="Your day is empty"
          body="Add an event, or let LifeOS build a recommended schedule from your tasks and deadlines."
          action={
            <>
              <Button size="sm" onClick={() => setEditing("new")}>
                Add event
              </Button>
              <Button size="sm" variant="outline" onClick={regenerate}>
                Regenerate plan
              </Button>
            </>
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {dayEvents.map((event) => {
              const meta = eventTypeMeta[event.type];
              const linkedTask = event.linkedTaskId ? tasks.find((t) => t.id === event.linkedTaskId) : undefined;
              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card className="flex items-center gap-3 p-3.5">
                    <div className="w-[76px] shrink-0 text-[12.5px] font-medium text-muted-foreground">
                      {formatTime12(event.startTime)}
                    </div>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted ${meta.tone}`}>
                      <meta.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[14px] font-medium text-foreground">{event.title}</p>
                        {event.aiGenerated && (
                          <Badge tone="accent" className="shrink-0">
                            AI planned
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-[12.5px] text-muted-foreground">
                        {formatTime12(event.startTime)}–{formatTime12(event.endTime)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {linkedTask && (
                        <button
                          onClick={() => toggleTask(linkedTask.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                            linkedTask.done
                              ? "border-success bg-success-soft text-success"
                              : "border-border text-muted-foreground hover:border-success hover:bg-success-soft hover:text-success"
                          }`}
                          aria-label="Mark linked task done"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => askAbout(event.title)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Ask AI"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditing(event)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {proposal && (
              <motion.div
                key="proposal"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card className="flex items-center gap-3 border-dashed border-accent/40 bg-accent-soft/20 p-3.5">
                  <div className="w-[76px] shrink-0 text-[12.5px] font-medium text-accent">{formatTime12(proposal.startTime)}</div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-foreground">{proposal.title}</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Proposed · {formatTime12(proposal.startTime)}–{formatTime12(proposal.endTime)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" onClick={acceptPlan}>
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setProposal(null)}>
                      Discard
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <EventEditModal
        event={editing === "new" || editing === null ? null : editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        defaultDate={date}
      />
    </div>
  );
}
