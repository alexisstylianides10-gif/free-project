import { Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClass: Record<Priority, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-muted-foreground/40",
};

export function PriorityDot({ priority, className }: { priority: Priority; className?: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", toneClass[priority], className)} />;
}
