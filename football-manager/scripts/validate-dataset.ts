/** Validate a dataset package (JSON or CSV bundle) from the command line: npm run data:validate -- <files...> */
import { readFileSync } from "node:fs";
import path from "node:path";
import { importFiles } from "../src/data/importer";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: npm run data:validate -- dataset.json  |  meta.json competitions.json clubs.csv players.csv ...");
  process.exit(2);
}
const { report } = importFiles(files.map((f) => ({ name: path.basename(f), text: readFileSync(f, "utf8") })));
console.log(JSON.stringify({ ok: report.ok, counts: report.counts, coverage: report.coverage }, null, 2));
for (const e of report.errors.slice(0, 50)) console.log(`ERROR   ${e.entity}${e.id ? ` ${e.id}` : ""}${e.path ? ` (${e.path})` : ""}: ${e.message}`);
for (const w of report.warnings.slice(0, 50)) console.log(`WARNING ${w.entity}${w.id ? ` ${w.id}` : ""}: ${w.message}`);
process.exit(report.ok ? 0 : 1);
