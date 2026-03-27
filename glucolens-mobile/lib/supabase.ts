import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

/**
 * Process an OAuth redirect URL and establish a Supabase session.
 * Handles both PKCE (?code=...) and implicit (#access_token=...) flows.
 * Called from _layout.tsx when a deep link arrives.
 */
export async function createSessionFromUrl(url: string): Promise<{ error: string | null }> {
  try {
    const queryString = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
    const queryParams = new URLSearchParams(queryString);
    const fragment    = url.includes("#") ? url.split("#")[1] : "";
    const fragParams  = new URLSearchParams(fragment);

    // Check for OAuth errors
    const oauthError = queryParams.get("error") || fragParams.get("error");
    if (oauthError) {
      const desc = queryParams.get("error_description") || fragParams.get("error_description");
      return {
        error: desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : oauthError,
      };
    }

    // PKCE flow: exchange authorization code for session
    const code = queryParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { error: error?.message ?? null };
    }

    // Implicit flow: extract tokens from URL fragment
    const accessToken  = fragParams.get("access_token");
    const refreshToken = fragParams.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return { error: error?.message ?? null };
    }

    return { error: "No auth data found in redirect URL." };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to process sign-in redirect." };
  }
}

/**
 * Open Google OAuth in the system browser.
 * The actual session creation happens in _layout.tsx when the deep link
 * redirect arrives — this function just opens the browser.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: "glucolens" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error("Could not get Google sign-in URL.");

  // Open the browser — we don't need to handle the result.
  // On Android, the OS intercepts the glucolens:// redirect as a deep link.
  // _layout.tsx's Linking listener picks it up and creates the session.
  // onAuthStateChange then navigates to /onboarding.
  await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
}
