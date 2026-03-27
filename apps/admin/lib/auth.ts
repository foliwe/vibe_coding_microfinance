import type { UserRole } from "@credit-union/shared";
import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";

export interface AdminProfile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  branch_id: string | null;
}

function dashboardPathForRole(role: UserRole) {
  if (role === "branch_manager") return "/branch";
  if (role === "admin") return "/";
  return "/login";
}

export async function getCurrentProfileOrNull() {
  const supabase = await createClient();
  const claimsResult = await supabase.auth.getClaims();
  const userId = claimsResult.data?.claims?.sub;

  if (typeof userId !== "string") {
    return { supabase, profile: null as AdminProfile | null };
  }

  const { data: profileRows } = await supabase.rpc("get_my_profile");
  const profile = Array.isArray(profileRows) ? profileRows[0] : null;

  return {
    supabase,
    profile: (profile as AdminProfile | null) ?? null,
  };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const { supabase, profile } = await getCurrentProfileOrNull();

  if (!profile) {
    redirect("/login?reason=profile-missing");
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect("/login?reason=unauthorized");
  }

  return { supabase, profile };
}

export async function redirectIfSignedIn() {
  const { profile } = await getCurrentProfileOrNull();

  if (profile && (profile.role === "admin" || profile.role === "branch_manager")) {
    redirect(dashboardPathForRole(profile.role));
  }
}
