import { env } from "cloudflare:test";
import { expect, it } from "vitest";

it("applies all migrations and creates expected tables", async () => {
  // Query SQLite master table to get all tables
  const result = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name"
  ).all<{ name: string }>();

  const tables = result.results.map((r) => r.name);

  // Check for core Better Auth tables
  expect(tables).toContain("user");
  expect(tables).toContain("session");
  expect(tables).toContain("account");
  expect(tables).toContain("verification");
  expect(tables).toContain("jwks");

  // Check for application tables
  expect(tables).toContain("todos");
});

it("user table has expected columns", async () => {
  const result = await env.DB.prepare("PRAGMA table_info(user)").all<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>();

  const columns = result.results.map((r) => r.name);

  expect(columns).toContain("id");
  expect(columns).toContain("name");
  expect(columns).toContain("email");
  expect(columns).toContain("email_verified");
  expect(columns).toContain("created_at");
  expect(columns).toContain("updated_at");
});

it("todos table has userId foreign key", async () => {
  const result = await env.DB.prepare("PRAGMA table_info(todos)").all<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>();

  const columns = result.results.map((r) => r.name);

  expect(columns).toContain("id");
  expect(columns).toContain("title");
  expect(columns).toContain("completed");
  expect(columns).toContain("created_at");
  expect(columns).toContain("user_id"); // Multi-tenancy column

  // Verify user_id is NOT NULL
  const userIdCol = result.results.find((r) => r.name === "user_id");
  expect(userIdCol?.notnull).toBe(1);
});

it("todos table has expected indexes", async () => {
  const result = await env.DB.prepare("PRAGMA index_list(todos)").all<{
    name: string;
    unique: number;
  }>();

  const indexNames = result.results.map((r) => r.name);

  expect(indexNames).toContain("todos_user_id_idx");
  expect(indexNames).toContain("todos_created_at_idx");
});
