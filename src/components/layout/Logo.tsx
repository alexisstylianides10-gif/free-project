import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent", className)}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.1" fill="hsl(var(--accent-foreground))" />
        <circle cx="8" cy="8" r="6.2" stroke="hsl(var(--accent-foreground))" strokeWidth="1.15" strokeOpacity="0.55" fill="none" />
        <circle cx="13.4" cy="8" r="1.1" fill="hsl(var(--accent-foreground))" />
      </svg>
    </div>
  );
}
