import { test, expect } from "./test";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("web worker serves HTML and proxies /api/*", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Northstar Web" })).toBeVisible();
  await expect(page.getByRole("link", { name: "/api/todos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "/api/auth/jwks" })).toBeVisible();

  const res = await page.request.get("/api/todos");
  expect(res.ok()).toBeTruthy();
  expect(UUID_RE.test(res.headers()["x-request-id"] ?? "")).toBe(true);

  const json = (await res.json()) as unknown;
  expect(Array.isArray(json)).toBe(true);
});

