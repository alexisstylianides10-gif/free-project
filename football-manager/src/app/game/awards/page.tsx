"use client";
import { useMemo, useState } from "react";
import { Award as AwardIcon, Crown, Medal, Star, Trophy } from "lucide-react";
import { useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Empty, RatingChip } from "@/components/ui/misc";
import { ClubName, PageTitle, PlayerLink, PosBadge } from "@/components/game/common";
import { Crest } from "@/components/game/Crest";
import type { Award, AwardKind } from "@/engine/core/types";
import { AWARD_LABEL } from "@/engine/world/career";
import { overall } from "@/engine/core/ratings";
import { cn } from "@/lib/cn";

const ICON: Partial<Record<AwardKind, typeof Trophy>> = { golden_ball: Crown, golden_boot: Medal, player_of_season: Star, young_player: Star, club_player_of_season: AwardIcon };

function Winner({ a, big }: { a: Award; big?: boolean }) {
  const world = useWorld();
  const p = a.playerId ? world.players[a.playerId] : null;
  const club = a.clubId ? world.clubs[a.clubId] : null;
  const mine = a.clubId === world.meta.userClubId;
  const Icon = ICON[a.kind] ?? Trophy;
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", mine ? "border-gold/60 bg-gold/10" : "border-line bg-surface2/40")} data-testid="award">
      <Icon size={big ? 26 : 18} className={a.kind === "golden_ball" ? "text-gold" : "text-accent"} />
      {club ? <Crest club={club} size={big ? 36 : 26} /> : null}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted">{AWARD_LABEL[a.kind]}{a.competitionId ? ` · ${world.competitions[a.competitionId]?.shortName ?? ""}` : ""} · {a.label}</div>
        <div className={cn("truncate font-semibold", big && "text-lg")}>{p ? <PlayerLink p={p} /> : club ? <span>{world.manager.clubId === club.id ? world.manager.name : `${club.shortName} manager`}</span> : "—"}</div>
        <div className="truncate text-xs text-muted">{club ? <ClubName world={world} id={club.id} short /> : null} · {a.note}</div>
      </div>
      {p ? <RatingChip value={overall(p)} /> : null}
    </div>
  );
}

export default function AwardsPage() {
  const world = useWorld();
  const awards = world.career?.awards ?? [];
  const seasons = useMemo(() => Array.from(new Set(awards.map((a) => a.seasonId))).reverse(), [awards]);
  const [sid, setSid] = useState<string>(seasons[0] ?? world.meta.currentSeasonId);
  const list = awards.filter((a) => a.seasonId === sid);
  const lid = world.clubs[world.meta.userClubId].leagueId;
  const seasonal = list.filter((a) => ["golden_ball", "player_of_season", "golden_boot", "young_player", "club_player_of_season"].includes(a.kind) && (a.kind === "golden_ball" || a.kind === "club_player_of_season" || a.competitionId === lid));
  const otherLeagues = list.filter((a) => (a.kind === "player_of_season" || a.kind === "golden_boot") && a.competitionId !== lid);
  const tots = list.filter((a) => a.kind === "team_of_season");
  const monthly = list.filter((a) => a.kind === "player_of_month" || a.kind === "manager_of_month").reverse();
  const myCount = awards.filter((a) => a.clubId === world.meta.userClubId).length;
  return (
    <div className="space-y-4">
      <PageTitle title="Awards" sub={`${myCount} award${myCount === 1 ? "" : "s"} won by your club and players`} actions={seasons.length > 1 ? <Select label="Season" value={sid} onChange={setSid} options={seasons.map((s) => ({ value: s, label: world.seasons[s]?.label ?? s }))} className="w-36" /> : null} />
      {!list.length ? <Card><Empty title="No awards yet">Player of the Month is announced at the start of every month. Season awards, Team of the Season and the Golden Ball come at the end of the season.</Empty></Card> : null}
      {seasonal.length ? (
        <Card>
          <CardHeader title="Season awards" />
          <CardBody className="grid gap-2 md:grid-cols-2">{seasonal.map((a) => <Winner key={a.id} a={a} big={a.kind === "golden_ball"} />)}</CardBody>
        </Card>
      ) : null}
      {tots.length ? (
        <Card>
          <CardHeader title={`Team of the Season · ${world.competitions[tots[0].competitionId ?? ""]?.shortName ?? ""}`} />
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tots.map((a) => {
              const p = world.players[a.playerId!];
              return (
                <div key={a.id} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", a.clubId === world.meta.userClubId ? "border-gold/60 bg-gold/10" : "border-line")}>
                  <PosBadge pos={p.position} />
                  <PlayerLink p={p} className="min-w-0 flex-1 truncate font-medium" />
                  <span className="text-xs text-muted">{a.clubId ? world.clubs[a.clubId]?.shortName : ""}</span>
                  <RatingChip value={overall(p)} />
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : null}
      {monthly.length ? (
        <Card>
          <CardHeader title="Monthly awards" />
          <CardBody className="grid gap-2 md:grid-cols-2">{monthly.map((a) => <Winner key={a.id} a={a} />)}</CardBody>
        </Card>
      ) : null}
      {otherLeagues.length ? (
        <Card>
          <CardHeader title="Around the world" />
          <CardBody className="grid gap-2 md:grid-cols-2">{otherLeagues.map((a) => <Winner key={a.id} a={a} />)}</CardBody>
        </Card>
      ) : null}
    </div>
  );
}
