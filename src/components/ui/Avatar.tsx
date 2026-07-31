import { cn } from "@/lib/utils";

export function Avatar({ initials, size = "md", className }: { initials: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-sm", lg: "h-14 w-14 text-lg" }[size];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground",
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
