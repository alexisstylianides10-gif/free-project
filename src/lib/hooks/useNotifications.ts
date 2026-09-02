"use client";
import { supabase } from "@/lib/supabase/client";
import { useTableRows } from "@/lib/hooks/useTableRows";
import type { NotificationRow } from "@/lib/types";

export function useNotifications(userId?: string) {
  const { data, loading, refetch } = useTableRows<NotificationRow>("notifications", userId, {
    orderBy: { column: "created_at", ascending: false },
  });

  async function markRead(id: string) {
    if (!supabase) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    await refetch();
  }

  async function markAllRead(ids: string[]) {
    if (!supabase || ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    await refetch();
  }

  async function dismissDeadline(userIdArg: string, type: NotificationRow["type"], relatedId: string) {
    if (!supabase) return;
    await supabase.from("notifications").insert({ user_id: userIdArg, type, title: "", body: "", related_id: relatedId, read: true });
    await refetch();
  }

  return { data, loading, refetch, markRead, markAllRead, dismissDeadline };
}
