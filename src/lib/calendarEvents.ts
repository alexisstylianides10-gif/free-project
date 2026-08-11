"use client";

import { supabase } from "./supabase/client";

export interface CalendarEventRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listEvents(fromIso: string, toIso: string): Promise<CalendarEventRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .gte("start_time", fromIso)
    .lte("start_time", toIso)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAllEvents(): Promise<CalendarEventRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("calendar_events").select("*").order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEvent(input: { title: string; start_time: string; end_time: string; notes?: string }) {
  if (!supabase) throw new Error("Not connected.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ user_id: user.id, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as CalendarEventRow;
}

export async function updateEvent(
  id: string,
  patch: Partial<{ title: string; start_time: string; end_time: string; notes: string | null }>
) {
  if (!supabase) throw new Error("Not connected.");
  const { data, error } = await supabase
    .from("calendar_events")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CalendarEventRow;
}

export async function deleteEvent(id: string) {
  if (!supabase) throw new Error("Not connected.");
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllEvents() {
  if (!supabase) throw new Error("Not connected.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase.from("calendar_events").delete().eq("user_id", user.id);
  if (error) throw error;
}
