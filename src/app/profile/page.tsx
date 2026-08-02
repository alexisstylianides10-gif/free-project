"use client";

import Link from "next/link";
import { Building2, ChevronRight, Crown, MapPin, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useTriply } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TravelStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

const INTERESTS = ["Gaming", "Food", "Shopping", "History", "Nightlife", "Nature", "Art", "Sports"];
const FOOD_PREFS = ["Vegetarian", "Vegan", "No seafood", "Halal", "Loves street food", "Fine dining"];
const TRAVEL_STYLES: TravelStyle[] = ["Relaxed", "Balanced", "Packed"];

export default function ProfilePage() {
  const profile = useTriply((s) => s.profile);
  const allTrips = useTriply((s) => s.trips);
  const trips = allTrips.filter((t) => !t.archived);
  const savedPlaces = useTriply((s) => s.savedPlaces);
  const updateProfile = useTriply((s) => s.updateProfile);

  function toggle(list: string[], value: string, key: "interests" | "foodPreferences") {
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    updateProfile({ [key]: next });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar initials={profile.avatarInitials} size="lg" />
        <div>
          <p className="text-[18px] font-semibold text-foreground">{profile.name}</p>
          <p className="text-[13.5px] text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {profile.plan === "Free" && (
        <Link href="/premium">
          <Card className="flex items-center gap-3 border-accent/25 bg-accent-soft/40 p-4">
            <Crown className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold text-foreground">Upgrade to Travel Pro</p>
              <p className="text-[12px] text-muted-foreground">Unlimited trips, advanced AI, and more.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      )}

      <section>
        <SectionLabel>My trips</SectionLabel>
        <Card className="mt-2 divide-y divide-border">
          {trips.length === 0 && <p className="p-4 text-center text-[13px] text-muted-foreground">No trips yet.</p>}
          {trips.map((t) => (
            <Link key={t.id} href={`/trip?tripId=${t.id}`} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted">
              <span className="text-[18px] leading-none">{t.countryFlag}</span>
              <span className="flex-1 truncate text-[13.5px] font-medium text-foreground">{t.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      </section>

      <section>
        <SectionLabel>Saved places</SectionLabel>
        <Card className="mt-2 divide-y divide-border">
          {savedPlaces.length === 0 && (
            <p className="flex items-center justify-center gap-1.5 p-4 text-center text-[13px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Nothing saved yet — browse Explore.
            </p>
          )}
          {savedPlaces.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3.5">
              <span className="text-[18px] leading-none">{p.emoji}</span>
              <div className="flex-1">
                <p className="text-[13.5px] font-medium text-foreground">{p.name}</p>
                <p className="text-[12px] text-muted-foreground">{p.city}</p>
              </div>
              <Badge tone="neutral">{p.category}</Badge>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionLabel>Travel preferences</SectionLabel>
        <Card className="mt-2 space-y-4 p-4">
          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-foreground">Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((i) => (
                <Chip key={i} active={profile.interests.includes(i)} onClick={() => toggle(profile.interests, i, "interests")}>
                  {i}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-foreground">Food preferences</p>
            <div className="flex flex-wrap gap-1.5">
              {FOOD_PREFS.map((f) => (
                <Chip key={f} active={profile.foodPreferences.includes(f)} onClick={() => toggle(profile.foodPreferences, f, "foodPreferences")}>
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
                  key={s}
                  onClick={() => updateProfile({ travelStyle: s })}
                  className={cn(
                    "rounded-lg border py-2 text-[12.5px] font-medium transition-colors",
                    profile.travelStyle === s ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-2">
        <Link href="/premium">
          <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-[13.5px] font-medium text-foreground">Premium</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
        <Link href="/settings">
          <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-[13.5px] font-medium text-foreground">Settings</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
        <Link href="/business">
          <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-[13.5px] font-medium text-foreground">Business Mode</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
        active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
