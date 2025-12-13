import { z } from "zod";
import type { Fetcher } from "@cloudflare/workers-types";

export type Bindings = {
  API: Fetcher;
  ASSETS?: Fetcher;
  ENVIRONMENT: "development" | "production";
};

const varsSchema = z.object({
  ENVIRONMENT: z.enum(["development", "production"]).default("development")
});

export function getValidatedVars(env: Bindings) {
  return varsSchema.parse(env);
}
