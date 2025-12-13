import { beforeEach } from "vitest";
import { applyD1Migrations, env } from "cloudflare:test";

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
