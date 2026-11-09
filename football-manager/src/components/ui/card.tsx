import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("panel animate-fadein", className)} {...props} />;
}

export function CardHeader({ title, action, className, sub }: { title: React.ReactNode; action?: React.ReactNode; className?: string; sub?: React.ReactNode }) {
  return (
    <div className={cn("panel-head", className)}>
      <div className="min-w-0">
        <div className="panel-title truncate">{title}</div>
        {sub ? <div className="mt-0.5 truncate text-xs text-muted/80">{sub}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
