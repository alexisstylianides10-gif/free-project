"use client";

import { useMemo, useState } from "react";
import { useTriply } from "@/lib/store";
import { ExplorePlaceCard } from "@/components/domain/ExplorePlaceCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ExplorePlace } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

const CATEGORIES: { value: ExplorePlace["category"] | "All"; label: string; emoji: string }[] = [
  { value: "All", label: "All", emoji: "🌍" },
  { value: "Food", label: "Food", emoji: "🍜" },
  { value: "Gaming", label: "Gaming", emoji: "🎮" },
  { value: "Attractions", label: "Attractions", emoji: "🏯" },
  { value: "Shopping", label: "Shopping", emoji: "🛍️" },
  { value: "Nightlife", label: "Nightlife", emoji: "🌃" },
  { value: "Activities", label: "Activities", emoji: "🏖️" },
];

export default function ExplorePage() {
  const places = useTriply((s) => s.explorePlaces);
  const savedPlaces = useTriply((s) => s.savedPlaces);
  const toggleSavedPlace = useTriply((s) => s.toggleSavedPlace);
  const allTrips = useTriply((s) => s.trips);
  const trips = allTrips.filter((t) => !t.archived);
  const addItineraryItem = useTriply((s) => s.addItineraryItem);
  const members = useTriply((s) => s.members);

  const cities = useMemo(() => Array.from(new Set(places.map((p) => p.city))), [places]);
  const [category, setCategory] = useState<ExplorePlace["category"] | "All">("All");
  const [city, setCity] = useState<string>(cities[0] ?? "");
  const [addTarget, setAddTarget] = useState<ExplorePlace | null>(null);
  const [addedName, setAddedName] = useState<string | null>(null);

  const filtered = places.filter((p) => (category === "All" || p.category === category) && (!city || p.city === city));
  const eligibleTrips = addTarget ? trips.filter((t) => t.cities.includes(addTarget.city)) : [];

  function addToTrip(tripId: string) {
    if (!addTarget) return;
    const tripMembers = members.filter((m) => m.tripId === tripId);
    const trip = trips.find((t) => t.id === tripId);
    addItineraryItem({
      tripId,
      date: trip?.startDate ?? todayISO(),
      startTime: "12:00",
      endTime: "13:30",
      type: addTarget.category === "Food" ? "restaurant" : "activity",
      name: addTarget.name,
      emoji: addTarget.emoji,
      location: addTarget.location,
      description: addTarget.description,
      participantIds: tripMembers.map((m) => m.id),
      order: 999,
    });
    setAddedName(addTarget.name);
    setAddTarget(null);
    setTimeout(() => setAddedName(null), 2500);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Explore</h1>
        <p className="text-[13.5px] text-muted-foreground">Discover places worth adding to your trips.</p>
      </div>

      {addedName && (
        <div className="rounded-lg border border-success/25 bg-success-soft px-3.5 py-2 text-[13px] font-medium text-success">
          Added &quot;{addedName}&quot; to your itinerary.
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {cities.map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              city === c ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              category === c.value ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((place) => (
          <ExplorePlaceCard
            key={place.id}
            place={place}
            saved={savedPlaces.some((p) => p.name === place.name)}
            onToggleSave={() => toggleSavedPlace(place)}
            onAddToTrip={() => setAddTarget(place)}
          />
        ))}
      </div>

      <Modal open={!!addTarget} onOpenChange={(o) => !o && setAddTarget(null)} title="Add to trip" description={addTarget ? `Which trip should "${addTarget.name}" go on?` : undefined}>
        <div className="space-y-2">
          {eligibleTrips.length === 0 && <p className="text-[13px] text-muted-foreground">None of your trips include {addTarget?.city} yet.</p>}
          {eligibleTrips.map((t) => (
            <Button key={t.id} variant="outline" className="w-full justify-start gap-2" onClick={() => addToTrip(t.id)}>
              <span>{t.countryFlag}</span> {t.name}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
