import { z } from "zod";

/** Canonical diabetes type enum — keep in sync with profiles.diabetes_type. */
export const diabetesTypeSchema = z.enum(["type1", "type2", "prediabetes", "unsure", "none"]);

/**
 * Free-text field that gets interpolated into AI prompts:
 * capped length, newlines stripped so it cannot inject extra prompt lines.
 */
export function promptText(maxLen: number) {
  return z
    .string()
    .max(maxLen)
    .transform((s) => s.replace(/[\r\n]+/g, " ").trim());
}

/** Country name safe for prompt interpolation. */
export const countrySchema = promptText(60);
