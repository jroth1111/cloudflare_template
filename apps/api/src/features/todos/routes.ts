import { Hono } from "hono";
import type { HonoEnv } from "../../types";
import { CreateTodoInputSchema } from "@cloudflare-northstar/shared";
import { parseJson } from "../../lib/validation";
import * as service from "./service";

export const todosRoutes = new Hono<HonoEnv>()
  .get("/", async (c) => {
    return c.json(await service.list(c.get("db")));
  })
  .post("/", async (c) => {
    const input = await parseJson(c.req.raw, CreateTodoInputSchema);
    return c.json(await service.create(c.get("db"), input), 201);
  });
