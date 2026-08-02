"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ItineraryItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, formatTime12 } from "@/lib/utils";

export function ItineraryItemRow({
  item,
  currency,
  onEdit,
  onDelete,
  onDuplicate,
  onReorder,
  canMoveUp,
  canMoveDown,
}: {
  item: ItineraryItem;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: (direction: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface transition-colors hover:border-border-strong">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-start gap-3 p-3.5 text-left">
        <div className="w-14 shrink-0 pt-0.5 text-[12.5px] font-medium text-muted-foreground">{formatTime12(item.startTime)}</div>
        <span className="mt-0.5 text-[17px] leading-none">{item.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-foreground">{item.name}</p>
            {item.aiGenerated && <Badge tone="accent">AI</Badge>}
          </div>
          {item.location && <p className="truncate text-[12.5px] text-muted-foreground">{item.location}</p>}
        </div>
        {item.cost !== undefined && <span className="shrink-0 text-[12.5px] font-medium text-muted-foreground">{formatMoney(item.cost, currency)}</span>}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border px-3.5 py-3 pl-[4.25rem]">
          {item.description && <p className="text-[13px] text-foreground">{item.description}</p>}
          <p className="text-[12.5px] text-muted-foreground">
            {formatTime12(item.startTime)} – {formatTime12(item.endTime)}
          </p>
          {item.notes && <p className="text-[12.5px] italic text-muted-foreground">Note: {item.notes}</p>}
          {item.bookingRef && <p className="text-[12.5px] text-muted-foreground">Booking ref: {item.bookingRef}</p>}
          <p className="text-[12.5px] text-muted-foreground">{item.participantIds.length} traveler{item.participantIds.length === 1 ? "" : "s"} joining</p>

          <div className="flex items-center gap-1 pt-1">
            <button onClick={onEdit} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={onDuplicate} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button onClick={() => onReorder("up")} disabled={!canMoveUp} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onReorder("down")} disabled={!canMoveDown} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className="z-50 w-40 rounded-xl border border-border bg-surface p-1.5 shadow-pop animate-scale-in">
                  <DropdownMenu.Item
                    onSelect={onDelete}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-danger outline-none hover:bg-danger-soft"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      )}
    </div>
  );
}
