import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { betterAuthOptions } from "./src/features/auth/options";

const db = drizzle(async () => ({ rows: [] }));

export const auth = betterAuth({
  ...betterAuthOptions,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8787",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-dev-secret-change-me"
});
