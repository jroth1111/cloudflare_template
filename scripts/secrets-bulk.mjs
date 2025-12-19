import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const envPath = join(repoRoot, ".dev.vars");

function parseDotenv(contents) {
  const result = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const fileEnv = existsSync(envPath) ? parseDotenv(readFileSync(envPath, "utf8")) : {};
const env = { ...fileEnv, ...process.env };

const required = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];
const missing = required.filter((key) => !env[key]);
if (missing.length > 0) {
  console.error(`Missing required secrets: ${missing.join(", ")}`);
  console.error("Set them in .dev.vars or pass via process environment.");
  process.exit(1);
}

const args = process.argv.slice(2);
const envIndex = args.indexOf("--env");
const envName = envIndex !== -1 && args[envIndex + 1] ? args[envIndex + 1] : "production";

const payload = JSON.stringify({
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: env.BETTER_AUTH_URL
});

const wranglerArgs = [
  "secret",
  "bulk",
  "--config",
  "apps/api/wrangler.jsonc",
  "--env",
  envName
];

const child = spawn("wrangler", wranglerArgs, {
  cwd: repoRoot,
  stdio: ["pipe", "inherit", "inherit"]
});

child.stdin.write(payload);
child.stdin.end();

child.on("error", (err) => {
  console.error(`Failed to run wrangler: ${err.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
