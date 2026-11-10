import { simulateMatch } from "../src/engine/match/engine";
import { teamInput, baseOptions } from "../tests/helpers";
import type { TeamInstructions } from "../src/engine/core/types";
const variants: [string, Partial<TeamInstructions>][] = [["default", {}], ["counter", { attackingTransition: "counter" }], ["hold", { attackingTransition: "hold_shape" }], ["tempo5", { tempo: 5 }], ["tempo1", { tempo: 1 }], ["press5", { pressing: 5 }], ["press1", { pressing: 1 }], ["line5", { defensiveLine: 5 }], ["line1", { defensiveLine: 1 }], ["ment5", { mentality: 5 }], ["ment1", { mentality: 1 }], ["cpress", { defensiveTransition: "counter_press" }], ["regroup", { defensiveTransition: "regroup" }], ["short", { buildUp: "short" }], ["direct", { buildUp: "direct" }], ["risk5", { passingRisk: 5 }], ["width5", { width: 5 }], ["width1", { width: 1 }]];
const N = Number(process.argv[2] ?? 300);
for (const [n, v] of variants) {
  let pts = 0, gf = 0, ga = 0;
  for (let i = 0; i < N; i++) {
    const home = i % 2 === 0;
    const me = teamInput(100 + i, "M", 75, v), op = teamInput(900 + i, "O", 75, {});
    const r = simulateMatch(home ? me : op, home ? op : me, { ...baseOptions, seed: i });
    const f = home ? r.goals[0] : r.goals[1], a = home ? r.goals[1] : r.goals[0];
    gf += f; ga += a; pts += f > a ? 3 : f === a ? 1 : 0;
  }
  console.log(n.padEnd(9), "ppg", (pts / N).toFixed(2), "gf", (gf / N).toFixed(2), "ga", (ga / N).toFixed(2));
}
