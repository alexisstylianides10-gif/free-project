"use client";

import { useState } from "react";
import { CalendarEvent } from "@/lib/types";
import { eventTypeMeta } from "@/lib/eventStyle";
import { useAlxioum } from "@/lib/store";
import { cn, formatTime12 } from "@/lib/utils";

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 60;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function DayGrid({ date, events, onEventClick }: { date: string; events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const updateEvent = useAlxioum((s) => s.updateEvent);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  function handleDrop(hour: number) {
    if (!draggingId) return;
    const event = events.find((e) => e.id === draggingId);
    if (!event || event.movable === false) {
      setDraggingId(null);
      setDragOverHour(null);
      return;
    }
    const duration = toMinutes(event.endTime) - toMinutes(event.startTime);
    const newStart = hour * 60;
    const newEnd = newStart + duration;
    updateEvent(event.id, {
      date,
      startTime: `${String(hour).padStart(2, "0")}:00`,
      endTime: `${String(Math.floor(newEnd / 60)).padStart(2, "0")}:${String(newEnd % 60).padStart(2, "0")}`,
    });
    setDraggingId(null);
    setDragOverHour(null);
  }

  return (
    <div className="flex rounded-xl border border-border bg-surface">
      <div className="w-14 shrink-0 border-r border-border py-2">
        {hours.map((h) => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
            <span className="absolute -top-2 right-2 text-[11px] text-muted-foreground">{formatTime12(`${String(h).padStart(2, "0")}:00`)}</span>
          </div>
        ))}
      </div>

      <div className="relative flex-1 py-2">
        {hours.map((h) => (
          <div
            key={h}
            style={{ height: HOUR_HEIGHT }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverHour(h);
            }}
            onDrop={() => handleDrop(h)}
            className={cn("border-t border-border/70 transition-colors", dragOverHour === h && draggingId && "bg-accent-soft/40")}
          />
        ))}

        <div className="pointer-events-none absolute inset-0">
          {events.map((event) => {
            const top = ((toMinutes(event.startTime) - START_HOUR * 60) / 60) * HOUR_HEIGHT + 8;
            const height = Math.max(28, ((toMinutes(event.endTime) - toMinutes(event.startTime)) / 60) * HOUR_HEIGHT - 4);
            const meta = eventTypeMeta[event.type];
            const movable = event.movable !== false;
            return (
              <div
                key={event.id}
                draggable={movable}
                onDragStart={() => setDraggingId(event.id)}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => onEventClick(event)}
                style={{ top, height, left: 8, right: 8 }}
                className={cn(
                  "pointer-events-auto absolute overflow-hidden rounded-lg border px-2.5 py-1.5 text-left shadow-subtle transition-opacity",
                  movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  event.aiGenerated ? "border-accent/40 bg-accent-soft/60" : "border-border bg-muted",
                  draggingId === event.id && "opacity-40"
                )}
              >
                <p className={cn("truncate text-[12.5px] font-semibold", event.aiGenerated ? "text-accent" : "text-foreground")}>{event.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatTime12(event.startTime)}–{formatTime12(event.endTime)}
                </p>
                <span className="sr-only">{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
