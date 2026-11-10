import type { Award, AwardKind, ID, Player, PlayerConversation, World } from "../core/types";
import { newId } from "../core/ids";
import { ageOn, addDays } from "../core/dates";
import { overall, POSITION_GROUP } from "../core/ratings";
import { clamp } from "../core/util";
import { Rng } from "../core/rng";
import { addNews } from "./news";
import { clubPlayers } from "./index";
import { fullName } from "./players";
import { daysLeftInWindow } from "../transfers/market";

/**
 * Career-mode layer: monthly and end-of-season awards, players asking to talk
 * to the manager (with promises that can be kept or broken), transfer rumours
 * and deadline-day round-ups.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function career(world: World): World["career"] {
  if (!world.career) world.career = { awards: [], conversations: [], monthSnap: {} };
  return world.career;
}

function userLeagueId(world: World): ID | null {
  return world.clubs[world.meta.userClubId]?.leagueId ?? null;
}

function leaguePlayers(world: World, leagueId: ID): Player[] {
  const out: Player[] = [];
  for (const c of Object.values(world.clubs)) if (c.leagueId === leagueId) out.push(...clubPlayers(world, c.id));
  return out;
}

type Line = [number, number, number, number, number];

function statLine(p: Player, compId: ID): Line {
  const s = p.seasonStats[compId];
  return s ? [s.goals, s.assists, s.apps, s.ratingSum, s.cleanSheets] : [0, 0, 0, 0, 0];
}

/** Performance score used for player awards (goals, assists, rating, clean sheets for defenders). */
function perfScore(p: Player, l: Line): number {
  const [g, a, apps, rs, cs] = l;
  if (apps <= 0) return -1;
  const avg = rs / apps;
  const grp = POSITION_GROUP[p.position];
  const csW = grp === "GK" ? 2.2 : grp === "DEF" ? 1.4 : 0;
  return g * 3.2 + a * 2.2 + (avg - 6.4) * 5 * apps + cs * csW;
}

function award(world: World, a: Omit<Award, "id">): Award {
  const x: Award = { id: newId(world, "aw"), ...a };
  career(world).awards.push(x);
  if (career(world).awards.length > 800) career(world).awards.splice(0, career(world).awards.length - 800);
  return x;
}

export const AWARD_LABEL: Record<AwardKind, string> = {
  player_of_month: "Player of the Month",
  manager_of_month: "Manager of the Month",
  golden_boot: "Golden Boot",
  player_of_season: "Player of the Season",
  young_player: "Young Player of the Season",
  team_of_season: "Team of the Season",
  golden_ball: "Golden Ball",
  club_player_of_season: "Club Player of the Season",
};

function snapshotMonth(world: World): void {
  const lid = userLeagueId(world);
  const snap: World["career"]["monthSnap"] = {};
  if (lid) for (const p of leaguePlayers(world, lid)) snap[p.id] = statLine(p, lid);
  career(world).monthSnap = snap;
}

