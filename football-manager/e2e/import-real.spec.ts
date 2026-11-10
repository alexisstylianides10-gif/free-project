import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

// Optional: only runs when a personal real-world dataset file is provided.
const FILE = process.env.REAL_DATASET;

test("imports a large real-world dataset and starts a career with it", async ({ page }) => {
  test.skip(!FILE || !existsSync(FILE), "Set REAL_DATASET=/path/to/real-world-2026.json to run");
  test.setTimeout(600_000);
  await page.goto("/data/");
  await page.getByTestId("import-input").setInputFiles(FILE!);
  await expect(page.getByTestId("import-report")).toContainText("Installed", { timeout: 300_000 });
  await page.goto("/new/");
  await page.getByLabel("Database").selectOption("tm-open-2026");
  await expect(page.getByTestId("coverage-banner")).toBeVisible({ timeout: 120_000 });
  await page.getByTestId("club-search").fill("Arsenal");
  await page.locator('[data-testid^="club-club_"]').first().click();
  await page.getByTestId("start-career").click();
  await expect(page.getByTestId("topbar-club")).toHaveText(/Arsenal/, { timeout: 180_000 });
});
