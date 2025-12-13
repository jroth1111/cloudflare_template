import { z } from "zod";

/**
 * Common Zod helpers shared across Workers and frontends.
 */

// Comma-separated list → string[]
export const zCsv = z.string().transform((s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
);

export const zNonEmptyString = z.string().min(1);

// URL string (normalized)
export const zUrl = z
  .string()
  .url()
  .transform((s) => new URL(s).toString());

export const zOptionalCsv = zCsv.optional().transform((v) => v ?? []);

