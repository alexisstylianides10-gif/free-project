import { datasetSchema, type Dataset } from "./schema";
import { importFiles, validateDataset, type ImportReport } from "./importer";
import { dec, enc, getStore, type BlobStore } from "@/db/storage";

export interface DatasetInfo {
  id: string;
  name: string;
  version: string;
  season: string;
  isReal: boolean;
  builtIn: boolean;
  license: string;
  source: string;
  coverageNote: string;
  counts: Record<string, number>;
  coverage: ImportReport["coverage"] | null;
  importedAt: string | null;
}

export const BUILT_IN_DATASET_URL = "/data/dev-world.json";

function infoFrom(d: Dataset, builtIn: boolean, report: ImportReport | null, importedAt: string | null): DatasetInfo {
  return {
    id: d.meta.id, name: d.meta.name, version: d.meta.version, season: d.meta.season, isReal: d.meta.isReal, builtIn, license: d.meta.license, source: d.meta.source,
    coverageNote: d.meta.coverageNote, counts: report?.counts ?? { clubs: d.clubs.length, players: d.players.length }, coverage: report?.coverage ?? null, importedAt,
  };
}

export class DatasetLibrary {
  private builtInCache: Dataset | null = null;
  constructor(private readonly store: BlobStore = getStore(), private readonly fetcher: (url: string) => Promise<string> = defaultFetch) {}

  async builtIn(): Promise<Dataset> {
    if (!this.builtInCache) {
      const text = await this.fetcher(BUILT_IN_DATASET_URL);
      this.builtInCache = datasetSchema.parse(JSON.parse(text));
    }
    return this.builtInCache;
  }

  async list(): Promise<DatasetInfo[]> {
    const out: DatasetInfo[] = [];
    try {
      const d = await this.builtIn();
      const { report } = validateDataset(d);
      out.push(infoFrom(d, true, report, null));
    } catch (e) {
      console.error("Built-in dataset unavailable", e);
    }
    for (const n of await this.store.list("meta")) {
      if (!n.startsWith("dataset_")) continue;
      const raw = await this.store.read("meta", n);
      if (raw) out.push(JSON.parse(dec(raw)) as DatasetInfo);
    }
    return out;
  }

  async load(id: string): Promise<Dataset> {
    const built = await this.builtIn().catch(() => null);
    if (built && built.meta.id === id) return built;
    const raw = await this.store.read("datasets", `${id}.json`);
    if (!raw) throw new Error(`Dataset ${id} is not installed.`);
    return datasetSchema.parse(JSON.parse(dec(raw)));
  }

  /**
   * Validate uploaded files and, only if there are no errors, install the
   * dataset. Nothing is written when validation fails (implicit rollback).
   */
  async import(files: { name: string; text: string }[], baseId?: string): Promise<ImportReport> {
    const base = baseId ? await this.load(baseId) : undefined;
    const { report, dataset } = importFiles(files, base);
    if (!report.ok || !dataset) return report;
    const built = await this.builtIn().catch(() => null);
    if (built && built.meta.id === dataset.meta.id) {
      return { ...report, ok: false, errors: [{ level: "error", entity: "meta", message: `Dataset id "${dataset.meta.id}" is reserved by the built-in dataset. Choose another id.` }] };
    }
    const info = infoFrom(dataset, false, report, new Date().toISOString());
    try {
      await this.store.write("datasets", `${dataset.meta.id}.json`, enc(JSON.stringify(dataset)));
      await this.store.write("meta", `dataset_${dataset.meta.id}.json`, enc(JSON.stringify(info)));
    } catch (e) {
      // roll back a half-installed dataset
      await this.store.remove("datasets", `${dataset.meta.id}.json`).catch(() => undefined);
      await this.store.remove("meta", `dataset_${dataset.meta.id}.json`).catch(() => undefined);
      return { ...report, ok: false, errors: [{ level: "error", entity: "storage", message: `Could not store the dataset: ${(e as Error).message}` }] };
    }
    return report;
  }

  async remove(id: string): Promise<void> {
    await this.store.remove("datasets", `${id}.json`);
    await this.store.remove("meta", `dataset_${id}.json`);
  }
}

async function defaultFetch(url: string): Promise<string> {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}${url}`);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.text();
}
