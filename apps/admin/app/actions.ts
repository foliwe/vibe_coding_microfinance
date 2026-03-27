"use server";

import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "../lib/supabase/env";
import { createClient } from "../lib/supabase/server";

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
