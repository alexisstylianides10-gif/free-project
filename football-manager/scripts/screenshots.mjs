import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const base = "http://localhost:3211";
await p.goto(base + "/");
await p.screenshot({ path: "/tmp/claude-0/shots/menu.png" });
await p.getByTestId("menu-new").click();
await p.locator('[data-testid^="club-club_"]').first().click();
await p.screenshot({ path: "/tmp/claude-0/shots/new.png" });
await p.getByTestId("start-career").click();
await p.getByTestId("topbar-club").waitFor();
await p.getByTestId("advance-match").click();
await p.waitForURL(/match/);
await p.getByTestId("instant-result").click();
await p.getByTestId("match-stats").waitFor();
await p.screenshot({ path: "/tmp/claude-0/shots/match.png", fullPage: false });
for (const n of ["dashboard", "tactics", "squad", "transfers", "finances", "kits", "stadium", "competitions", "club"]) {
  await p.getByTestId(`nav-${n}`).click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `/tmp/claude-0/shots/${n}.png` });
}
await b.close();
