"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Database, FolderOpen, Play, PlusCircle, ShieldCheck, WifiOff } from "lucide-react";
import { datasets, saves, useGame } from "@/store/game";
import type { SaveMeta } from "@/db/saves";
import type { DatasetInfo } from "@/data/datasets";
import { getStore } from "@/db/storage";
import { date } from "@/lib/format";

export default function MainMenu() {
  const router = useRouter();
  const setWorld = useGame((s) => s.setWorld);
  const toast = useGame((s) => s.toast);
  const current = useGame((s) => s.world);
  const [last, setLast] = useState<SaveMeta | null>(null);
  const [libs, setLibs] = useState<DatasetInfo[] | null>(null);
  const [where, setWhere] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const id = await saves().lastSaveId();
        if (id) setLast((await saves().list()).find((s) => s.id === id) ?? null);
        setLibs(await datasets().list());
        setWhere(await getStore().location());
      } catch (e) {
        toast((e as Error).message, "error");
      }
    })();
  }, [toast]);

  const resume = async () => {
    if (!last) return;
    setLoading(true);
    try {
      const { world, recoveredFrom } = await saves().loadWithRecovery(last.id);
      setWorld(world, last.id);
      if (recoveredFrom) toast("The save was damaged; the most recent working backup was loaded.", "warn");
      router.push("/game/");
    } catch (e) {
      toast(`Could not load save: ${(e as Error).message}`, "error");
      setLoading(false);
    }
  };

  const real = libs?.some((l) => l.isReal);
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <PitchBackdrop />
      <div className="relative z-10 w-full max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs text-muted">
            <WifiOff size={12} /> Fully offline · single-player
          </div>
          <h1 className="font-display text-5xl font-black tracking-tight sm:text-6xl">
            Touchline <span className="text-accent">Manager</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">Take charge of an existing club and build a dynasty in a living football world — squad, tactics, transfers, staff, stadium and finances.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {current ? (
            <MenuButton icon={<Play />} title="Return to game" sub={`${current.clubs[current.meta.userClubId].name} · ${date(current.meta.currentDate)}`} onClick={() => router.push("/game/")} primary testId="menu-return" />
          ) : last ? (
            <MenuButton icon={<Play />} title={loading ? "Loading…" : "Continue"} sub={`${last.clubName} · ${date(last.gameDate)}`} onClick={resume} primary testId="menu-continue" />
          ) : null}
          <MenuButton icon={<PlusCircle />} title="New career" sub="Choose an existing club to manage" href="/new/" testId="menu-new" primary={!current && !last} />
          <MenuButton icon={<FolderOpen />} title="Load career" sub="Saves, backups and restores" href="/load/" testId="menu-load" />
          <MenuButton icon={<Database />} title="Data & import" sub="Databases, coverage and offline updates" href="/data/" testId="menu-data" />
        </div>
        <div className="mt-8 rounded-xl border border-line bg-surface/70 p-4 text-sm text-muted">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-accent" size={18} />
            <div>
              {libs === null ? "Checking installed databases…" : real ? "A real-world dataset is installed. Check its coverage on the Data page." : (
                <>
                  <span className="font-medium text-fg">No licensed real-world database is installed.</span> The bundled <em>Development World</em> is entirely fictional and exists so every system can be played and tested.
                  Import a licensed 2026/27 dataset (JSON/CSV) on the <Link className="text-accent underline-offset-2 hover:underline" href="/data/">Data</Link> page.
                </>
              )}
              {where ? <div className="mt-1 text-xs text-muted/70">Saves are stored in: {where}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MenuButton({ icon, title, sub, href, onClick, primary, testId }: { icon: React.ReactNode; title: string; sub: string; href?: string; onClick?: () => void; primary?: boolean; testId?: string }) {
  const inner = (
    <div className={`group flex h-full items-center gap-4 rounded-2xl border p-5 text-left transition ${primary ? "border-accent/40 bg-accent/10 hover:bg-accent/15" : "border-line bg-surface/80 hover:border-muted/40 hover:bg-surface2"}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${primary ? "bg-accent text-black" : "bg-surface2 text-fg"}`}>{icon}</div>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="truncate text-sm text-muted">{sub}</div>
      </div>
    </div>
  );
  if (href) return <Link href={href} data-testid={testId}>{inner}</Link>;
  return (
    <button type="button" onClick={onClick} data-testid={testId} className="text-left">
      {inner}
    </button>
  );
}

function PitchBackdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" viewBox="0 0 1050 680" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g fill="none" stroke="#22d38b" strokeWidth="3">
        <rect x="20" y="20" width="1010" height="640" />
        <line x1="525" y1="20" x2="525" y2="660" />
        <circle cx="525" cy="340" r="92" />
        <rect x="20" y="138" width="165" height="404" />
        <rect x="865" y="138" width="165" height="404" />
        <rect x="20" y="248" width="55" height="184" />
        <rect x="975" y="248" width="55" height="184" />
      </g>
    </svg>
  );
}

