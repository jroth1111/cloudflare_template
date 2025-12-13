import type { z } from "zod";
import { badRequest } from "./errors";

export async function parseJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<z.output<TSchema>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw badRequest("Request validation failed", "validation_error");
  }
  return result.data;
}
