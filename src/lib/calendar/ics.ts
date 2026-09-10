import "server-only";
import { branding } from "@/lib/branding";

export interface CalendarEvent {
  /** Stable across regenerations so a calendar app updates the same event
   * in place (e.g. if a title changes) instead of duplicating it. */
  uid: string;
  title: string;
  /** YYYY-MM-DD — every event here is an all-day deadline, not a timed one. */
  date: string;
  description?: string;
}

function escapeICSText(text: string): string {
  // RFC 5545 §3.3.11 — these four characters must be backslash-escaped in
  // TEXT values; newlines become the literal two-char sequence "\n".
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toICSDate(dateISO: string): string {
  return dateISO.replace(/-/g, "");
}

/** Folds a line to the 75-octet limit RFC 5545 requires, with a leading
 * space on each continuation — without this, calendar apps can silently
 * truncate or reject long SUMMARY/DESCRIPTION lines. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

/**
 * Builds a minimal, valid iCalendar (RFC 5545) feed of all-day VEVENTs. Used
 * by /api/calendar/[token] to give a student/founder a webcal:// URL they
 * can subscribe to once in their phone/computer calendar app, which then
 * re-fetches this on its own schedule as deadlines change — no manual
 * re-export needed.
 */
export function buildICSFeed(events: CalendarEvent[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//" + branding.name + "//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICSText(branding.name + " Deadlines")}`,
  ];

  for (const event of events) {
    const date = toICSDate(event.date);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@${branding.name.toLowerCase()}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${date}`,
      `SUMMARY:${escapeICSText(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeICSText(event.description)}`] : []),
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
