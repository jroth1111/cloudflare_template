import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8787";
const useRemote = Boolean(process.env.E2E_BASE_URL);
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI ? [["list"]] : [["list"], ["html", { open: "never" }]],

  ...(useRemote
    ? {}
    : {
        webServer: {
          command: "pnpm dev:e2e",
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 120 * 1000,
        },
      }),

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
