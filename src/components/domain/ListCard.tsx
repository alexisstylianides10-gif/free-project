"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { LifeList } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ListCard({ list }: { list: LifeList }) {
  const [draft, setDraft] = useState("");
  const addListItem = useAlxioum((s) => s.addListItem);
  const toggleListItem = useAlxioum((s) => s.toggleListItem);
  const removeCheckedItems = useAlxioum((s) => s.removeCheckedItems);

  const checkedCount = list.items.filter((i) => i.done).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    addListItem(list.id, draft.trim());
    setDraft("");
  }

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[17px] leading-none">{list.emoji}</span>
          <p className="text-[14.5px] font-semibold text-foreground">{list.name}</p>
        </div>
        {checkedCount > 0 && (
          <button
            onClick={() => removeCheckedItems(list.id)}
            className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-danger"
          >
            <Trash2 className="h-3 w-3" /> Clear {checkedCount}
          </button>
        )}
      </div>

      <div className="flex-1 space-y-1">
        {list.items.length === 0 ? (
          <p className="py-3 text-center text-[12.5px] text-muted-foreground">Nothing here yet.</p>
        ) : (
          list.items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleListItem(list.id, item.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <span
                className={cn(
                  "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
                  item.done ? "border-success bg-success" : "border-border-strong"
                )}
                style={{ height: 18, width: 18 }}
              >
                {item.done && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              <span className={cn("text-[13.5px] text-foreground", item.done && "text-muted-foreground line-through")}>
                {item.label}
              </span>
            </button>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add item..."
          className="h-8 flex-1 rounded-md bg-muted px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Button type="submit" size="icon" variant="secondary" aria-label="Add item">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>
    </Card>
  );
}
