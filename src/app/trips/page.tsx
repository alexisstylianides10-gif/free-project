"use client";

import Link from "next/link";
import { Map, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTriply } from "@/lib/store";
import { TripCard } from "@/components/domain/TripCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { planningProgress } from "@/lib/trips";

export default function TripsPage() {
  const router = useRouter();
  const allTrips = useTriply((s) => s.trips);
  const trips = allTrips.filter((t) => !t.archived);
  const members = useTriply((s) => s.members);
  const itinerary = useTriply((s) => s.itinerary);
  const documents = useTriply((s) => s.documents);
  const expenses = useTriply((s) => s.expenses);
  const joinTripByCode = useTriply((s) => s.joinTripByCode);

  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter((t) => t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = trips.filter((t) => t.endDate < today).sort((a, b) => b.startDate.localeCompare(a.startDate));

  function submitJoin() {
    const trip = joinTripByCode(code);
    if (!trip) {
      setJoinError("We couldn't find a trip with that code.");
      return;
    }
    setJoinOpen(false);
    setCode("");
    router.push(`/trip?tripId=${trip.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Trips</h1>
          <p className="text-[13.5px] text-muted-foreground">Everything you&apos;re planning or have planned.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setJoinOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Join
          </Button>
          <Link href="/trips/create">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Trip
            </Button>
          </Link>
        </div>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No trips yet"
          body="Create your first trip and invite your group — it takes less than two minutes."
          action={
            <Link href="/trips/create">
              <Button size="sm">Create Trip</Button>
            </Link>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  memberCount={members.filter((m) => m.tripId === trip.id).length}
                  progress={planningProgress(
                    trip,
                    itinerary.filter((i) => i.tripId === trip.id),
                    members.filter((m) => m.tripId === trip.id).length,
                    documents.filter((d) => d.tripId === trip.id),
                    expenses.filter((e) => e.tripId === trip.id)
                  )}
                />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">Past trips</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    memberCount={members.filter((m) => m.tripId === trip.id).length}
                    progress={100}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={joinOpen} onOpenChange={setJoinOpen} title="Join a trip" description="Enter the invite code your organizer shared.">
        <div className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm uppercase tracking-wider text-foreground placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {joinError && <p className="text-[12.5px] text-danger">{joinError}</p>}
          <Button className="w-full" onClick={submitJoin} disabled={!code.trim()}>
            Join Trip
          </Button>
        </div>
      </Modal>
    </div>
  );
}