/** Called on the 1st of every month: awards for the month that just ended in the user's league. */
export function monthlyCareer(world: World): void {
  const date = world.meta.currentDate;
  const lid = userLeagueId(world);
  const prev = addDays(date, -1);
  const pm = Number(prev.slice(5, 7));
  const inSeason = pm >= 8 || pm <= 5;
  if (lid && inSeason) {
    const snap = career(world).monthSnap;
    let best: { p: Player; score: number; line: Line } | null = null;
    for (const p of leaguePlayers(world, lid)) {
      const now = statLine(p, lid);
      const was = snap[p.id] ?? [0, 0, 0, 0, 0];
      const d: Line = [now[0] - was[0], now[1] - was[1], now[2] - was[2], now[3] - was[3], now[4] - was[4]];
      if (d[2] < 2) continue;
      const sc = perfScore(p, d);
      if (!best || sc > best.score) best = { p, score: sc, line: d };
    }
    const label = `${MONTHS[pm - 1]} ${prev.slice(0, 4)}`;
    const comp = world.competitions[lid];
    if (best && best.p.clubId) {
      const [g, a, apps, rs] = best.line;
      const note = `${g} goal${g === 1 ? "" : "s"}, ${a} assist${a === 1 ? "" : "s"} in ${apps} games (avg ${(rs / apps).toFixed(2)})`;
      award(world, { kind: "player_of_month", competitionId: lid, seasonId: world.meta.currentSeasonId, label, playerId: best.p.id, clubId: best.p.clubId, note });
      const mine = best.p.clubId === world.meta.userClubId;
      if (mine) {
        best.p.morale = clamp(best.p.morale + 8, 0, 100);
        best.p.happiness = clamp(best.p.happiness + 5, 0, 100);
      }
      addNews(world, { category: "competition", title: `${fullName(best.p)} named ${comp.shortName} Player of the Month`, body: `${fullName(best.p)} (${world.clubs[best.p.clubId].name}) wins the ${label} award: ${note}.`, clubIds: mine ? [world.meta.userClubId] : [], playerIds: [best.p.id], important: mine });
    }
    // manager of the month: most league points in the month (min 3 games)
    const pts = new Map<ID, { pts: number; n: number }>();
    for (const f of Object.values(world.fixtures)) {
      if (f.competitionId !== lid || f.status !== "played" || !f.matchId || f.date.slice(0, 7) !== prev.slice(0, 7)) continue;
      const m = world.matches[f.matchId];
      if (!m) continue;
      const [hp, ap] = m.homeGoals > m.awayGoals ? [3, 0] : m.homeGoals < m.awayGoals ? [0, 3] : [1, 1];
      for (const [c, p] of [[f.homeClubId, hp], [f.awayClubId, ap]] as const) {
        const e = pts.get(c) ?? { pts: 0, n: 0 };
        e.pts += p;
        e.n++;
        pts.set(c, e);
      }
    }
    const top = [...pts].filter(([, e]) => e.n >= 3).sort((a, b) => b[1].pts / b[1].n - a[1].pts / a[1].n)[0];
    if (top) {
      const [clubId, e] = top;
      const mine = clubId === world.meta.userClubId;
      award(world, { kind: "manager_of_month", competitionId: lid, seasonId: world.meta.currentSeasonId, label, playerId: null, clubId, note: `${e.pts} points from ${e.n} games` });
      if (mine) {
        world.manager.reputation = clamp(world.manager.reputation + 1, 1, 100);
        addNews(world, { category: "competition", title: `You are ${comp.shortName} Manager of the Month!`, body: `${e.pts} points from ${e.n} games in ${label} earn you the Manager of the Month award.`, clubIds: [clubId], important: true });
      }
    }
  }
  snapshotMonth(world);
}

