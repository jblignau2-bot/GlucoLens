import { TRPCError } from "@trpc/server";

/**
 * Log the raw error server-side and throw a generic, user-safe TRPCError.
 * Use for Supabase/database failures so raw driver messages never reach clients.
 */
export function internalError(
  context: string,
  raw: unknown,
  message = "Something went wrong. Please try again."
): never {
  console.error(`[${context}]`, raw instanceof Error ? raw.message : raw);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

/** Throw a user-safe BAD_REQUEST error. */
export function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/** Throw a user-safe NOT_FOUND error. */
export function notFound(message: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}

/** Log the raw AI/parse error and throw a generic BAD_GATEWAY error. */
export function aiFailure(
  context: string,
  raw?: unknown,
  message = "AI analysis failed, please retry"
): never {
  if (raw !== undefined) {
    console.error(`[${context}]`, raw instanceof Error ? raw.message : raw);
  }
  throw new TRPCError({ code: "BAD_GATEWAY", message });
}
