import { Trash2 } from "lucide-react";
import { Expense, TripMember } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { formatDayLabel, formatMoney } from "@/lib/utils";

const CATEGORY_EMOJI: Record<Expense["category"], string> = {
  Hotel: "🏨",
  Flights: "✈️",
  Food: "🍽️",
  Activities: "🎟️",
  Transport: "🚕",
  Shopping: "🛍️",
  Other: "💳",
};

export function ExpenseRow({ expense, members, onDelete }: { expense: Expense; members: TripMember[]; onDelete: () => void }) {
  const payer = members.find((m) => m.id === expense.paidBy);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
      <span className="text-[18px] leading-none">{CATEGORY_EMOJI[expense.category]}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">{expense.name}</p>
        <p className="truncate text-[12.5px] text-muted-foreground">
          Paid by {payer?.name ?? "someone"} · {expense.participantIds.length} people · {formatDayLabel(expense.date)}
        </p>
      </div>
      <Badge tone="neutral">{expense.category}</Badge>
      <span className="w-20 shrink-0 text-right text-[14px] font-semibold text-foreground">{formatMoney(expense.amount, expense.currency)}</span>
      <button onClick={onDelete} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
