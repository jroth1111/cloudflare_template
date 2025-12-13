import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

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

function runCapture(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code ?? "null"}\n${stderr}`));
    });
  });
}

const output = process.argv[2] ?? "../template_repo.zip";

await rm(output, { force: true });

const excludes = [
  "*node_modules*",
  "node_modules/*",
  "*/node_modules/*",
  "*\\.wrangler*",
  ".wrangler/*",
  "*/.wrangler/*",
  ".git/*",
  "*/.git/*",
  "*playwright-report*",
  "playwright-report/*",
  "*/playwright-report/*",
  "*test-results*",
  "test-results/*",
  "*/test-results/*",
  "*templates-main*",
  "templates-main/*",
  "*/templates-main/*",
  "*.zip",
  "*/*.zip",
  "*/*/*.zip",
  ".dev.vars",
  "*/.dev.vars",
  ".dev.vars.*",
  "*/.dev.vars.*",
  ".env",
  "*/.env",
  ".env.*",
  "*/.env.*",
  ".DS_Store",
  "*/.DS_Store",
  "Thumbs.db",
  "*/Thumbs.db",
  "*pnpm-debug.log*",
  "*npm-debug.log*",
  "*yarn-debug.log*",
  "*yarn-error.log*",
  "*bun-debug.log*"
];

console.log(`\n== Packaging template ==\nOutput: ${output}\n`);
await run("zip", ["-r", output, ".", "-x", ...excludes]);

try {
  const { stdout } = await runCapture("unzip", ["-Z", "-1", output]);
  const entries = stdout.split("\n").filter(Boolean);
  const forbidden = [
    "node_modules/",
    ".wrangler/",
    "playwright-report/",
    "test-results/",
    "templates-main/",
    ".dev.vars",
    ".env",
    ".git/"
  ];
  const bad = entries.filter((entry) => forbidden.some((f) => entry.includes(f)));
  if (bad.length) {
    throw new Error(
      `Packaged zip contains forbidden paths:\n${bad.slice(0, 25).map((p) => `- ${p}`).join("\n")}`
    );
  }
} catch (err) {
  console.error(`\nZip sanity check failed: ${err instanceof Error ? err.message : String(err)}\n`);
  throw err;
}
console.log(`\nWrote ${output}\n`);
