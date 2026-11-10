import { expect, test, type Page } from "@playwright/test";

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  return errors;
}

test.setTimeout(600_000);

test("full career flow: create, squad, tactics, match, table, transfer, save, restart, load", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/");
  await expect(page.getByText("Touchline")).toBeVisible();
  await page.getByTestId("menu-new").click();
  await expect(page.getByTestId("fictional-banner")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("club-search").fill("Ashbury");
  const club = page.locator('[data-testid^="club-club_"]').first();
  await club.click();
  const clubName = (await page.getByTestId("selected-club-name").textContent())!.trim();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("topbar-club")).toHaveText(clubName, { timeout: 60_000 });

  // squad
  await page.getByTestId("nav-squad").click();
  await expect(page.getByTestId("squad-row").first()).toBeVisible();
  expect(await page.getByTestId("squad-row").count()).toBeGreaterThanOrEqual(18);

  // tactics: change team instructions and drag a player marker
  await page.getByTestId("nav-tactics").click();
  await expect(page.getByTestId("tactics-pitch")).toBeVisible();
  await page.getByTestId("auto-pick").click();
  await expect(page.getByTestId("validation")).toContainText("Team is valid");
  const st = page.locator('[data-testid="slot-ST"]');
  const box = (await st.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  await page.getByTestId("tab-team").click();
  await page.getByTestId("ti-buildup").selectOption("direct");
  await expect(page.getByTestId("ti-buildup")).toHaveValue("direct");

  // advance to the first match and play it instantly
  await page.getByTestId("advance-match").click();
  await expect(page).toHaveURL(/\/game\/match\/\?fixture=/, { timeout: 120_000 });
  await page.getByTestId("instant-result").click();
  await expect(page.getByTestId("match-stats")).toBeVisible();
  await expect(page.getByTestId("scoreboard")).toHaveText(/\d+ – \d+/);

  // process the rest of the match day, then check the league table
  await page.getByTestId("advance-day").click();
  await expect(page.getByTestId("busy-bar")).toBeHidden({ timeout: 60_000 });
  await page.getByTestId("nav-competitions").click();
  await expect(page.getByTestId("league-table")).toBeVisible();
  const played = await page.getByTestId("league-table").locator("tbody tr").first().locator("td").nth(2).textContent();
  expect(Number(played)).toBeGreaterThanOrEqual(1);

  // make a transfer bid for a player at another club (window is open in August)
  await page.getByTestId("nav-transfers").click();
  await page.getByTestId("search-position").selectOption("ST");
  await page.locator('[data-testid^="bid-"]').first().click();
  await expect(page.getByTestId("negotiation-dialog")).toBeVisible();
  await page.getByTestId("submit-bid").click();
  await expect(page.getByTestId("negotiation-log")).toContainText(/accept|reject|would accept|insulting|cannot|budget/i);
  await page.keyboard.press("Escape");

  // save, restart the application, load the career
  const gameDate = (await page.getByTestId("game-date").textContent())!.trim();
  await page.getByTestId("save-button").click();
  await expect(page.getByText("Career saved.")).toBeVisible();
  await page.goto("/");
  await page.reload();
  await page.getByTestId("menu-continue").click();
  await expect(page.getByTestId("game-date")).toHaveText(gameDate, { timeout: 60_000 });
  await expect(page.getByTestId("topbar-club")).toHaveText(clubName);

  const serious = errors.filter((e) => !/favicon|DevTools/i.test(e));
  expect(serious).toEqual([]);
});

test("live match with substitution and tactical change", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/");
  await page.getByTestId("menu-new").click();
  await page.locator('[data-testid^="club-club_"]').first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("topbar-club")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("advance-match").click();
  await expect(page).toHaveURL(/\/game\/match\//, { timeout: 120_000 });
  await page.getByTestId("play-live").click();
  await expect(page.getByTestId("match-pitch")).toBeVisible();
  await page.getByTestId("live-pause").click();
  await page.getByTestId("sub-off").selectOption({ index: 5 });
  await page.getByTestId("sub-on").selectOption({ index: 2 });
  await page.getByTestId("make-sub").click();
  await expect(page.getByTestId("commentary")).toContainText(/Substitution/);
  await page.getByTestId("live-pause").click();
  await page.getByTestId("sim-to-end").click();
  await expect(page.getByTestId("match-stats")).toBeVisible();
  await expect(page.getByText("Full time", { exact: false }).first()).toBeVisible();
  expect(errors.filter((e) => !/favicon/i.test(e))).toEqual([]);
});