/** End-of-season awards. Must run before season stats are reset. */
export function seasonAwards(world: World): void {
  const season = world.seasons[world.meta.currentSeasonId];
  const label = season.label;
  const lid = userLeagueId(world);
  const today = world.meta.currentDate;
  const leagueIds = new Set<ID>(lid ? [lid] : []);
  // the world's top leagues also crown winners for the Golden Ball race
  const leagues = Object.values(world.competitions).filter((c) => c.type === "league").sort((a, b) => b.reputation - a.reputation);
  for (const l of leagues.slice(0, 6)) leagueIds.add(l.id);
  const ballCandidates: { p: Player; score: number }[] = [];
  for (const id of leagueIds) {
    const comp = world.competitions[id];
    const players = leaguePlayers(world, id).filter((p) => p.clubId);
    const rows = players.map((p) => ({ p, line: statLine(p, id) })).filter((r) => r.line[2] > 0);
    if (!rows.length) continue;
    const maxApps = Math.max(...rows.map((r) => r.line[2]));
    const regular = rows.filter((r) => r.line[2] >= maxApps * 0.5);
    const isUser = id === lid;
    const mineIds = (pid: ID | null) => (pid && world.players[pid]?.clubId === world.meta.userClubId ? [world.meta.userClubId] : []);
    // golden boot
    const boot = rows.slice().sort((a, b) => b.line[0] - a.line[0] || a.line[2] - b.line[2])[0];
    if (boot && boot.line[0] > 0) {
      award(world, { kind: "golden_boot", competitionId: id, seasonId: season.id, label, playerId: boot.p.id, clubId: boot.p.clubId, note: `${boot.line[0]} goals in ${boot.line[2]} games` });
      if (isUser) addNews(world, { category: "competition", title: `${fullName(boot.p)} wins the ${comp.shortName} Golden Boot`, body: `${boot.line[0]} league goals for ${world.clubs[boot.p.clubId!].name}.`, clubIds: mineIds(boot.p.id), playerIds: [boot.p.id], important: true });
    }
    const scored = regular.map((r) => ({ ...r, score: perfScore(r.p, r.line) * (1 + overall(r.p) / 400) })).sort((a, b) => b.score - a.score);
    const pots = scored[0];
    if (pots) {
      award(world, { kind: "player_of_season", competitionId: id, seasonId: season.id, label, playerId: pots.p.id, clubId: pots.p.clubId, note: `${pots.line[0]} goals, ${pots.line[1]} assists, avg rating ${(pots.line[3] / pots.line[2]).toFixed(2)}` });
      if (isUser) addNews(world, { category: "competition", title: `${fullName(pots.p)} is the ${comp.shortName} Player of the Season`, body: `${world.clubs[pots.p.clubId!].name}'s ${fullName(pots.p)} takes the top individual award.`, clubIds: mineIds(pots.p.id), playerIds: [pots.p.id], important: true });
    }
    // strength of the league matters a lot: 20 goals in a top league beat 30 in a small one
    for (const r of scored.slice(0, 5)) ballCandidates.push({ p: r.p, score: r.score * Math.pow(comp.reputation / 100, 3) });
    if (!isUser) continue;
    const young = scored.find((r) => ageOn(r.p.dob, today) <= 21);
    if (young) award(world, { kind: "young_player", competitionId: id, seasonId: season.id, label, playerId: young.p.id, clubId: young.p.clubId, note: `Age ${ageOn(young.p.dob, today)} · ${young.line[0]} goals, ${young.line[1]} assists` });
    // team of the season: 1 GK, 4 DEF, 3 MID, 3 ATT
    const need: Record<string, number> = { GK: 1, DEF: 4, MID: 3, ATT: 3 };
    const avgSorted = regular.slice().sort((a, b) => b.line[3] / b.line[2] + b.line[0] * 0.02 - (a.line[3] / a.line[2] + a.line[0] * 0.02));
    for (const r of avgSorted) {
      const g = POSITION_GROUP[r.p.position];
      if (!need[g]) continue;
      need[g]--;
      award(world, { kind: "team_of_season", competitionId: id, seasonId: season.id, label, playerId: r.p.id, clubId: r.p.clubId, note: `${r.p.position} · avg ${(r.line[3] / r.line[2]).toFixed(2)}` });
    }
    const tots = career(world).awards.filter((a) => a.kind === "team_of_season" && a.seasonId === season.id && a.clubId === world.meta.userClubId);
    if (tots.length) addNews(world, { category: "competition", title: `${tots.length} of your players in the ${comp.shortName} Team of the Season`, body: tots.map((a) => fullName(world.players[a.playerId!])).join(", "), clubIds: [world.meta.userClubId], playerIds: tots.map((a) => a.playerId!), important: false });
  }
  // club player of the season (user's club, all competitions)
  const squad = clubPlayers(world, world.meta.userClubId);
  let bestClub: { p: Player; score: number; line: Line } | null = null;
  for (const p of squad) {
    const line: Line = [0, 0, 0, 0, 0];
    for (const s of Object.values(p.seasonStats)) {
      line[0] += s.goals; line[1] += s.assists; line[2] += s.apps; line[3] += s.ratingSum; line[4] += s.cleanSheets;
    }
    if (line[2] < 10) continue;
    const sc = perfScore(p, line);
    if (!bestClub || sc > bestClub.score) bestClub = { p, score: sc, line };
  }
  if (bestClub) {
    award(world, { kind: "club_player_of_season", competitionId: null, seasonId: season.id, label, playerId: bestClub.p.id, clubId: world.meta.userClubId, note: `${bestClub.line[0]} goals, ${bestClub.line[1]} assists in ${bestClub.line[2]} games` });
    addNews(world, { category: "general", title: `${fullName(bestClub.p)} voted Player of the Season by the fans`, body: `${bestClub.line[0]} goals and ${bestClub.line[1]} assists in ${bestClub.line[2]} appearances.`, clubIds: [world.meta.userClubId], playerIds: [bestClub.p.id] });
  }
  // golden ball: best player across the top leagues, boosted by trophies won
  const trophyBonus = new Map<ID, number>();
  for (const t of world.trophies) if (t.seasonId === season.id) {
    const rep = world.competitions[t.competitionId]?.reputation ?? 50;
    trophyBonus.set(t.clubId, (trophyBonus.get(t.clubId) ?? 0) + rep / 4);
  }
  const ball = ballCandidates.map((c) => ({ ...c, score: c.score + (trophyBonus.get(c.p.clubId ?? "") ?? 0) + (overall(c.p) - 70) * 4 })).sort((a, b) => b.score - a.score);
  if (ball[0]) {
    const w = ball[0].p;
    award(world, { kind: "golden_ball", competitionId: null, seasonId: season.id, label, playerId: w.id, clubId: w.clubId, note: `Runner-up: ${ball[1] ? fullName(ball[1].p) : "—"}` });
    addNews(world, { category: "general", title: `${fullName(w)} wins the Golden Ball`, body: `${fullName(w)} of ${world.clubs[w.clubId!]?.name ?? "—"} is voted the best player in the world for ${label}.${ball[1] ? ` ${fullName(ball[1].p)} finishes second.` : ""}`, clubIds: w.clubId === world.meta.userClubId ? [w.clubId] : [], playerIds: [w.id], important: true });
  }
}

