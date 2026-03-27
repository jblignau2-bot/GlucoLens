import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { supabase } from "./supabase";
import type { AppRouter } from "../../glucolens-api/src/router"; // standalone backend

/**
 * tRPC client for GlucoLens mobile.
 *
 * The backend URL is read from EXPO_PUBLIC_API_URL in your .env file.
 * In development: http://localhost:3000
 * In production:  https://your-backend.fly.dev  (or wherever you deploy)
 *
 * Every request automatically attaches the Supabase JWT from the active session.
 */

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.EXPO_PUBLIC_API_URL}/trpc`,
        async headers() {
          const { data: { session } } = await supabase.auth.getSession();
          return session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {};
        },
      }),
    ],
  });
}
