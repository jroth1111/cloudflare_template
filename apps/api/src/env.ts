import { z } from "zod";
import type {
  D1Database,
  DurableObjectNamespace,
  KVNamespace,
  RateLimit
} from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  AUTH_SIGNIN_RATE_LIMITER: RateLimit;
  AUTH_SIGNUP_RATE_LIMITER: RateLimit;
  AUTH_TOKEN_RATE_LIMITER: RateLimit;
  ENVIRONMENT: "development" | "production";
  CORS_ORIGINS: string;
  AUTH_TRUSTED_ORIGINS?: string;
  AUTH_RATE_LIMIT_ENABLED?: "true" | "false";
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

const varsSchema = z.object({
  ENVIRONMENT: z.enum(["development", "production"]).default("development"),
  CORS_ORIGINS: z.string().default(""),
  AUTH_TRUSTED_ORIGINS: z.string().optional().default(""),
  AUTH_RATE_LIMIT_ENABLED: z.enum(["true", "false"]).optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url()
}).superRefine((vars, ctx) => {
  if (vars.ENVIRONMENT !== "production") return;
  const corsOrigins = vars.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigins.includes("*")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORS_ORIGINS"],
      message:
        "CORS_ORIGINS cannot include '*' in production (cookie sessions use credentials). Use an explicit allowlist or call the API through apps/web."
    });
  }
  const url = new URL(vars.BETTER_AUTH_URL);
  if (url.protocol !== "https:") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["BETTER_AUTH_URL"],
      message: "BETTER_AUTH_URL must be an https:// URL in production."
    });
  }
});

const varsCache = new WeakMap<object, z.infer<typeof varsSchema>>();

export function getValidatedVars(env: Bindings) {
  const cached = varsCache.get(env as unknown as object);
  if (cached) return cached;
  const parsed = varsSchema.parse(env);
  varsCache.set(env as unknown as object, parsed);
  return parsed;
}

export function getCorsOrigins(env: Bindings): "*" | string[] {
  const { CORS_ORIGINS } = getValidatedVars(env);
  const origins = CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.includes("*")) return "*";
  return origins;
}

export function getTrustedOrigins(env: Bindings): string[] {
  const { AUTH_TRUSTED_ORIGINS, BETTER_AUTH_URL } = getValidatedVars(env);
  const baseOrigin = new URL(BETTER_AUTH_URL).origin;
  const configured = AUTH_TRUSTED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return Array.from(new Set([baseOrigin, ...configured]));
}
