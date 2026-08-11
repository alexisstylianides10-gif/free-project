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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-14 text-center shadow-card animate-fade-in">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
      </div>
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5 flex items-center gap-2">{action}</div>}
    </div>
  );
}
