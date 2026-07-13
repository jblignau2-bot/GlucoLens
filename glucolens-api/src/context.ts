import { inferAsyncReturnType } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { supabase } from "./supabase";

export async function createContext({ req }: CreateExpressContextOptions) {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    } catch (err) {
      // Auth lookup failed (network, malformed token, etc.) — treat as unauthenticated
      console.error("[auth] getUser failed:", err instanceof Error ? err.message : err);
      userId = null;
    }
  }

  return { userId };
}

export type Context = inferAsyncReturnType<typeof createContext>;
