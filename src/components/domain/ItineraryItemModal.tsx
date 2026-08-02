"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ItineraryItem, ItineraryType, TripMember } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const TYPE_OPTIONS: { value: ItineraryType; label: string; emoji: string }[] = [
  { value: "activity", label: "Activity", emoji: "🎟️" },
  { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { value: "hotel", label: "Hotel", emoji: "🏨" },
  { value: "flight", label: "Flight", emoji: "✈️" },
  { value: "transport", label: "Transport", emoji: "🚕" },
  { value: "free_time", label: "Free time", emoji: "☕" },
  { value: "other", label: "Other", emoji: "📍" },
];

export interface ItineraryItemDraft {
  date: string;
  startTime: string;
  endTime: string;
  type: ItineraryType;
  name: string;
  emoji: string;
  location: string;
  description: string;
  cost: string;
  notes: string;
  participantIds: string[];
}

export function ItineraryItemModal({
  open,
  onOpenChange,
  members,
  defaultDate,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TripMember[];
  defaultDate: string;
  initial?: ItineraryItem;
  onSubmit: (draft: ItineraryItemDraft) => void;
}) {
  const [draft, setDraft] = useState<ItineraryItemDraft>(() => fromInitial(initial, defaultDate, members));

  useEffect(() => {
    if (open) setDraft(fromInitial(initial, defaultDate, members));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  function set<K extends keyof ItineraryItemDraft>(key: K, value: ItineraryItemDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleParticipant(id: string) {
    setDraft((d) => ({
      ...d,
      participantIds: d.participantIds.includes(id) ? d.participantIds.filter((p) => p !== id) : [...d.participantIds, id],
    }));
  }

  function submit() {
    if (!draft.name.trim()) return;
    onSubmit(draft);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? "Edit activity" : "Add activity"} className="max-h-[85dvh] overflow-y-auto">
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setDraft((d) => ({ ...d, type: t.value, emoji: t.emoji }))}
              className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-[11px] font-medium transition-colors ${
                draft.type === t.value ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="text-[16px] leading-none">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        <input className={inputClass} placeholder="Name" value={draft.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        <input className={inputClass} placeholder="Location" value={draft.location} onChange={(e) => set("location", e.target.value)} />

        <div className="grid grid-cols-3 gap-2">
          <input className={inputClass} type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
          <input className={inputClass} type="time" value={draft.startTime} onChange={(e) => set("startTime", e.target.value)} />
          <input className={inputClass} type="time" value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </div>

        <textarea className={inputClass} placeholder="Description" rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} />

        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} type="number" placeholder="Cost" value={draft.cost} onChange={(e) => set("cost", e.target.value)} />
          <input className={inputClass} placeholder="Notes" value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div>
          <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Participants</p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleParticipant(m.id)}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  draft.participantIds.includes(m.id) ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{initial ? "Save changes" : "Add activity"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function fromInitial(initial: ItineraryItem | undefined, defaultDate: string, members: TripMember[]): ItineraryItemDraft {
  if (initial) {
    return {
      date: initial.date,
      startTime: initial.startTime,
      endTime: initial.endTime,
      type: initial.type,
      name: initial.name,
      emoji: initial.emoji,
      location: initial.location ?? "",
      description: initial.description ?? "",
      cost: initial.cost !== undefined ? String(initial.cost) : "",
      notes: initial.notes ?? "",
      participantIds: initial.participantIds,
    };
  }
  return {
    date: defaultDate,
    startTime: "10:00",
    endTime: "11:00",
    type: "activity",
    name: "",
    emoji: "🎟️",
    location: "",
    description: "",
    cost: "",
    notes: "",
    participantIds: members.map((m) => m.id),
  };
}