// ---------------------------------------------------------------------------
// Player conversations
// ---------------------------------------------------------------------------

function userMatchesPlayed(world: World): number {
  let n = 0;
  const uc = world.meta.userClubId;
  for (const f of Object.values(world.fixtures)) if (f.status === "played" && f.seasonId === world.meta.currentSeasonId && (f.homeClubId === uc || f.awayClubId === uc)) n++;
  return n;
}

function starts(p: Player): number {
  let s = 0;
  for (const x of Object.values(p.seasonStats)) s += x.starts;
  return s;
}

function hasRecent(world: World, playerId: ID, topic: PlayerConversation["topic"], days: number): boolean {
  const since = addDays(world.meta.currentDate, -days);
  return career(world).conversations.some((c) => c.playerId === playerId && c.topic === topic && (c.status === "open" || c.date >= since));
}

function open(world: World, p: Player, topic: PlayerConversation["topic"], message: string, options: PlayerConversation["options"]): void {
  career(world).conversations.push({ id: newId(world, "conv"), date: world.meta.currentDate, playerId: p.id, topic, message, options, status: "open", chosen: null, outcome: null, promise: null });
  if (career(world).conversations.length > 200) career(world).conversations.splice(0, career(world).conversations.length - 200);
  addNews(world, { category: "general", title: `${fullName(p)} wants to talk`, body: message, clubIds: [world.meta.userClubId], playerIds: [p.id], important: true });
}

export function openConversations(world: World): PlayerConversation[] {
  return (world.career?.conversations ?? []).filter((c) => c.status === "open" && world.players[c.playerId]?.clubId === world.meta.userClubId);
}

/** A player whose move to a bigger club was blocked asks to talk. Called when the user rejects an incoming bid. */
export function blockedMoveConversation(world: World, playerId: ID, buyerClubId: ID): void {
  const p = world.players[playerId];
  if (!p || hasRecent(world, p.id, "wants_move", 90)) return;
  const buyer = world.clubs[buyerClubId];
  open(world, p, "wants_move", `"Boss, ${buyer.name} wanted me. A chance like that might not come again — I want to know where I stand."`, [
    { id: "key", text: "You're key to my plans — you're staying.", hint: "Works if he plays a lot. Ambitious players may sulk." },
    { id: "next_summer", text: "Give me one more season, then we'll talk again.", hint: "Calms him now; breaking it later will hurt." },
    { id: "let_go", text: "If the right offer comes, you can go.", hint: "He's happy, but he'll be transfer listed." },
  ]);
}

