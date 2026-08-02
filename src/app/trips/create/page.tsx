"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Mail, Plus, User, X } from "lucide-react";
import { useTriply } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TravelStyle } from "@/lib/types";
import { cn, newId } from "@/lib/utils";

const DESTINATIONS = [
  { name: "Japan", flag: "🇯🇵", cities: ["Tokyo", "Kyoto", "Osaka"], emoji: "🗼", gradient: "from-rose-400 via-fuchsia-400 to-indigo-500" },
  { name: "Italy", flag: "🇮🇹", cities: ["Rome", "Florence", "Venice"], emoji: "🍝", gradient: "from-amber-400 via-orange-400 to-rose-500" },
  { name: "Greece", flag: "🇬🇷", cities: ["Athens", "Santorini"], emoji: "🏛️", gradient: "from-sky-400 via-blue-400 to-indigo-500" },
  { name: "France", flag: "🇫🇷", cities: ["Paris", "Nice"], emoji: "🥐", gradient: "from-indigo-400 via-blue-400 to-sky-400" },
  { name: "Spain", flag: "🇪🇸", cities: ["Barcelona", "Madrid"], emoji: "💃", gradient: "from-red-400 via-orange-400 to-amber-400" },
  { name: "Thailand", flag: "🇹🇭", cities: ["Bangkok", "Phuket"], emoji: "🛕", gradient: "from-emerald-400 via-teal-400 to-cyan-500" },
  { name: "USA", flag: "🇺🇸", cities: ["New York"], emoji: "🗽", gradient: "from-blue-500 via-indigo-500 to-violet-500" },
  { name: "United Kingdom", flag: "🇬🇧", cities: ["London"], emoji: "🎡", gradient: "from-slate-400 via-slate-500 to-slate-700" },
];

const INTERESTS = ["Gaming", "Food", "Shopping", "History", "Nightlife", "Nature", "Art", "Sports"];
const FOOD_PREFS = ["Vegetarian", "Vegan", "No seafood", "Halal", "Loves street food", "Fine dining"];
const TRAVEL_STYLES: { value: TravelStyle; label: string; body: string }[] = [
  { value: "Relaxed", label: "Relaxed", body: "2-3 things a day, lots of downtime." },
  { value: "Balanced", label: "Balanced", body: "A good mix of activities and rest." },
  { value: "Packed", label: "Packed", body: "See and do as much as possible." },
];

interface Invitee {
  id: string;
  name: string;
  contact?: string;
}

