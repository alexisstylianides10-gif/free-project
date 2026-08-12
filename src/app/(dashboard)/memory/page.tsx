"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { BrainCircuit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { CalendarEventRow, deleteAllEvents, deleteEvent, listAllEvents } from "@/lib/calendarEvents";

export default function WhatAlxioumKnowsPage() {
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setEvents(await listAllEvents());
    } catch {
      setError("Couldn't load what Alxioum knows. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteEvent(id);
      setEvents((e) => e.filter((ev) => ev.id !== id));
    } catch {
      setError("Couldn't delete that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAll() {
    setBusy(true);
    try {
      await deleteAllEvents();
      setEvents([]);
      setConfirmDeleteAll(false);
    } catch {
      setError("Couldn't delete your data. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">What Alxioum knows</h1>
          <p className="text-[13.5px] text-muted-foreground">
            Everything stored in your account, in plain language. Nothing here is hidden from you.
          </p>
        </div>
        {events.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-danger" onClick={() => setConfirmDeleteAll(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete all data
          </Button>
        )}
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {loading ? (
        <Card className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading...</Card>
      ) : events.length === 0 ? (
        <EmptyState
          icon={BrainCircuit}
          title="Nothing stored yet"
          body="Once you add calendar events — through chat or manually — they'll show up here so you always know exactly what Alxioum has on file."
          action={
            <Link href="/calendar">
              <Button size="sm" variant="outline">
                Open Calendar
              </Button>
            </Link>
          }
        />
      ) : (
        <div>
          <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Calendar ({events.length})
          </h2>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {events.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card className="flex items-start justify-between gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-foreground">
                        <span className="font-medium">{e.title}</span> — {format(new Date(e.start_time), "EEEE, MMM d, h:mm a")} to{" "}
                        {format(new Date(e.end_time), "h:mm a")}
                      </p>
                      {e.notes && <p className="mt-0.5 text-[12.5px] text-muted-foreground">Notes: {e.notes}</p>}
                    </div>
                    <button
                      onClick={() => remove(e.id)}
                      disabled={busy}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {confirmDeleteAll && (
        <Modal
          open
          onOpenChange={(o) => !o && setConfirmDeleteAll(false)}
          title="Delete all data?"
          description="This permanently deletes every calendar event stored in your account. This can't be undone."
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteAll(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={removeAll} disabled={busy}>
              Delete everything
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
