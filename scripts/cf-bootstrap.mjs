import { spawn } from "node:child_process";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code ?? "null"}`));
    });
  });
}

const config = "apps/api/wrangler.jsonc";
const env = "production";

console.log("\n== Cloudflare bootstrap (D1 + KV) ==");
console.log(`Using config: ${config}\n`);
console.log(`Target environment: ${env}\n`);

console.log("Creating D1 database (updates config with DB binding)...");
await run("wrangler", [
  "d1",
  "create",
  "northstar-db",
  "--config",
  config,
  "--env",
  env,
  "--binding",
  "DB",
  "--update-config"
]);

console.log("\nCreating KV namespace (updates config with KV binding)...");
await run("wrangler", [
  "kv",
  "namespace",
  "create",
  "northstar-kv",
  "--config",
  config,
  "--env",
  env,
  "--binding",
  "KV",
  "--update-config"
]);

console.log("\nCreating KV preview namespace (updates config with KV preview_id)...");
await run("wrangler", [
  "kv",
  "namespace",
  "create",
  "northstar-kv-preview",
  "--preview",
  "--config",
  config,
  "--env",
  env,
  "--binding",
  "KV",
  "--update-config"
]);

console.log("\nNext steps:");
console.log("- Add secrets:");
console.log("  - wrangler secret put BETTER_AUTH_SECRET --config apps/api/wrangler.jsonc --env production");
console.log("  - wrangler secret put BETTER_AUTH_URL --config apps/api/wrangler.jsonc --env production");
console.log("- Deploy:");
console.log("  - pnpm deploy");
console.log("- Apply remote migrations:");
console.log("  - pnpm db:migrate:remote\n");
