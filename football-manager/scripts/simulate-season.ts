import { readFileSync } from "node:fs";
import path from "node:path";
import { datasetSchema } from "../src/data/schema";
import { createCareer } from "../src/engine/world/create";
import { advanceDay } from "../src/engine/world/calendar";
import { leagueStandings } from "../src/engine/competition/season";

const days = Number(process.argv[2] ?? 370);
const ds = datasetSchema.parse(JSON.parse(readFileSync(path.resolve(__dirname, "../public/data/dev-world.json"), "utf8")));
let t0 = Date.now();
const world = createCareer(ds, { clubId: "club_alb_05", managerFirstName: "Test", managerLastName: "Manager", saveName: "smoke", seed: 42 });
console.log(`career created in ${Date.now() - t0}ms; fixtures=${Object.keys(world.fixtures).length}`);
t0 = Date.now();
let matches = 0;
for (let i = 0; i < days; i++) {
  const r = advanceDay(world, { simulateUserMatch: true });
  matches += r.matchesPlayed;
  if (r.seasonEnded) console.log(`season ended on ${r.date}`);
  if (i % 30 === 0) console.log(`day ${i} ${r.date} t=${Date.now() - t0}ms matches=${matches}`);
  if (r.sacked) { console.log("sacked on", r.date); break; }
}
console.log(`${days} days in ${Date.now() - t0}ms, matches=${matches}, date=${world.meta.currentDate}`);
const t = leagueStandings(world, "l_alb1").slice(0, 5).map((r) => `${world.clubs[r.clubId].shortName} ${r.points}`);
console.log(t.join(" | "));
console.log("transfers:", world.transfers.length, "news:", world.news.length, "players:", Object.keys(world.players).length, "user balance:", world.clubs["club_alb_05"].finance.balance);
const json = JSON.stringify(world);
console.log("world JSON size MB:", (json.length / 1e6).toFixed(1));
