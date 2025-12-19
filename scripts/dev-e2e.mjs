import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";

const envPath = new URL("../.dev.vars", import.meta.url);
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";
const secret = process.env.BETTER_AUTH_SECRET ?? "test-secret-test-secret-test-secret-1234";

let createdEnvFile = false;
const MARKER = "# E2E-only dev vars (auto-generated).";

async function ensureEnvFile() {
  try {
    const existing = await readFile(envPath, "utf8");
    if (existing.startsWith(MARKER)) createdEnvFile = true;
    return;
  } catch {
    // fall through
  }

  const contents = [
    MARKER,
    "# Remove this file if you want to use your own local secrets.",
    `BETTER_AUTH_SECRET="${secret}"`,
    `BETTER_AUTH_URL="${baseURL}"`,
    "",
  ].join("\n");

  await writeFile(envPath, contents, "utf8");
  createdEnvFile = true;
}

async function cleanup() {
  if (!createdEnvFile) return;
  await rm(envPath, { force: true });
}

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(143);
});
process.on("exit", () => {
  // best-effort; "exit" can't await
  void cleanup();
});

await ensureEnvFile();

const child = spawn(
  "wrangler",
  [
    "dev",
    "-c",
    "apps/web/wrangler.jsonc",
    "-c",
    "apps/api/wrangler.jsonc",
    "--env-file",
    ".dev.vars",
    "--port",
    "8787",
    "--persist-to",
    ".wrangler/state-e2e",
  ],
  { stdio: "inherit" }
);

child.on("exit", async (code) => {
  await cleanup();
  process.exit(code ?? 1);
});
