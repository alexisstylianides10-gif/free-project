import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDayLabel, formatTime12 } from "@/lib/utils";
import type { EventCardData } from "@/lib/ai/cards";

export function EventCard({ events, heading }: { events: EventCardData[]; heading?: string }) {
  return (
    <Card className="mt-2 max-w-sm">
      <CardContent className="space-y-2.5 p-4">
        {heading && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>}
        <div className="space-y-1.5">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-2.5 text-[13px]">
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {formatDayLabel(e.date)} · {formatTime12(e.startTime)}
                  {e.endTime ? `–${formatTime12(e.endTime)}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {e.title}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/app/calendar" className="inline-block text-[12px] font-medium text-accent hover:opacity-80">
          Open Calendar
        </Link>
      </CardContent>
    </Card>
  );
}
