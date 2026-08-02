"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BookingKind, extractBooking } from "@/lib/tripAI";
import { ItineraryType } from "@/lib/types";
import { todayISO } from "@/lib/utils";

const KIND_OPTIONS: { value: BookingKind; label: string; emoji: string }[] = [
  { value: "flight", label: "Flight", emoji: "✈️" },
  { value: "hotel", label: "Hotel", emoji: "🏨" },
  { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { value: "car", label: "Car rental", emoji: "🚗" },
  { value: "train", label: "Train", emoji: "🚄" },
  { value: "activity", label: "Activity", emoji: "🎟️" },
  { value: "other", label: "Other", emoji: "📄" },
];

const KIND_TO_TYPE: Record<BookingKind, ItineraryType> = {
  flight: "flight",
  hotel: "hotel",
  restaurant: "restaurant",
  car: "transport",
  train: "transport",
  activity: "activity",
  other: "other",
};

export function BookingImportModal({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: { fileName: string; kind: BookingKind; extractedData: Record<string, string> }, itineraryDraft: { name: string; type: ItineraryType; emoji: string; date: string; startTime: string; endTime: string; location?: string; bookingRef?: string }) => void;
}) {
  const [kind, setKind] = useState<BookingKind>("flight");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Record<string, string> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setExtracted(null);
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setExtracted(extractBooking(kind, file.name));
  }

  function confirmAdd() {
    if (!extracted || !fileName) return;
    const emoji = KIND_OPTIONS.find((k) => k.value === kind)?.emoji ?? "📄";
    const name = extracted.Airline
      ? `${extracted.Airline} ${extracted.Flight ?? ""}`.trim()
      : extracted.Hotel ?? extracted.Restaurant ?? extracted.Activity ?? extracted.Provider ?? extracted.Line ?? fileName;
    onAdd(
      { fileName, kind, extractedData: extracted },
      {
        name,
        type: KIND_TO_TYPE[kind],
        emoji,
        date: todayISO(),
        startTime: "10:00",
        endTime: "11:00",
        location: extracted.Airport ?? extracted.Address ?? extracted.Location ?? extracted.Route,
        bookingRef: extracted.Confirmation ?? extracted.Flight ?? extracted.Train,
      }
    );
    reset();
    onOpenChange(false);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  return (
    <Modal open={open} onOpenChange={handleClose} title="Import a booking" description="Upload a screenshot, PDF, or confirmation email.">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-1.5">
          {KIND_OPTIONS.map((k) => (
            <button
              key={k.value}
              onClick={() => {
                setKind(k.value);
                reset();
              }}
              className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-[11px] font-medium transition-colors ${
                kind === k.value ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="text-[16px] leading-none">{k.emoji}</span>
              {k.label}
            </button>
          ))}
        </div>

        {!extracted && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent-soft/20"
          >
            <Upload className="h-5 w-5" />
            <span className="text-[13px] font-medium">Tap to upload a file</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </button>
        )}

        {extracted && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-[13px] text-foreground">{fileName}</span>
            </div>
            <div className="rounded-xl border border-border p-3.5">
              <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">Extracted details</p>
              <dl className="space-y-1.5">
                {Object.entries(extracted).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 text-[13px]">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="text-[13px] font-medium text-foreground">Add this to your trip?</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Try another file
              </Button>
              <Button onClick={confirmAdd}>Add</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
