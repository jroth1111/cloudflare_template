import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    const consoleErrors: string[] = [];

    page.on("pageerror", (err) => {
      consoleErrors.push(String(err));
    });

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();

      // Browsers log 401s as console errors for failed resource loads. Allow these when tests
      // intentionally validate unauthenticated behavior.
      if (text.startsWith("Failed to load resource: the server responded with a status of 401")) {
        return;
      }

      consoleErrors.push(text);
    });

    await use(page);

    expect(consoleErrors, "page should not log console errors").toEqual([]);
  },
});

export { expect };
