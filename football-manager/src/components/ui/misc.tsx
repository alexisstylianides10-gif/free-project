import * as React from "react";
import { cn } from "@/lib/cn";

export function Progress({ value, className, tone = "accent" }: { value: number; className?: string; tone?: "accent" | "gold" | "danger" | "warn" | "info" }) {
  const v = Math.max(0, Math.min(100, value));
  const color = { accent: "bg-accent", gold: "bg-gold", danger: "bg-danger", warn: "bg-warn", info: "bg-info" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "accent" | "gold" | "danger" }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={cn("mt-1 truncate text-xl font-semibold tabular-nums", tone === "accent" && "text-accent", tone === "gold" && "text-gold", tone === "danger" && "text-danger")}>{value}</div>
      {sub ? <div className="mt-0.5 truncate text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ? <div className="text-muted/60">{icon}</div> : null}
      <div className="text-sm font-medium">{title}</div>
      {children ? <div className="max-w-md text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("field", props.className)} />;
}

/** Overall/ability rating chip colour-coded by quality band. */
export function RatingChip({ value, className, title }: { value: number | string; className?: string; title?: string }) {
  const v = typeof value === "number" ? value : parseInt(value, 10);
  const tone = isNaN(v) ? "bg-surface2 text-muted" : v >= 80 ? "bg-gold/15 text-gold border-gold/30" : v >= 70 ? "bg-accent/15 text-accent border-accent/30" : v >= 60 ? "bg-info/15 text-info border-info/30" : v >= 50 ? "bg-surface2 text-fg border-line" : "bg-danger/10 text-danger/90 border-danger/20";
  return <span title={title} className={cn("inline-flex min-w-[2.1rem] items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-semibold tabular-nums", tone, className)}>{value}</span>;
}

export function KV({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium tabular-nums">{v}</span>
    </div>
  );
}
