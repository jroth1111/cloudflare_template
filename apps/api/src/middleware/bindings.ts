import type { MiddlewareHandler } from "hono";
import { createDb } from "@cloudflare-northstar/db";
import { getValidatedVars } from "../env";

export const bindContext: MiddlewareHandler = async (c, next) => {
  getValidatedVars(c.env);
  c.set("db", createDb(c.env.DB));
  c.set("auth", null);
  c.set("user", null);
  c.set("session", null);
  await next();
};

