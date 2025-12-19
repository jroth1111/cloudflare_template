import type { MiddlewareHandler } from "hono";
import { attachD1BookmarkHeader, createDb, createD1SessionFromRequest } from "@cloudflare-northstar/db";
import { getValidatedVars } from "../env";

export const bindContext: MiddlewareHandler = async (c, next) => {
  const vars = getValidatedVars(c.env);

  let d1Session: ReturnType<typeof createD1SessionFromRequest>["session"] | null = null;
  let d1BookmarkHeaderName: string | null = null;

  if (vars.D1_SESSIONS_ENABLED === "true") {
    try {
      const { session, headerName } = createD1SessionFromRequest(c.env.DB, c.req.raw);
      d1Session = session;
      d1BookmarkHeaderName = headerName;
      c.set("db", createDb(session));
    } catch {
      c.set("db", createDb(c.env.DB));
    }
  } else {
    c.set("db", createDb(c.env.DB));
  }

  c.set("auth", null);
  c.set("user", null);
  c.set("session", null);
  await next();

  if (d1Session && d1BookmarkHeaderName) {
    c.res = attachD1BookmarkHeader(c.res, d1Session, d1BookmarkHeaderName);
  }
};
