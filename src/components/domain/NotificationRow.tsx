import { AppNotification } from "@/lib/types";
import { cn, formatDayLabel } from "@/lib/utils";

export function NotificationRow({ notification, onRead }: { notification: AppNotification; onRead: () => void }) {
  const [emoji, ...rest] = notification.title.split(" ");
  const titleText = rest.join(" ") || notification.title;

  return (
    <button
      onClick={onRead}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:bg-muted",
        !notification.read && "bg-accent-soft/30"
      )}
    >
      <span className="text-[18px] leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          <p className="truncate text-[13.5px] font-semibold text-foreground">{titleText}</p>
        </div>
        <p className="text-[12.5px] text-muted-foreground">{notification.body}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground/70">{formatDayLabel(notification.createdAt.slice(0, 10))}</p>
      </div>
    </button>
  );
}
