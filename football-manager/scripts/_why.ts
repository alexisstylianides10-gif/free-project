import { simulateMatch } from "../src/engine/match/engine";
import { teamInput, baseOptions } from "../tests/helpers";
import type { TeamInstructions } from "../src/engine/core/types";
for (const [n, v] of [["default", {}], ["line5", { defensiveLine: 5 }], ["short", { buildUp: "short" }]] as [string, Partial<TeamInstructions>][]) {
  const c: Record<string, number> = {}; let opShots = 0, opXg = 0, myPress = 0, opOff = 0, myPass = 0, myPassC = 0, myShots = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    const r = simulateMatch(teamInput(100 + i, "M", 75, v), teamInput(900 + i, "O", 75, {}), { ...baseOptions, seed: i, detailed: true, homeAdvantage: false });
    opShots += r.stats[1].shots; opXg += r.stats[1].xg; myPress += r.stats[0].pressWins; opOff += r.stats[1].offsides; myPass += r.stats[0].passes; myPassC += r.stats[0].passesCompleted; myShots += r.stats[0].shots;
    let prev = "";
    for (const e of r.events) { if (e.type === "goal" && e.side === 1) c[prev] = (c[prev] ?? 0) + 1; if (e.type !== "goal") prev = e.type + (e.text.includes("threads") ? "-through" : "") + (e.side === 0 ? "(me)" : "(op)"); }
  }
  console.log(n, "opShots", (opShots / N).toFixed(1), "opXg", (opXg / N).toFixed(2), "myShots", (myShots / N).toFixed(1), "pass%", (myPassC / myPass * 100).toFixed(1), "press", (myPress / N).toFixed(1), "opOff", (opOff / N).toFixed(1));
  console.log("  goals against after:", Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${(v / N).toFixed(2)}`).join(", "));
}
