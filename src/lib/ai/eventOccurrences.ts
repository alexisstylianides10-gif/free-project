import type { SupabaseClient } from "@supabase/supabase-js";
import { eventOccursOn } from "@/lib/utils";

export interface EventOccurrence {
  id: string;
  title: string;
  date: string; // the occurrence date — may differ from the seed row's own `date` for recurring events
  startTime: string;
  endTime: string;
  type: string;
  location: string | null;
  notes: string | null;
}

interface EventSeedRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  location: string | null;
  notes: string | null;
  recurrence: "none" | "daily" | "weekly";
  recurrence_until: string | null;
}

function datesBetween(fromISO: string, toISO: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${fromISO}T00:00:00`);
  const end = new Date(`${toISO}T00:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/**
 * Fetches every event occurrence (seed or recurring) that falls within
 * [fromISO, toISO], inclusive — unlike a plain `.gte("date", from).lte("date", to)`
 * query, this correctly surfaces daily/weekly recurring events whose seed
 * `date` is outside the range but which still occur within it (matching what
 * eventOccursOn() already does for every calendar UI view). Reuse this
 * instead of querying `events` by literal date wherever code reasons about
 * "what's happening on/between these dates," not just displays it.
 */
export async function fetchOccurrencesInRange(supabase: SupabaseClient, userId: string, fromISO: string, toISO: string): Promise<EventOccurrence[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,date,start_time,end_time,type,location,notes,recurrence,recurrence_until")
    .eq("user_id", userId)
    .lte("date", toISO);
  if (error) throw error;
  const rows = (data ?? []) as EventSeedRow[];
  const dates = datesBetween(fromISO, toISO);

  const occurrences: EventOccurrence[] = [];
  for (const row of rows) {
    for (const date of dates) {
      if (eventOccursOn({ date: row.date, recurrence: row.recurrence, recurrenceUntil: row.recurrence_until ?? undefined }, date)) {
        occurrences.push({ id: row.id, title: row.title, date, startTime: row.start_time, endTime: row.end_time, type: row.type, location: row.location, notes: row.notes });
      }
    }
  }
  return occurrences.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

/** Convenience wrapper for a single day. */
export async function fetchOccurrencesOnDate(supabase: SupabaseClient, userId: string, dateISO: string): Promise<EventOccurrence[]> {
  return fetchOccurrencesInRange(supabase, userId, dateISO, dateISO);
}
