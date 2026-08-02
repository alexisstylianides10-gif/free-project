"use client";

import { Inbox as InboxIcon } from "lucide-react";
import { useTriply } from "@/lib/store";
import { NotificationRow } from "@/components/domain/NotificationRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function InboxPage() {
  const notifications = useTriply((s) => s.notifications);
  const markNotificationRead = useTriply((s) => s.markNotificationRead);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Inbox</h1>
          <p className="text-[13.5px] text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={() => notifications.filter((n) => !n.read).forEach((n) => markNotificationRead(n.id))}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={InboxIcon} title="Nothing here yet" body="Flight changes, polls, and trip updates will show up here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onRead={() => markNotificationRead(n.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
