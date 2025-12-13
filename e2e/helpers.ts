import type { Page } from "@playwright/test";

export async function gotoAndWaitForHydration(page: Page, url: string) {
  await page.goto(url);
  await page.waitForSelector("body.hydrated", { timeout: 5000 });
}