export default function CreateTripPage() {
  const router = useRouter();
  const createTrip = useTriply((s) => s.createTrip);
  const inviteMember = useTriply((s) => s.inviteMember);

  const [step, setStep] = useState(1);
  const [destIndex, setDestIndex] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");
  const [customCities, setCustomCities] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteContact, setInviteContact] = useState("");
  const [budget, setBudget] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("Balanced");

  const dest = destIndex !== null ? DESTINATIONS[destIndex] : null;
  const tripName = dest?.name ?? customName;
  const cities = dest?.cities ?? customCities.split(",").map((c) => c.trim()).filter(Boolean);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addInvitee() {
    if (!inviteName.trim()) return;
    setInvitees((arr) => [...arr, { id: newId(), name: inviteName.trim(), contact: inviteContact.trim() || undefined }]);
    setInviteName("");
    setInviteContact("");
  }

  function canProceed(): boolean {
    if (step === 1) return Boolean(tripName && cities.length > 0);
    if (step === 2) return Boolean(startDate && endDate && startDate <= endDate);
    return true;
  }

  function finish() {
    const trip = createTrip({
      name: tripName,
      countryFlag: dest?.flag ?? "🌍",
      cities,
      startDate,
      endDate,
      coverGradient: dest?.gradient ?? "from-indigo-400 via-sky-400 to-emerald-400",
      coverEmoji: dest?.emoji ?? "🧳",
      budget: budget ? Number(budget) : undefined,
      currency: "EUR",
      interests,
      foodPreferences,
      travelStyle,
    });
    for (const invitee of invitees) inviteMember(trip.id, { name: invitee.name, email: invitee.contact });
    router.push(`/trip?tripId=${trip.id}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => (step === 1 ? router.back() : setStep((s) => s - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={cn("h-1 flex-1 rounded-full", n <= step ? "bg-accent" : "bg-muted")} />
            ))}
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Where are you going?</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Pick a destination or set up your own.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {DESTINATIONS.map((d, i) => (
              <button
                key={d.name}
                onClick={() => setDestIndex(i)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors",
                  destIndex === i ? "border-accent bg-accent-soft" : "border-border hover:bg-muted"
                )}
              >
                <span className="text-[20px] leading-none">{d.flag}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-foreground">{d.name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{d.cities.join(", ")}</p>
                </div>
              </button>
            ))}
          </div>

          <Card className="p-4">
            <p className="text-[12.5px] font-semibold text-foreground">Or set up a custom trip</p>
            <div className="mt-2 space-y-2">
              <input
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setDestIndex(null);
                }}
                placeholder="Destination name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                value={customCities}
                onChange={(e) => {
                  setCustomCities(e.target.value);
                  setDestIndex(null);
                }}
                placeholder="Cities (comma separated)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">When are you traveling?</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">You can always adjust dates later.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Who&apos;s coming?</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Invite by email or username — you can also share a link later.</p>
          </div>
          <Card className="space-y-2 p-4">
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border px-2.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Name"
                  className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border px-2.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={inviteContact}
                  onChange={(e) => setInviteContact(e.target.value)}
                  placeholder="Email or username"
                  className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={addInvitee}>
              <Plus className="h-3.5 w-3.5" /> Add invite
            </Button>
          </Card>

          {invitees.length > 0 && (
            <div className="space-y-1.5">
              {invitees.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
                  <span className="flex-1 truncate text-[13px] text-foreground">
                    {inv.name} {inv.contact && <span className="text-muted-foreground">· {inv.contact}</span>}
                  </span>
                  <button onClick={() => setInvitees((arr) => arr.filter((i) => i.id !== inv.id))} className="text-muted-foreground hover:text-danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[12px] text-muted-foreground">You can skip this and invite people from the trip later.</p>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Trip preferences</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Optional — helps Trip AI plan better.</p>
          </div>

          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-foreground">Budget (EUR, per person)</p>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-foreground">Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((i) => (
                <Chip key={i} active={interests.includes(i)} onClick={() => toggle(interests, setInterests, i)}>
                  {i}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-foreground">Food preferences</p>
            <div className="flex flex-wrap gap-1.5">
              {FOOD_PREFS.map((f) => (
                <Chip key={f} active={foodPreferences.includes(f)} onClick={() => toggle(foodPreferences, setFoodPreferences, f)}>
                  {f}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-foreground">Travel style</p>
            <div className="grid grid-cols-3 gap-2">
              {TRAVEL_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setTravelStyle(s.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    travelStyle === s.value ? "border-accent bg-accent-soft" : "border-border hover:bg-muted"
                  )}
                >
                  <p className={cn("text-[13px] font-semibold", travelStyle === s.value ? "text-accent" : "text-foreground")}>{s.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.body}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Ready to go</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Review your trip before creating it.</p>
          </div>
          <Card className="divide-y divide-border">
            <SummaryRow label="Destination" value={`${dest?.flag ?? "🌍"} ${tripName} — ${cities.join(", ")}`} />
            <SummaryRow label="Dates" value={`${startDate} → ${endDate}`} />
            <SummaryRow label="Travelers" value={`You + ${invitees.length} invited`} />
            <SummaryRow label="Budget" value={budget ? `€${budget} per person` : "Not set"} />
            <SummaryRow label="Interests" value={interests.length ? interests.join(", ") : "Not set"} />
            <SummaryRow label="Travel style" value={travelStyle} />
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {step < 5 ? (
          <Button className="gap-1.5" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button className="gap-1.5" onClick={finish}>
            <Check className="h-3.5 w-3.5" /> Create Trip
          </Button>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3.5">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className="text-right text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}
