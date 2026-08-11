"use client";

import { useState } from "react";
import { FileText, FileImage, FileType, ChevronDown, Sparkles, CalendarPlus, BellPlus } from "lucide-react";
import { LifeDocument } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { cn, formatDayLabel } from "@/lib/utils";

const kindIcon: Record<LifeDocument["kind"], typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  image: FileImage,
  text: FileType,
};

export function DocumentCard({ doc }: { doc: LifeDocument }) {
  const [open, setOpen] = useState(false);
  const addEvent = useAlxioum((s) => s.addEvent);
  const addNotification = useAlxioum((s) => s.addNotification);
  const [addedDates, setAddedDates] = useState<Set<string>>(new Set());
  const [reminderSet, setReminderSet] = useState(false);
  const Icon = kindIcon[doc.kind];

  function addDateToCalendar(label: string, date: string) {
    addEvent({ title: label, date, startTime: "09:00", endTime: "09:30", type: "personal", movable: true });
    setAddedDates((prev) => new Set(prev).add(label));
  }

  function createReminder() {
    const first = doc.extractedDates?.[0];
    addNotification({
      title: `Reminder: ${first ? first.label : doc.name}`,
      body: first ? `${first.label} on ${formatDayLabel(first.date)}.` : `Follow up on ${doc.name}.`,
      kind: "system",
    });
    setReminderSet(true);
  }

  return (
    <Card className="overflow-hidden">
      <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-foreground">{doc.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{doc.folder}</Badge>
            {doc.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            <span className="text-[11.5px] text-muted-foreground">{formatDayLabel(doc.uploadedAt)}</span>
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-4">
          {doc.aiSummary ? (
            <div className="flex items-start gap-2 rounded-lg bg-accent-soft/50 p-3">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <p className="text-[13px] text-foreground">{doc.aiSummary}</p>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Alxioum hasn&apos;t analyzed this document yet.</p>
          )}

          {doc.extractedDates && doc.extractedDates.length > 0 && (
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                I found {doc.extractedDates.length} important date{doc.extractedDates.length > 1 ? "s" : ""}
              </p>
              <div className="mt-2 space-y-1.5">
                {doc.extractedDates.map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{d.label}</p>
                      <p className="text-[12px] text-muted-foreground">{formatDayLabel(d.date)}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={addedDates.has(d.label)} onClick={() => addDateToCalendar(d.label, d.date)}>
                      <CalendarPlus className="h-3.5 w-3.5" /> {addedDates.has(d.label) ? "Added" : "Add to calendar"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button size="sm" variant="ghost" className="gap-1.5 text-accent" disabled={reminderSet} onClick={createReminder}>
            <BellPlus className="h-3.5 w-3.5" /> {reminderSet ? "Reminder created" : "Create reminder"}
          </Button>
        </div>
      )}
    </Card>
  );
}
