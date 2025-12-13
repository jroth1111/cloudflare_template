import type { BetterAuthOptions } from "better-auth";
import { bearer, jwt } from "better-auth/plugins";
import { AUTH_SESSION_CACHE_TTL_SECONDS } from "./constants";

export const betterAuthOptions = {
  appName: "Northstar",
  basePath: "/api/auth",
  emailAndPassword: { enabled: true },
  session: {
    cookieCache: { enabled: true, maxAge: AUTH_SESSION_CACHE_TTL_SECONDS }
  },
  plugins: [bearer(), jwt()]
} satisfies BetterAuthOptions;
