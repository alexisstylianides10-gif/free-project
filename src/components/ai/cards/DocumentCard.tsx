import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDayLabel } from "@/lib/utils";
import { iconForMimeType } from "@/lib/documents/ui";
import type { DocumentCardData } from "@/lib/ai/cards";

export function DocumentCard({ documents }: { documents: DocumentCardData[] }) {
  return (
    <div className="mt-2 space-y-2">
      {documents.map((d) => {
        const Icon = iconForMimeType(d.mimeType);
        return (
          <Card key={d.id} className="max-w-sm">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-foreground">{d.name}</p>
                  {d.summary && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">{d.summary}</p>}
                </div>
              </div>
              {d.nearestDeadline && (
                <p className="text-[12.5px] text-foreground">
                  Deadline: <span className="font-medium">{formatDayLabel(d.nearestDeadline.date)}</span> — {d.nearestDeadline.label}
                </p>
              )}
              {d.category && <Badge tone="neutral">{d.category}</Badge>}
              <Link href={`/app/documents/${d.id}`} className="inline-block text-[12px] font-medium text-accent hover:opacity-80">
                Open Document
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
