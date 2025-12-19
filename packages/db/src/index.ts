import { drizzle } from "drizzle-orm/d1";
import type { D1Database, D1DatabaseSession } from "@cloudflare/workers-types";
import * as schema from "./schema";

export type D1DatabaseLike = D1Database | D1DatabaseSession;

export function createDb(d1: D1DatabaseLike) {
  return drizzle(d1 as D1Database, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };
export * from "./d1-sessions";
