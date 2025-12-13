import type { Context } from "hono";
import type { HonoEnv } from "../types";
import { auth as createAuth } from "../features/auth/auth";

export function getAuth(c: Context<HonoEnv>) {
  const cached = c.get("auth");
  if (cached) return cached;

  const instance = createAuth({ env: c.env, db: c.get("db") });
  c.set("auth", instance);
  return instance;
}