/** Weekly: new conversations for the user's squad, and checks on promises. */
export function weeklyConversations(world: World, rng: Rng): void {
  const uc = world.meta.userClubId;
  const played = userMatchesPlayed(world);
  const season = world.seasons[world.meta.currentSeasonId];
  const today = world.meta.currentDate;
  // promises due
  for (const c of career(world).conversations) {
    if (c.status !== "resolved" || !c.promise) continue;
    const p = world.players[c.playerId];
    if (!p || p.clubId !== uc) { c.promise = null; continue; }
    const pr = c.promise;
    if (played - pr.matchesAtPromise < pr.window) continue;
    const got = starts(p) - pr.startsAtPromise;
    if (got >= pr.target) {
      p.happiness = clamp(p.happiness + 12, 0, 100);
      p.morale = clamp(p.morale + 6, 0, 100);
      c.outcome = `Promise kept: ${got} starts in ${pr.window} games.`;
      addNews(world, { category: "general", title: `${fullName(p)} is happy you kept your word`, body: `You promised ${pr.target} starts in ${pr.window} games and he got ${got}.`, clubIds: [uc], playerIds: [p.id] });
    } else {
      p.happiness = clamp(p.happiness - 25, 0, 100);
      p.morale = clamp(p.morale - 12, 0, 100);
      if (p.squadStatus === "none") p.squadStatus = "listed";
      c.outcome = `Promise broken: only ${got} of ${pr.target} starts. He has asked to leave.`;
      addNews(world, { category: "general", title: `${fullName(p)} hands in a transfer request`, body: `You promised him ${pr.target} starts in ${pr.window} games; he got ${got}. He has been transfer listed at his request.`, clubIds: [uc], playerIds: [p.id], important: true });
    }
    c.promise = null;
  }
  // expire stale conversations (ignored for 3 weeks)
  for (const c of career(world).conversations) if (c.status === "open" && c.date < addDays(today, -21)) {
    c.status = "expired";
    const p = world.players[c.playerId];
    if (p) p.happiness = clamp(p.happiness - 8, 0, 100);
    c.outcome = "You never got back to him. He feels ignored.";
  }
  if (openConversations(world).length >= 2) return;
  const squad = clubPlayers(world, uc).filter((p) => p.contract && !p.loanParentClubId);
  const ranked = squad.slice().sort((a, b) => overall(b) - overall(a));
  // playing time
  if (played >= 6) {
    const unhappy = ranked.slice(0, 18).filter((p) => p.happiness < 42 && ["key", "first_team", "rotation"].includes(p.contract!.squadRole) && !hasRecent(world, p.id, "playing_time", 70));
    const p = unhappy[0];
    if (p && rng.chance(0.6)) {
      const share = played ? starts(p) / played : 0;
      open(world, p, "playing_time", `"I've started ${starts(p)} of our ${played} games (${Math.round(share * 100)}%). I came here to play, not to sit on the bench."`, [
        { id: "promise", text: "You'll start at least 3 of the next 5 games.", hint: "Big boost if you keep it. Break it and he asks to leave." },
        { id: "fight", text: "Earn it in training like everyone else.", hint: "Professionals respond well; others won't." },
        { id: "list", text: "If you're not happy, you can find a new club.", hint: "He's transfer listed." },
      ]);
      return;
    }
  }
  // contract talks: important players with < 12 months left
  const yearOut = addDays(today, 365);
  const want = ranked.slice(0, 14).find((p) => p.contract!.endDate <= yearOut && p.contract!.endDate >= today && !hasRecent(world, p.id, "contract", 120) && ageOn(p.dob, today) < 33);
  if (want && today >= addDays(season.startDate, 20) && rng.chance(0.5)) {
    open(world, want, "contract", `"My contract runs out on ${want.contract!.endDate}. I'd like to know if the club sees a future for me here."`, [
      { id: "talks", text: "Of course — let's open talks on a new deal.", hint: "Open his profile to make an offer. He'll be patient for a while." },
      { id: "later", text: "Let's see how the season goes.", hint: "He's a little disappointed." },
      { id: "no", text: "We won't be offering a new contract.", hint: "He'll look elsewhere; morale drops." },
    ]);
  }
}

