import { simulateMatch } from "../src/engine/match/engine";
import { teamInput, baseOptions } from "../tests/helpers";

const N = Number(process.argv[2] ?? 300);
const ovrA = Number(process.argv[3] ?? 70);
const ovrB = Number(process.argv[4] ?? 70);
let hg = 0, ag = 0, hw = 0, dr = 0, aw = 0, shots = 0, sot = 0, xg = 0, poss = 0, passes = 0, pc = 0, fouls = 0, yel = 0, red = 0, corners = 0, off = 0, tack = 0, inter = 0, inj = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const h = teamInput(1000 + i, "H", ovrA);
  const a = teamInput(5000 + i, "A", ovrB);
  const r = simulateMatch(h, a, { ...baseOptions, seed: i });
  hg += r.goals[0]; ag += r.goals[1];
  if (r.goals[0] > r.goals[1]) hw++; else if (r.goals[0] === r.goals[1]) dr++; else aw++;
  for (const s of r.stats) { shots += s.shots; sot += s.shotsOnTarget; xg += s.xg; passes += s.passes; pc += s.passesCompleted; fouls += s.fouls; yel += s.yellow; red += s.red; corners += s.corners; off += s.offsides; tack += s.tackles; inter += s.interceptions; }
  poss += r.stats[0].possession;
  inj += r.injuries.length;
}
const per = (v: number) => (v / N / 2).toFixed(2);
console.log(`N=${N} ${((Date.now() - t0) / N).toFixed(2)}ms/match`);
console.log(`goals home ${(hg / N).toFixed(2)} away ${(ag / N).toFixed(2)} | W/D/L ${(hw / N * 100).toFixed(0)}/${(dr / N * 100).toFixed(0)}/${(aw / N * 100).toFixed(0)}`);
console.log(`per team: shots ${per(shots)} SoT ${per(sot)} xG ${per(xg)} passes ${per(passes)} pass% ${(pc / passes * 100).toFixed(1)} fouls ${per(fouls)} yellow ${per(yel)} red ${per(red)} corners ${per(corners)} offsides ${per(off)} tackles ${per(tack)} int ${per(inter)} | home poss ${(poss / N).toFixed(1)} inj/match ${(inj / N).toFixed(2)}`);
