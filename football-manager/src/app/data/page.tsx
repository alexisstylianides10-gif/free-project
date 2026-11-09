"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, CheckCircle2, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KV } from "@/components/ui/misc";
import { datasets, useGame } from "@/store/game";
import type { DatasetInfo } from "@/data/datasets";
import type { ImportReport } from "@/data/importer";

export default function DataPage() {
  const toast = useGame((s) => s.toast);
  const [list, setList] = useState<DatasetInfo[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [baseId, setBaseId] = useState("");
  const refresh = useCallback(async () => setList(await datasets().list()), []);
  useEffect(() => { refresh().catch((e) => toast((e as Error).message, "error")); }, [refresh, toast]);
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const texts = await Promise.all(Array.from(files).map(async (f) => ({ name: f.name, text: await f.text() })));
      const r = await datasets().import(texts, baseId || undefined);
      setReport(r);
      if (r.ok) { toast(`Imported "${r.datasetName}".`, "success"); await refresh(); }
      else toast("Import failed validation — nothing was installed.", "error");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-lg p-2 text-muted hover:bg-surface2" aria-label="Back"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl font-bold">Data & import</h1><p className="text-sm text-muted">Install offline football databases. Careers copy the database at creation, so updates never change running careers.</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Installed databases" />
          {list.map((d) => (
            <div key={d.id} className="border-t border-line/60 p-4 first:border-0" data-testid="dataset-row">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{d.name} <span className="text-sm text-muted">v{d.version} · {d.season}</span></div>
                <div className="flex gap-2">{d.isReal ? <Badge tone="accent">Real-world data</Badge> : <Badge tone="warn">Fictional</Badge>}{d.builtIn ? <Badge>Built-in</Badge> : <Button size="sm" variant="ghost" onClick={() => confirm("Remove this dataset? Existing careers are not affected.") && datasets().remove(d.id).then(refresh)}><Trash2 size={14} /></Button>}</div>
              </div>
              <p className="mt-1 text-sm text-muted">{d.coverageNote}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-3">
                {Object.entries(d.counts).map(([k, v]) => <KV key={k} k={k} v={v.toLocaleString()} />)}
                {d.coverage ? <><KV k="Clubs with full squads" v={`${d.coverage.clubsWithFullSquad}/${d.coverage.clubs}`} /><KV k="Clubs with staff" v={`${d.coverage.clubsWithStaff}/${d.coverage.clubs}`} /><KV k="Players with contracts" v={`${d.coverage.playersWithContracts}/${d.coverage.players}`} /></> : null}
              </div>
              <div className="mt-1 text-xs text-muted">Licence: {d.license} · Source: {d.source}</div>
            </div>
          ))}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Import a database or update" />
            <CardBody className="space-y-3 text-sm">
              <p className="text-muted">Upload either one complete <code>.json</code> package, or <code>meta.json</code> + <code>competitions.json</code> with CSV files (<code>nations.csv</code>, <code>stadiums.csv</code>, <code>clubs.csv</code>, <code>players.csv</code>, <code>staff.csv</code>, <code>sponsors.csv</code>). The format is documented in <code>docs/DATA_IMPORT.md</code>.</p>
              <div>
                <label className="label">Apply CSV files as an update to</label>
                <select className="field" value={baseId} onChange={(e) => setBaseId(e.target.value)}>
                  <option value="">Nothing (new database)</option>
                  {list.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line p-6 text-muted hover:border-accent/50 hover:text-fg">
                <Upload size={16} /> {busy ? "Validating…" : "Choose files"}
                <input type="file" multiple accept=".json,.csv" className="hidden" onChange={(e) => onFiles(e.target.files)} data-testid="import-input" />
              </label>
              <p className="text-xs text-muted">All files are validated (schema, duplicates, references) before anything is stored. If there is any error the import is rolled back.</p>
            </CardBody>
          </Card>
          {report ? (
            <Card data-testid="import-report">
              <CardHeader title="Import report" action={report.ok ? <Badge tone="accent">Installed</Badge> : <Badge tone="danger">Rejected</Badge>} />
              <CardBody className="space-y-2 text-sm">
                {report.ok ? <div className="flex items-center gap-2 text-accent"><CheckCircle2 size={14} /> {report.datasetName}</div> : null}
                {Object.entries(report.counts).map(([k, v]) => <KV key={k} k={k} v={v} />)}
                <div className="max-h-64 space-y-1 overflow-auto">
                  {report.errors.map((e, i) => <div key={`e${i}`} className="flex gap-2 text-danger"><XCircle size={14} className="mt-0.5 shrink-0" /> <span>{e.entity}{e.id ? ` "${e.id}"` : ""}{e.path ? ` (${e.path})` : ""}: {e.message}</span></div>)}
                  {report.warnings.slice(0, 60).map((e, i) => <div key={`w${i}`} className="flex gap-2 text-warn"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{e.entity}{e.id ? ` "${e.id}"` : ""}: {e.message}</span></div>)}
                  {report.warnings.length > 60 ? <div className="text-xs text-muted">…and {report.warnings.length - 60} more warnings.</div> : null}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