/** The manager's answer to a conversation. Returns a short outcome text. */
export function respondConversation(world: World, conversationId: ID, optionId: string): string {
  const c = career(world).conversations.find((x) => x.id === conversationId);
  if (!c || c.status !== "open") return "This conversation is closed.";
  const p = world.players[c.playerId];
  if (!p) return "Player not found.";
  const pro = p.personality.professionalism;
  const amb = p.personality.ambition;
  let out = "";
  const h = (d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
  const m = (d: number) => (p.morale = clamp(p.morale + d, 0, 100));
  switch (`${c.topic}:${optionId}`) {
    case "playing_time:promise":
      h(15); m(8);
      c.promise = { target: 3, window: 5, startsAtPromise: starts(p), matchesAtPromise: userMatchesPlayed(world) };
      out = "He's delighted. Start him in at least 3 of the next 5 games.";
      break;
    case "playing_time:fight":
      if (pro >= 14) { h(4); m(5); out = "He nods and goes back to work. He'll show you in training."; }
      else { h(-10); m(-6); out = "He walks out without a word. He's not convinced."; }
      break;
    case "playing_time:list":
      h(-5); m(-4);
      if (p.squadStatus === "none") p.squadStatus = "listed";
      out = "He's been placed on the transfer list.";
      break;
    case "contract:talks":
      h(8); m(4);
      out = "He's pleased. Open his profile to offer a new contract.";
      break;
    case "contract:later":
      h(-6);
      out = "He's disappointed but will wait — for now.";
      break;
    case "contract:no":
      h(-15); m(-10);
      out = "He's hurt. Expect him to leave on a free or ask for a move.";
      break;
    case "wants_move:key":
      if (amb >= 15 && p.happiness < 50) { h(-8); m(-5); out = "He doesn't look convinced. Keep him playing or he'll ask again."; }
      else { h(10); m(6); out = "He's flattered and commits to the club."; }
      break;
    case "wants_move:next_summer":
      h(10); m(4);
      out = "He accepts — but he'll remember that promise.";
      break;
    case "wants_move:let_go":
      h(12);
      if (p.squadStatus === "none") p.squadStatus = "listed";
      out = "He thanks you. He's now transfer listed.";
      break;
    default:
      out = "No change.";
  }
  c.status = "resolved";
  c.chosen = optionId;
  c.outcome = out;
  return out;
}

// ---------------------------------------------------------------------------
// Transfer rumours and deadline day
// ---------------------------------------------------------------------------

export function dailyTransferBuzz(world: World, rng: Rng): void {
  const left = daysLeftInWindow(world);
  if (left === null) return;
  const today = world.meta.currentDate;
  const uc = world.meta.userClubId;
  const lid = userLeagueId(world);
  if (left === 0) {
    const season = world.seasons[world.meta.currentSeasonId];
    const win = season.transferWindows.find((w) => today >= w.start && today <= w.end);
    const deals = world.transfers.filter((t) => t.type === "permanent" && win && t.date >= win.start && t.date <= today).sort((a, b) => b.fee - a.fee).slice(0, 5);
    if (deals.length) {
      const lines = deals.map((t) => `${fullName(world.players[t.playerId])}: ${world.clubs[t.fromClubId ?? ""]?.shortName ?? "—"} → ${world.clubs[t.toClubId ?? ""]?.shortName ?? "—"} (€${(t.fee / 1e6).toFixed(1)}m)`);
      addNews(world, { category: "transfer", title: "Deadline day: the window slams shut", body: `The biggest deals of the window:\n${lines.join("\n")}`, clubIds: [uc], important: true });
    }
    return;
  }
  if (left === 1) addNews(world, { category: "transfer", title: "24 hours left in the transfer window", body: "Any deal you want done must be agreed by tomorrow.", clubIds: [uc] });
  if (!rng.chance(0.18)) return;
  // a rumour: a bigger club eyeing one of your best players, or a star in your league
  const mine = clubPlayers(world, uc).filter((p) => p.contract && !p.loanParentClubId).sort((a, b) => overall(b) - overall(a)).slice(0, 5);
  const userRep = world.clubs[uc].reputation;
  const bigger = Object.values(world.clubs).filter((c) => c.reputation >= userRep + 8 && !c.isUser);
  if (mine.length && bigger.length && rng.chance(0.55)) {
    const p = rng.pick(mine);
    const c = rng.pick(bigger);
    addNews(world, { category: "transfer", title: `Rumour: ${c.shortName} monitoring ${fullName(p)}`, body: `Reports suggest ${c.name} have sent scouts to watch ${fullName(p)}. Nothing official yet.`, clubIds: [uc], playerIds: [p.id] });
    return;
  }
  if (!lid) return;
  const stars = leaguePlayers(world, lid).filter((p) => p.clubId !== uc && overall(p) >= 70).sort((a, b) => b.value - a.value).slice(0, 15);
  if (!stars.length || !bigger.length) return;
  const p = rng.pick(stars);
  const c = rng.pick(bigger);
  if (c.id === p.clubId) return;
  addNews(world, { category: "transfer", title: `Rumour: ${fullName(p)} linked with ${c.shortName}`, body: `${world.clubs[p.clubId!].name}'s ${fullName(p)} (valued at €${(p.value / 1e6).toFixed(1)}m) is reportedly on ${c.name}'s shortlist.`, clubIds: [uc], playerIds: [p.id] });
}
