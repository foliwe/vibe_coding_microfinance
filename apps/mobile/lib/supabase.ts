import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

export interface MobileProfile {
  id: string;
  role: "member" | "agent" | "branch_manager" | "admin";
  full_name: string;
  email: string | null;
  branch_id: string | null;
  must_change_password: boolean;
  requires_pin_setup: boolean;
  is_active: boolean;
}

let client: SupabaseClient | null = null;

export function hasSupabaseEnv() {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (!client) {
    client = createSupabaseClient(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}
