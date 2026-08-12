"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { MessagesSquare, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface ConversationRow {
  id: string;
  updated_at: string;
  preview: string;
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setConversations([]);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setConversations([]);
        return;
      }

      const { data: convos } = await supabase
        .from("conversations")
        .select("id, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!convos || convos.length === 0) {
        setConversations([]);
        return;
      }

      const ids = convos.map((c) => c.id);
      const { data: firstMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", ids)
        .eq("role", "user")
        .order("created_at", { ascending: true });

      const previewByConvo = new Map<string, string>();
      for (const m of firstMessages ?? []) {
        if (!previewByConvo.has(m.conversation_id)) previewByConvo.set(m.conversation_id, m.content);
      }

      setConversations(
        convos.map((c) => ({
          id: c.id,
          updated_at: c.updated_at,
          preview: previewByConvo.get(c.id) || "New conversation",
        }))
      );
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Chat History</h1>
          <p className="text-[13.5px] text-muted-foreground">Every conversation you've had with Alxioum.</p>
        </div>
        <Link href="/app?new=1">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New chat
          </Button>
        </Link>
      </div>

      {conversations === null ? (
        <Card className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading...</Card>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No chats yet"
          body="Start a conversation with Alxioum and it'll show up here so you can pick up where you left off."
          action={
            <Link href="/app">
              <Button size="sm" variant="outline">
                Open chat
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(i, 8) * 0.03 }}
            >
              <Link href={`/app?conversation=${c.id}`}>
                <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <MessagesSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-foreground">{c.preview}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
