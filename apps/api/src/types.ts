import type { Bindings } from "./env";
import type { Db } from "@cloudflare-northstar/db";
import type { auth as createAuth } from "./features/auth/auth";
import type { PublicSession, PublicUser } from "./middleware/auth";

export type AppVariables = {
  requestId: string;
  db: Db;

  // Lazy per-request Better Auth instance (set by middleware/routes).
  auth: ReturnType<typeof createAuth> | null;

  // Set by auth middleware.
  user: PublicUser | null;
  session: PublicSession | null;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: AppVariables;
};
