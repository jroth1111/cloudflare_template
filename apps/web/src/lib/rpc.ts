import { hc } from "hono/client";
import type { AppType } from "@cloudflare-northstar/api";
import type { Fetcher } from "@cloudflare/workers-types";

export function createApiClient(api: Fetcher) {
  return hc<AppType>("https://api", { fetch: api.fetch.bind(api) });
}

