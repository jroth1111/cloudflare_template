import path from "node:path";
import { defineWorkersProject, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "drizzle");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: {
            configPath: "./wrangler.jsonc",
            environment: "production"
          },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
              BETTER_AUTH_URL: "https://example.com",
              AUTH_RATE_LIMIT_ENABLED: "true"
            }
          }
        }
      }
    }
  };
});
