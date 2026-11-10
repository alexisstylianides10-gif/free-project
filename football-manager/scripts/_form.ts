import { simulateMatch } from "../src/engine/match/engine";
import { teamInput, baseOptions } from "../tests/helpers";
import { FORMATION_PRESETS } from "../src/engine/tactics/formations";
const N = 300;
for (const f of Object.keys(FORMATION_PRESETS)) {
  let pts = 0, gf = 0, ga = 0;
  for (let i = 0; i < N; i++) {
    const home = i % 2 === 0;
    const me = teamInput(100 + i, "M", 75, {}, f), op = teamInput(900 + i, "O", 75, {}, "4-3-3");
    const r = simulateMatch(home ? me : op, home ? op : me, { ...baseOptions, seed: i });
    const a = home ? r.goals[0] : r.goals[1], b = home ? r.goals[1] : r.goals[0];
    gf += a; ga += b; pts += a > b ? 3 : a === b ? 1 : 0;
  }
  console.log(f.padEnd(8), "ppg", (pts / N).toFixed(2), "gf", (gf / N).toFixed(2), "ga", (ga / N).toFixed(2));
}
