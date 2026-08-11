import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-9 text-center shadow-card animate-fade-in">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
        <Icon className="h-4.5 w-4.5 text-accent" strokeWidth={1.75} />
      </div>
      <p className="text-[14.5px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex items-center gap-2">{action}</div>}
    </div>
  );
}
