"use client";

import { supabase } from "./supabase/client";

/** Wipes every row the MVP writes for this user: calendar events, chat
 * conversations (messages cascade), and the activity log. RLS scopes every
 * query to the caller regardless, but the user_id filters are explicit too —
 * defense in depth, and it means the intent reads clearly at the call site. */
export async function deleteAllUserData() {
  if (!supabase) throw new Error("Not connected.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const [events, conversations, actions] = await Promise.all([
    supabase.from("calendar_events").delete().eq("user_id", user.id),
    supabase.from("conversations").delete().eq("user_id", user.id),
    supabase.from("agent_actions").delete().eq("user_id", user.id),
  ]);

  const failed = [events, conversations, actions].find((r) => r.error);
  if (failed?.error) throw failed.error;
}
