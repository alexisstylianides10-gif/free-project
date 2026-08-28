import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "school" | "future" | "success" | "warning" | "mission";
}) {
  const toneClass = {
    brand: "bg-gradient-brand",
    school: "bg-school",
    future: "bg-future",
    success: "bg-success",
    warning: "bg-warning",
    mission: "bg-gradient-mission",
  }[tone];

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_hsl(var(--shadow-color)/0.35)]",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", toneClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
