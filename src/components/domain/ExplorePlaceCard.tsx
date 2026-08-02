import { Bookmark, Star } from "lucide-react";
import { ExplorePlace } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function ExplorePlaceCard({
  place,
  saved,
  onToggleSave,
  onAddToTrip,
}: {
  place: ExplorePlace;
  saved: boolean;
  onToggleSave: () => void;
  onAddToTrip?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className={cn("relative flex h-28 items-center justify-center bg-gradient-to-br", place.gradient)}>
        <span className="text-4xl">{place.emoji}</span>
        <button
          onClick={onToggleSave}
          aria-label="Save place"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
        >
          <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-white")} />
        </button>
      </div>
      <div className="p-3.5">
        <p className="truncate text-[14px] font-semibold text-foreground">{place.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {place.rating}
          </span>
          <span>·</span>
          <span>{place.price}</span>
          <span>·</span>
          <span>{place.distanceKm.toFixed(1)}km</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{place.description}</p>
        {onAddToTrip && (
          <Button size="sm" variant="outline" className="mt-2.5 w-full" onClick={onAddToTrip}>
            Add to Trip
          </Button>
        )}
      </div>
    </div>
  );
}
