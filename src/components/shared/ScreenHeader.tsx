import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>}
        <h1 className="mt-0.5 text-heading font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
