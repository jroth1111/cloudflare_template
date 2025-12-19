#!/usr/bin/env node
/**
 * Pre-deploy validation script.
 * Validates wrangler.jsonc configuration before deployment.
 *
 * Checks:
 * 1. D1 database_id is not a placeholder
 * 2. KV id is not a placeholder
 * 3. Production CORS_ORIGINS and AUTH_TRUSTED_ORIGINS are not empty
 *
 * Usage: node scripts/pre-deploy-check.mjs [--env production]
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Placeholder patterns to detect
const PLACEHOLDER_PATTERNS = {
  d1_database_id: /^0{8}-0{4}-0{4}-0{4}-0{12}$/,
  kv_namespace_id: /^0{32}$/,
};

// Parse JSONC (JSON with comments) - robust approach
function parseJsonc(content) {
  // Process character by character to handle strings correctly
  let result = "";
  let inString = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inSingleLineComment) {
      if (char === "\n") {
        inSingleLineComment = false;
        result += char;
      }
      i++;
      continue;
    }

    if (inMultiLineComment) {
      if (char === "*" && nextChar === "/") {
        inMultiLineComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inString) {
      result += char;
      if (char === "\\") {
        result += content[++i] || "";
      } else if (char === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    // Not in string
    if (char === '"') {
      inString = true;
      result += char;
      i++;
      continue;
    }

    if (char === "/" && nextChar === "/") {
      inSingleLineComment = true;
      i += 2;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inMultiLineComment = true;
      i += 2;
      continue;
    }

    result += char;
    i++;
  }

  // Remove trailing commas
  const noTrailingCommas = result.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(noTrailingCommas);
}

function validateConfig(configPath, env = "production") {
  const errors = [];
  const warnings = [];

  let config;
  try {
    const content = readFileSync(configPath, "utf-8");
    config = parseJsonc(content);
  } catch (err) {
    errors.push(`Failed to read/parse ${configPath}: ${err.message}`);
    return { errors, warnings };
  }

  // Get the environment-specific config or fall back to root
  const envConfig = env && config.env?.[env] ? { ...config, ...config.env[env] } : config;

  // Check D1 database IDs
  const d1Databases = envConfig.d1_databases || config.d1_databases || [];
  for (const db of d1Databases) {
    if (PLACEHOLDER_PATTERNS.d1_database_id.test(db.database_id)) {
      errors.push(
        `D1 database "${db.binding}" has placeholder ID: ${db.database_id}\n` +
          `  Run: pnpm cf:bootstrap\n` +
          `  Or manually:\n` +
          `    wrangler d1 create ${db.database_name} --env ${env} --config ${configPath} --binding ${db.binding} --update-config`
      );
    }
  }

  // Check KV namespace IDs
  const kvNamespaces = envConfig.kv_namespaces || config.kv_namespaces || [];
  for (const kv of kvNamespaces) {
    if (PLACEHOLDER_PATTERNS.kv_namespace_id.test(kv.id)) {
      errors.push(
        `KV namespace "${kv.binding}" has placeholder ID: ${kv.id}\n` +
          `  Run: pnpm cf:bootstrap\n` +
          `  Or manually:\n` +
          `    wrangler kv namespace create ${kv.binding} --env ${env} --config ${configPath} --binding ${kv.binding} --update-config`
      );
    }
  }

  // Check production environment variables (only for API worker that has auth)
  if (env === "production") {
    const vars = envConfig.vars || {};
    const rootVars = config.vars || {};

    // Only check CORS/auth vars if they exist in the root config (API worker)
    const hasCorsInRoot = "CORS_ORIGINS" in rootVars;
    const hasAuthInRoot = "AUTH_TRUSTED_ORIGINS" in rootVars;

    if (hasCorsInRoot) {
      if (!vars.CORS_ORIGINS || vars.CORS_ORIGINS === "") {
        errors.push(
          `Production CORS_ORIGINS is empty.\n` +
            `  Set CORS_ORIGINS to your production domain(s), e.g.:\n` +
            `  "CORS_ORIGINS": "https://your-domain.com"`
        );
      } else if (vars.CORS_ORIGINS.includes("TODO:")) {
        errors.push(`Production CORS_ORIGINS contains placeholder: ${vars.CORS_ORIGINS}`);
      }
    }

    if (hasAuthInRoot) {
      if (!vars.AUTH_TRUSTED_ORIGINS || vars.AUTH_TRUSTED_ORIGINS === "") {
        errors.push(
          `Production AUTH_TRUSTED_ORIGINS is empty.\n` +
            `  Set AUTH_TRUSTED_ORIGINS to your production domain(s), e.g.:\n` +
            `  "AUTH_TRUSTED_ORIGINS": "https://your-domain.com"`
        );
      } else if (vars.AUTH_TRUSTED_ORIGINS.includes("TODO:")) {
        errors.push(`Production AUTH_TRUSTED_ORIGINS contains placeholder: ${vars.AUTH_TRUSTED_ORIGINS}`);
      }

      // Warn about missing secrets (only for API worker that has auth)
      warnings.push(
        `Ensure these secrets are set in production:\n` +
          `  - BETTER_AUTH_SECRET (run: wrangler secret put BETTER_AUTH_SECRET)\n` +
          `  - BETTER_AUTH_URL (run: wrangler secret put BETTER_AUTH_URL)`
      );
    }
  }

  return { errors, warnings };
}

// Main
const args = process.argv.slice(2);
const envIndex = args.indexOf("--env");
const env = envIndex !== -1 ? args[envIndex + 1] : "production";

const apiConfigPath = join(__dirname, "..", "apps", "api", "wrangler.jsonc");
const webConfigPath = join(__dirname, "..", "apps", "web", "wrangler.jsonc");

console.log(`\nPre-deploy validation (env: ${env})\n`);

let hasErrors = false;

for (const configPath of [apiConfigPath, webConfigPath]) {
  const shortPath = configPath.split("/").slice(-3).join("/");
  console.log(`Checking ${shortPath}...`);

  const { errors, warnings } = validateConfig(configPath, env);

  if (errors.length > 0) {
    hasErrors = true;
    console.log("\n  ERRORS:");
    for (const error of errors) {
      console.log(`    ${error.replace(/\n/g, "\n    ")}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\n  WARNINGS:");
    for (const warning of warnings) {
      console.log(`    ${warning.replace(/\n/g, "\n    ")}`);
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("  OK");
  }

  console.log();
}

if (hasErrors) {
  console.log("Pre-deploy check FAILED. Fix the errors above before deploying.\n");
  process.exit(1);
} else {
  console.log("Pre-deploy check passed (review warnings if any).\n");
  process.exit(0);
}
