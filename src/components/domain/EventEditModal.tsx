"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";
import { todayISO } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const EVENT_TYPES: CalendarEvent["type"][] = ["school", "health", "social", "study", "work", "personal", "travel"];

export function EventEditModal({
  event,
  open,
  onOpenChange,
  defaultDate,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}) {
  const addEvent = useAlxioum((s) => s.addEvent);
  const updateEvent = useAlxioum((s) => s.updateEvent);
  const removeEvent = useAlxioum((s) => s.removeEvent);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayISO());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [type, setType] = useState<CalendarEvent["type"]>("personal");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? "");
      setDate(event?.date ?? defaultDate ?? todayISO());
      setStartTime(event?.startTime ?? "09:00");
      setEndTime(event?.endTime ?? "09:30");
      setType(event?.type ?? "personal");
      setLocation(event?.location ?? "");
    }
  }, [open, event, defaultDate]);

  function save() {
    if (!title.trim()) return;
    if (event) {
      updateEvent(event.id, { title, date, startTime, endTime, type, location: location || undefined });
    } else {
      addEvent({ title, date, startTime, endTime, type, location: location || undefined, movable: true });
    }
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={event ? "Edit event" : "New event"}
      description={event ? "Update this item on your schedule." : "Add something to your schedule."}
    >
      <div className="space-y-3">
        <input autoFocus className={inputClass} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-2">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as CalendarEvent["type"])}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input className={inputClass} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <input className={inputClass} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <input className={inputClass} placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />

        <div className="flex items-center justify-between gap-2 pt-2">
          {event ? (
            <Button
              variant="ghost"
              className="text-danger hover:bg-danger-soft"
              onClick={() => {
                removeEvent(event.id);
                onOpenChange(false);
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
