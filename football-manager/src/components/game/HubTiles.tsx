"use client";
import Link from "next/link";
import { ArrowLeftRight, Award, Inbox, Shapes, Trophy, Users } from "lucide-react";
import type { World } from "@/engine/core/types";
import { overall } from "@/engine/core/ratings";
import { clubPlayers } from "@/engine/world/index";
import { userNews } from "@/engine/world/news";
import { leagueStandings } from "@/engine/competition/season";
import { ordinal } from "@/engine/world/board";
import { money } from "@/lib/format";

/** Career-mode hub: big tappable tiles with the one number that matters for each area. */
export function HubTiles({ world }: { world: World }) {
  const club = world.clubs[world.meta.userClubId];
  const squad = clubPlayers(world, club.id);
  const top = squad.map((p) => overall(p)).sort((a, b) => b - a).slice(0, 11);
  const teamOvr = top.length ? Math.round(top.reduce((a, b) => a + b, 0) / top.length) : 0;
  const unread = userNews(world).filter((n) => !n.read).length;
  const table = club.leagueId ? leagueStandings(world, club.leagueId) : [];
  const pos = table.findIndex((r) => r.clubId === club.id);
  const awards = (world.career?.awards ?? []).filter((a) => a.clubId === club.id).length;
  const tiles = [
    { href: "/game/squad/", label: "Squad", value: `${teamOvr} OVR`, sub: `${squad.length} players`, icon: Users },
    { href: "/game/tactics/", label: "Tactics", value: "Line-up", sub: "Formation & roles", icon: Shapes },
    { href: "/game/transfers/", label: "Transfers", value: money(club.finance.transferBudget), sub: "Budget", icon: ArrowLeftRight },
    { href: "/game/inbox/", label: "Inbox", value: unread ? `${unread} new` : "Up to date", sub: "News & offers", icon: Inbox },
    { href: "/game/competitions/", label: "Table", value: pos >= 0 ? ordinal(pos + 1) : "—", sub: club.leagueId ? world.competitions[club.leagueId].shortName : "", icon: Trophy },
    { href: "/game/awards/", label: "Awards", value: String(awards), sub: "Won by your club", icon: Award },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" data-testid="hub-tiles">
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="panel group relative overflow-hidden p-3 transition active:scale-[0.98] hover:border-accent/50">
          <t.icon size={42} className="absolute -right-2 -top-2 text-accent/10 transition group-hover:text-accent/20" />
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.label}</div>
          <div className="mt-1 truncate text-lg font-bold">{t.value}</div>
          <div className="truncate text-xs text-muted">{t.sub}</div>
        </Link>
      ))}
    </div>
  );
}
