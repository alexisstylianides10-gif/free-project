"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Sparkles, UserPlus } from "lucide-react";
import { useTriply } from "@/lib/store";
import { useGreeting } from "@/lib/useGreeting";
import { TripCard } from "@/components/domain/TripCard";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { planningProgress } from "@/lib/trips";
import { formatDayLabel } from "@/lib/utils";

export default function HomePage() {
  const greeting = useGreeting();
  const router = useRouter();
  const profile = useTriply((s) => s.profile);
  const allTrips = useTriply((s) => s.trips);
  const trips = allTrips.filter((t) => !t.archived && t.endDate >= new Date().toISOString().slice(0, 10));
  const members = useTriply((s) => s.members);
  const itinerary = useTriply((s) => s.itinerary);
  const documents = useTriply((s) => s.documents);
  const expenses = useTriply((s) => s.expenses);
  const notifications = useTriply((s) => s.notifications);
  const joinTripByCode = useTriply((s) => s.joinTripByCode);

  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const upcoming = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));

  function goToAIPlanner() {
    if (upcoming[0]) router.push(`/trip?tripId=${upcoming[0].id}&ai=1`);
    else router.push("/trips/create");
  }

  function submitJoin() {
    const trip = joinTripByCode(code);
    if (!trip) {
      setJoinError("We couldn't find a trip with that code.");
      return;
    }
    setJoinOpen(false);
    setCode("");
    setJoinError(null);
    router.push(`/trip?tripId=${trip.id}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">
          {greeting}, {profile.name} 👋
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Here&apos;s where your trips stand.</p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <SectionLabel>Upcoming trips</SectionLabel>
          <Link href="/trips" className="text-[12.5px] font-medium text-accent hover:opacity-80">
            See all
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Card className="mt-3 flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-[14px] font-medium text-foreground">No upcoming trips yet</p>
            <p className="text-[13px] text-muted-foreground">Start planning your next group trip in under two minutes.</p>
            <Link href="/trips/create">
              <Button size="sm">Create Trip</Button>
            </Link>
          </Card>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((trip) => {
              const tripMembers = members.filter((m) => m.tripId === trip.id);
              const tripItems = itinerary.filter((i) => i.tripId === trip.id);
              const tripDocs = documents.filter((d) => d.tripId === trip.id);
              const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
              return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  memberCount={tripMembers.length}
                  progress={planningProgress(trip, tripItems, tripMembers.length, tripDocs, tripExpenses)}
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Quick actions</SectionLabel>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <QuickAction icon={Plus} label="Create Trip" onClick={() => router.push("/trips/create")} />
          <QuickAction icon={UserPlus} label="Join Trip" onClick={() => setJoinOpen(true)} />
          <QuickAction icon={Sparkles} label="AI Planner" accent onClick={goToAIPlanner} />
        </div>
      </section>

      <section>
        <SectionLabel>Recent activity</SectionLabel>
        <Card className="mt-3 divide-y divide-border">
          {notifications.length === 0 ? (
            <p className="p-5 text-center text-[13px] text-muted-foreground">Nothing yet — invite your group to get things moving.</p>
          ) : (
            notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex items-center gap-3 p-3.5">
                <span className="text-[16px] leading-none">{n.title.split(" ")[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-foreground">{n.title.replace(/^\S+\s/, "")}</p>
                </div>
                <span className="shrink-0 text-[11.5px] text-muted-foreground">{formatDayLabel(n.createdAt.slice(0, 10))}</span>
              </div>
            ))
          )}
        </Card>
      </section>

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function QuickAction({ icon: Icon, label, onClick, accent }: { icon: typeof Plus; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
        accent ? "border-accent/30 bg-accent-soft text-accent hover:bg-accent-soft/70" : "border-border text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[12.5px] font-medium">{label}</span>
    </button>
  );
}
