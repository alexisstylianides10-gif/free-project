import { simulateMatch } from "../src/engine/match/engine";
import { teamInput, baseOptions } from "../tests/helpers";
import type { TeamInstructions } from "../src/engine/core/types";
const A: Partial<TeamInstructions> = { mentality: 4, pressing: 4, defensiveLine: 4, buildUp: "short", width: 4, defensiveTransition: "counter_press" };
const B: Partial<TeamInstructions> = { mentality: 3, pressing: 4, defensiveLine: 3, buildUp: "balanced", tempo: 4, attackingTransition: "counter" };
const variants: [string, Partial<TeamInstructions>][] = [["title(all)", A], ["line3", { ...A, defensiveLine: 3 }], ["ment3", { ...A, mentality: 3 }], ["buildBal", { ...A, buildUp: "balanced" }], ["noCP", { ...A, defensiveTransition: "balanced" }], ["default", {}]];
for (const [n, v] of variants) {
  let pts = 0, gf = 0, ga = 0; const N = 300;
  for (let i = 0; i < N; i++) {
    const home = i % 2 === 0;
    const me = teamInput(100 + i, "M", 75, v), op = teamInput(900 + i, "O", 75, B);
    const r = simulateMatch(home ? me : op, home ? op : me, { ...baseOptions, seed: i });
    const f = home ? r.goals[0] : r.goals[1], a = home ? r.goals[1] : r.goals[0];
    gf += f; ga += a; pts += f > a ? 3 : f === a ? 1 : 0;
  }
  console.log(n.padEnd(10), "ppg", (pts / N).toFixed(2), "gf", (gf / N).toFixed(2), "ga", (ga / N).toFixed(2));
}
