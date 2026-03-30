import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

let mobileClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (mobileClient) {
    return mobileClient;
  }

  const { url, publishableKey } = getSupabaseEnv();

  mobileClient = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });

  return mobileClient;
}
