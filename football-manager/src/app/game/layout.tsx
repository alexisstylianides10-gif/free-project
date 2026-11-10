"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Shapes, ArrowLeftRight, UserCog, Dumbbell, CalendarDays, Trophy, Building2, Shirt, Wallet, Landmark, BarChart3, Inbox, Save, Home,
  ChevronsRight, FastForward, Play, Loader2, Pause, Award,
} from "lucide-react";
import { saves, useGame } from "@/store/game";
import { Button } from "@/components/ui/button";
import { Crest } from "@/components/game/Crest";
import { Progress } from "@/components/ui/misc";
import { longDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { userFixtureOn } from "@/engine/world/matchday";
import { userNews } from "@/engine/world/news";

const NAV = [
  { href: "/game/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/game/inbox/", label: "Inbox", icon: Inbox },
  { href: "/game/squad/", label: "Squad", icon: Users },
  { href: "/game/tactics/", label: "Tactics", icon: Shapes },
  { href: "/game/transfers/", label: "Transfers", icon: ArrowLeftRight },
  { href: "/game/staff/", label: "Staff", icon: UserCog },
  { href: "/game/training/", label: "Training", icon: Dumbbell },
  { href: "/game/matches/", label: "Matches", icon: CalendarDays },
  { href: "/game/competitions/", label: "Competitions", icon: Trophy },
  { href: "/game/awards/", label: "Awards", icon: Award },
  { href: "/game/stadium/", label: "Stadium", icon: Building2 },
  { href: "/game/kits/", label: "Kits", icon: Shirt },
  { href: "/game/finances/", label: "Finances", icon: Wallet },
  { href: "/game/club/", label: "Club", icon: Landmark },
  { href: "/game/statistics/", label: "Statistics", icon: BarChart3 },
];

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const world = useGame((s) => s.world);
  useGame((s) => s.version);
  const busy = useGame((s) => s.busy);
  const dirty = useGame((s) => s.dirty);
  const advance = useGame((s) => s.advance);
  const save = useGame((s) => s.save);
  const cancel = useGame((s) => s.cancel);
  const toast = useGame((s) => s.toast);
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const setWorld = useGame((s) => s.setWorld);
  useEffect(() => {
    setMounted(true);
    // Session recovery: after a reload or crash, reopen the last saved state of this career.
    if (!useGame.getState().world) {
      let id: string | null = null;
      try { id = sessionStorage.getItem("fm-active-save"); } catch { id = null; }
      if (id) {
        setRestoring(true);
        saves().loadWithRecovery(id).then(({ world: w }) => setWorld(w, id)).catch(() => undefined).finally(() => setRestoring(false));
      }
    }
  }, [setWorld]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (useGame.getState().dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (!mounted || restoring) return restoring ? <main className="flex min-h-screen items-center justify-center text-sm text-muted"><Loader2 className="mr-2 animate-spin" size={16} /> Restoring your career…</main> : null;
  if (!world) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">No career loaded</h1>
        <p className="max-w-md text-sm text-muted">Start a new career or load a saved one from the main menu.</p>
        <Button variant="primary" onClick={() => router.push("/")}>Main menu</Button>
      </main>
    );
  }
  const club = world.clubs[world.meta.userClubId];
  const todayMatch = userFixtureOn(world, world.meta.currentDate);
  const unread = userNews(world).filter((n) => !n.read).length;
  const pendingBids = Object.values(world.negotiations).filter((n) => n.incoming && n.status === "open").length;

  const go = async (mode: "day" | "week" | "match") => {
    if (todayMatch) {
      router.push(`/game/match/?fixture=${todayMatch.id}`);
      return;
    }
    const out = await advance(mode);
    if (out.stoppedFor === "user_match" && out.pendingFixtureId) {
      toast("Match day! Prepare your team.", "info");
      router.push(`/game/match/?fixture=${out.pendingFixtureId}`);
    } else if (out.stoppedFor === "season_end") toast("The season has ended. A new season begins!", "success");
    else if (out.stoppedFor === "sacked") router.push("/game/club/");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-surface/60 lg:flex">
        <Link href="/" className="flex items-center gap-2 px-4 py-4 text-sm font-black tracking-tight">
          <Home size={16} className="text-muted" /> Touchline <span className="text-accent">Manager</span>
        </Link>
        <nav className="flex-1 overflow-auto px-2 pb-4" aria-label="Main">
          {NAV.map((n) => {
            const active = n.href === "/game/" ? pathname === "/game/" || pathname === "/game" : pathname.startsWith(n.href.replace(/\/$/, ""));
            const Icon = n.icon;
            const count = n.label === "Inbox" ? unread : n.label === "Transfers" ? pendingBids : 0;
            return (
              <Link key={n.href} href={n.href} data-testid={`nav-${n.label.toLowerCase()}`} className={cn("mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition", active ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface2 hover:text-fg")}>
                <Icon size={16} /> <span className="flex-1">{n.label}</span>
                {count > 0 ? <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">{count}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3 text-[11px] text-muted">
          {world.meta.dataset.isReal ? world.meta.dataset.label : <span className="text-warn">Fictional dataset</span>}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur"><div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <Link href="/game/club/" className="flex min-w-0 items-center gap-2">
            <Crest club={club} size={26} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" data-testid="topbar-club">{club.name}</div>
              <div className="truncate text-xs text-muted" data-testid="game-date">{longDate(world.meta.currentDate)}</div>
            </div>
          </Link>
          <select className="field ml-auto h-8 w-auto text-xs lg:hidden" value={pathname} onChange={(e) => router.push(e.target.value)} aria-label="Navigate">
            {NAV.map((n) => <option key={n.href} value={n.href}>{n.label}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => save("manual")} data-testid="save-button" title="Save career">
              <Save size={14} /> <span className="hidden sm:inline">{dirty ? "Save*" : "Save"}</span>
            </Button>
            {todayMatch ? (
              <Button size="sm" variant="gold" onClick={() => router.push(`/game/match/?fixture=${todayMatch.id}`)} data-testid="go-to-match">
                <Play size={14} /> Match day
              </Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={() => go("week")} disabled={!!busy || world.manager.sacked} data-testid="advance-week" title="Advance up to one week">
                  <FastForward size={14} /> <span className="hidden sm:inline">Week</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => go("match")} disabled={!!busy || world.manager.sacked} data-testid="advance-match" title="Advance to your next match">
                  <ChevronsRight size={14} /> <span className="hidden sm:inline">Next match</span>
                </Button>
                <Button size="sm" variant="primary" onClick={() => go("day")} disabled={!!busy || world.manager.sacked} data-testid="advance-day">
                  <Play size={14} /> Continue
                </Button>
              </>
            )}
          </div>
        </div>
        </header>
        {world.manager.sacked ? (
          <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">You have been dismissed by the board. Load an earlier save or start a new career from the main menu.</div>
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
      {busy ? (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur" data-testid="busy-bar">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Loader2 className="animate-spin text-accent" size={16} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{busy.label}</div>
              <Progress value={busy.progress} className="mt-1" />
            </div>
            <Button size="sm" variant="secondary" onClick={cancel} data-testid="pause-progress"><Pause size={14} /> Pause</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
