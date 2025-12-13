import { test, expect } from "./test";
import { gotoAndWaitForHydration } from "./helpers";

test("Better Auth cookie session works via /api/* proxy", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "password1234";
  const name = "E2E User";
  const todoTitle = `todo-${Date.now()}`;

  await gotoAndWaitForHydration(page, "/demo");

  const signUp = page.getByRole("group", { name: "Sign Up" });
  await signUp.getByLabel("Name").fill(name);
  await signUp.getByLabel("Email").fill(email);
  await signUp.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/sign-up/email") && r.status() < 500),
    signUp.getByRole("button", { name: "Sign Up" }).click(),
  ]);

  const signIn = page.getByRole("group", { name: "Sign In" });
  await signIn.getByLabel("Email").fill(email);
  await signIn.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/sign-in/email") && r.status() < 500),
    signIn.getByRole("button", { name: "Sign In" }).click(),
  ]);

  await page.getByRole("button", { name: "Get Session" }).click();
  await expect(page.getByTestId("me-email")).toHaveText(email);

  await page.reload();
  await page.waitForSelector("body.hydrated");
  await page.getByRole("button", { name: "Get Session" }).click();
  await expect(page.getByTestId("me-email")).toHaveText(email);

  const todos = page.getByRole("group", { name: "Todos" });
  await todos.getByLabel("Title").fill(todoTitle);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/todos") && r.request().method() === "POST"),
    todos.getByRole("button", { name: "Create Todo" }).click(),
  ]);
  await expect(page.getByTestId("todos-list")).toContainText(todoTitle);

  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/sign-out") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Sign Out" }).click(),
  ]);
  await page.getByRole("button", { name: "Get Session" }).click();
  await expect(page.getByTestId("me-error")).toContainText("unauthorized");
});
