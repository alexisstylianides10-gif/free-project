// Writes public/data/index.json describing the bundled databases (first entry is the default).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { validateDataset } from "../src/data/importer";
import { infoFrom } from "../src/data/datasets";

const dir = path.resolve(__dirname, "../public/data");
// Only openly redistributable datasets are bundled; personal-use datasets are imported in-app.
const files = ["dev-world.json"];
const index = files.map((f) => {
  const { report, dataset } = validateDataset(JSON.parse(readFileSync(path.join(dir, f), "utf8")));
  if (!dataset) throw new Error(`${f} is invalid: ${report.errors[0]?.message}`);
  return { url: `/data/${f}`, info: infoFrom(dataset, true, report, null) };
});
writeFileSync(path.join(dir, "index.json"), JSON.stringify(index, null, 2));
console.log(index.map((i) => `${i.info.name}: ${i.info.counts.clubs} clubs, ${i.info.counts.players} players`).join("\n"));
