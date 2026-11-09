"use client";
import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, HeartPulse, Newspaper } from "lucide-react";
import { useWorld } from "@/store/game";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KV, Progress, Stat } from "@/components/ui/misc";
import { ClubName, FormDots, PageTitle, PlayerLink, resultFor, scoreOf } from "@/components/game/common";
import { Crest } from "@/components/game/Crest";
import { nextUserFixture } from "@/engine/world/matchday";
import { currentCompetitionSeason, leagueStandings } from "@/engine/competition/season";
import { userNews } from "@/engine/world/news";
import { financialAlerts, weeklyWageBill } from "@/engine/finance/ledger";
import { ordinal } from "@/engine/world/board";
import { money, shortDate, longDate, wage } from "@/lib/format";
import { daysLeftInWindow } from "@/engine/transfers/market";

export default function Dashboard() {
  const world = useWorld();
  const club = world.clubs[world.meta.userClubId];
  const next = nextUserFixture(world);
  const table = club.leagueId ? leagueStandings(world, club.leagueId) : [];
  const pos = table.findIndex((r) => r.clubId === club.id);
  const recent = useMemo(
    () => Object.values(world.fixtures).filter((f) => f.status === "played" && (f.homeClubId === club.id || f.awayClubId === club.id)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [world, club.id, world.meta.currentDate], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const injuries = Object.values(world.players).filter((p) => p.clubId === club.id && p.injury && p.injury.until > world.meta.currentDate);
  const suspended = Object.values(world.players).filter((p) => p.clubId === club.id && p.suspensions.some((s) => s.matches > 0));
  const news = userNews(world).slice(0, 7);
  const transferNews = world.news.filter((n) => n.category === "transfer").slice(-6).reverse();
  const wages = weeklyWageBill(world, club.id);
  const alerts = financialAlerts(world, club.id);
  const win = daysLeftInWindow(world);
  const cs = club.leagueId ? currentCompetitionSeason(world, club.leagueId) : undefined;

  return (
    <div className="space-y-4">
      <PageTitle title="Dashboard" sub={`${world.manager.name} · ${longDate(world.meta.currentDate)}`} actions={win !== null ? <Badge tone="accent">Transfer window open · {win} days left</Badge> : <Badge>Transfer window closed</Badge>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Next match" action={next ? <Link className="text-xs text-accent hover:underline" href={`/game/match/?fixture=${next.id}`}>Match centre →</Link> : null} />
          <CardBody>
            {next ? (
              <div className="flex items-center justify-between gap-4" data-testid="next-match">
                <div className="flex flex-1 items-center justify-end gap-3 text-right">
                  <div className="text-lg font-semibold">{world.clubs[next.homeClubId].name}</div>
                  <Crest club={world.clubs[next.homeClubId]} size={42} />
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider text-muted">{world.competitions[next.competitionId].shortName}</div>
                  <div className="my-1 text-2xl font-black text-muted">vs</div>
                  <div className="text-xs text-muted">{shortDate(next.date)} · {next.roundName}</div>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <Crest club={world.clubs[next.awayClubId]} size={42} />
                  <div className="text-lg font-semibold">{world.clubs[next.awayClubId].name}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">No fixtures scheduled. The next season's fixtures appear on 1 July.</div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Club overview" />
          <CardBody className="grid grid-cols-2 gap-4">
            <Stat label="League position" value={pos >= 0 && cs ? ordinal(pos + 1) : "—"} sub={club.leagueId ? world.competitions[club.leagueId].name : ""} tone="accent" />
            <Stat label="Balance" value={money(club.finance.balance)} tone={club.finance.balance < 0 ? "danger" : undefined} />
            <div className="col-span-2">
              <div className="mb-1 flex justify-between text-xs text-muted"><span>Board confidence</span><span>{Math.round(club.boardConfidence)}%</span></div>
              <Progress value={club.boardConfidence} tone={club.boardConfidence < 30 ? "danger" : club.boardConfidence < 50 ? "warn" : "accent"} />
              <div className="mb-1 mt-3 flex justify-between text-xs text-muted"><span>Supporters</span><span>{Math.round(club.supporterMood)}%</span></div>
              <Progress value={club.supporterMood} tone="info" />
            </div>
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Latest results" />
          <div>
            {recent.length === 0 ? <div className="p-4 text-sm text-muted">No matches played yet.</div> : null}
            {recent.map((f) => {
              const r = resultFor(world, f, club.id);
              const opp = f.homeClubId === club.id ? f.awayClubId : f.homeClubId;
              return (
                <Link key={f.id} href={`/game/match/?fixture=${f.id}`} className="flex items-center gap-3 border-t border-line/60 px-4 py-2 text-sm first:border-0 hover:bg-surface2/60">
                  <FormDots form={r ? [r] : []} />
                  <span className="w-12 text-xs text-muted">{shortDate(f.date)}</span>
                  <span className="min-w-0 flex-1 truncate"><ClubName world={world} id={opp} short /> <span className="text-xs text-muted">({f.homeClubId === club.id ? "H" : "A"})</span></span>
                  <span className="font-semibold tabular-nums">{scoreOf(world, f)}</span>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="League table" action={<Link className="text-xs text-accent hover:underline" href="/game/competitions/">Full table →</Link>} />
          <table className="tbl">
            <thead><tr><th>#</th><th>Club</th><th className="num">P</th><th className="num">GD</th><th className="num">Pts</th></tr></thead>
            <tbody>
              {table.slice(Math.max(0, Math.min(pos - 3, table.length - 7)), Math.max(0, Math.min(pos - 3, table.length - 7)) + 7).map((r) => (
                <tr key={r.clubId} className={r.clubId === club.id ? "bg-accent/5" : ""}>
                  <td className="w-8 text-muted">{table.indexOf(r) + 1}</td>
                  <td><ClubName world={world} id={r.clubId} short /></td>
                  <td className="num">{r.played}</td>
                  <td className="num">{r.goalsFor - r.goalsAgainst}</td>
                  <td className="num font-semibold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Squad news" />
          <CardBody className="space-y-2 text-sm">
            {injuries.length === 0 && suspended.length === 0 ? <div className="text-muted">Everyone is available.</div> : null}
            {injuries.map((p) => (
              <div key={p.id} className="flex items-center gap-2"><HeartPulse size={14} className="text-danger" /><PlayerLink p={p} /><span className="text-xs text-muted">{p.injury!.type} · back {shortDate(p.injury!.until)}</span></div>
            ))}
            {suspended.map((p) => (
              <div key={p.id} className="flex items-center gap-2"><AlertTriangle size={14} className="text-warn" /><PlayerLink p={p} /><span className="text-xs text-muted">suspended ({p.suspensions.reduce((a, s) => a + s.matches, 0)} match)</span></div>
            ))}
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="News" action={<Link className="text-xs text-accent hover:underline" href="/game/inbox/">Inbox →</Link>} />
          <div>
            {news.map((n) => (
              <Link key={n.id} href="/game/inbox/" className="flex items-start gap-3 border-t border-line/60 px-4 py-2.5 first:border-0 hover:bg-surface2/50">
                <Newspaper size={14} className={n.important ? "mt-0.5 text-gold" : "mt-0.5 text-muted"} />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm ${n.read ? "text-muted" : "font-medium"}`}>{n.title}</div>
                  <div className="truncate text-xs text-muted">{n.body}</div>
                </div>
                <span className="shrink-0 text-xs text-muted">{shortDate(n.date)}</span>
              </Link>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Financial overview" action={<Link className="text-xs text-accent hover:underline" href="/game/finances/">Finances →</Link>} />
            <CardBody>
              <KV k="Transfer budget" v={money(club.finance.transferBudget)} />
              <KV k="Wage bill" v={`${wage(wages.players)} of ${wage(club.finance.wageBudget)}`} />
              <KV k="Staff wages" v={wage(wages.staff)} />
              {alerts.map((a) => <div key={a} className="mt-2 rounded-md border border-warn/30 bg-warn/5 px-2 py-1.5 text-xs text-warn">{a}</div>)}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Transfer news" />
            <div className="text-sm">
              {transferNews.length === 0 ? <div className="p-4 text-muted">No transfer activity yet.</div> : null}
              {transferNews.map((n) => <div key={n.id} className="truncate border-t border-line/60 px-4 py-2 first:border-0" title={n.body}>{n.title}</div>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
