"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Upload, Trash2, Archive, RotateCcw } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/misc";
import { saves, useGame } from "@/store/game";
import type { BackupMeta, SaveMeta } from "@/db/saves";
import { date } from "@/lib/format";

export default function LoadPage() {
  const router = useRouter();
  const setWorld = useGame((s) => s.setWorld);
  const toast = useGame((s) => s.toast);
  const [list, setList] = useState<SaveMeta[] | null>(null);
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setList(await saves().list());
    setBackups(await saves().listBackups());
  }, []);
  useEffect(() => { refresh().catch((e) => toast((e as Error).message, "error")); }, [refresh, toast]);

  const load = async (id: string) => {
    setBusy(id);
    try {
      const { world, recoveredFrom } = await saves().loadWithRecovery(id);
      setWorld(world, id);
      if (recoveredFrom) toast("The save was damaged; the newest working backup was loaded.", "warn");
      router.push("/game/");
    } catch (e) {
      toast(`Could not load: ${(e as Error).message}`, "error");
      setBusy(null);
    }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast(ok, "success"); await refresh(); } catch (e) { toast((e as Error).message, "error"); }
  };
  const exportSave = async (s: SaveMeta) => {
    const bytes = await saves().exportBytes(s.id);
    const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: "application/x-sqlite3" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.id}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importSave = async (file: File) => act(async () => { await saves().importBytes(new Uint8Array(await file.arrayBuffer())); }, "Save imported.");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg p-2 text-muted hover:bg-surface2" aria-label="Back"><ArrowLeft size={18} /></Link>
          <h1 className="text-2xl font-bold">Load career</h1>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface2 px-3 py-2 text-sm hover:border-muted/40">
          <Upload size={14} /> Import save file
          <input type="file" accept=".sqlite,.db" className="hidden" onChange={(e) => e.target.files?.[0] && importSave(e.target.files[0])} />
        </label>
      </div>
      <Card>
        <CardHeader title="Saved careers" />
        {list === null ? <div className="p-6 text-sm text-muted">Loading…</div> : list.length === 0 ? <Empty title="No saved careers yet"><Link className="text-accent" href="/new/">Start a new career</Link></Empty> : list.map((s) => {
          const bks = backups.filter((b) => b.saveId === s.id);
          return (
            <div key={s.id} className="border-t border-line/60 p-4 first:border-0" data-testid="save-row">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{s.saveName} {s.kind === "auto" ? <Badge tone="info">Autosave</Badge> : null} {!s.datasetIsReal ? <Badge tone="warn">Fictional data</Badge> : null}</div>
                  <div className="text-sm text-muted">{s.clubName} · {s.managerName} · in-game {date(s.gameDate)} · saved {new Date(s.savedAt).toLocaleString()} · {(s.sizeBytes / 1e6).toFixed(1)} MB</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => load(s.id)} disabled={!!busy} data-testid="load-save">{busy === s.id ? "Loading…" : "Load"}</Button>
                  <Button size="sm" onClick={() => act(() => saves().createBackup(s.id), "Backup created.")}><Archive size={14} /> Backup</Button>
                  <Button size="sm" variant="ghost" onClick={() => exportSave(s)} title="Export .sqlite file"><Download size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${s.saveName}" and its backups? This cannot be undone.`) && act(() => saves().delete(s.id), "Save deleted.")} title="Delete"><Trash2 size={14} /></Button>
                </div>
              </div>
              {bks.length ? (
                <div className="mt-3 space-y-1 rounded-lg border border-line bg-surface2/40 p-2">
                  {bks.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted">{b.reason === "rolling" ? "Automatic" : b.reason === "manual" ? "Manual" : "Before restore"} backup · in-game {date(b.gameDate)} · {new Date(b.createdAt).toLocaleString()}</span>
                      <span className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => confirm("Restore this backup? The current save is backed up first.") && act(() => saves().restoreBackup(b.id), "Backup restored.")}><RotateCcw size={12} /> Restore</Button>
                        <Button size="sm" variant="ghost" onClick={() => act(() => saves().deleteBackup(b.id), "Backup deleted.")}><Trash2 size={12} /></Button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </Card>
    </main>
  );
}
