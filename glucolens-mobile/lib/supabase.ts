import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const isServerSideWeb = typeof window === "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            isServerSideWeb ? undefined : AsyncStorage,
    autoRefreshToken:   !isServerSideWeb,
    persistSession:     !isServerSideWeb,
    detectSessionInUrl: false,
  },
});
