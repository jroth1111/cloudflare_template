import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "@cloudflare-northstar/db";
import type { Bindings } from "../../env";
import { getTrustedOrigins } from "../../env";
import { betterAuthOptions } from "./options";
import { account, jwks, session, user, verification } from "@cloudflare-northstar/db/schema";
import { kvSecondaryStorage } from "./secondary-storage-kv";

export function auth({ env, db }: { env: Bindings; db: Db }) {
  return betterAuth({
    ...betterAuthOptions,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { account, jwks, session, user, verification }
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: getTrustedOrigins(env),
    secondaryStorage: kvSecondaryStorage(env.KV, { prefix: "auth:" })
  });
}
