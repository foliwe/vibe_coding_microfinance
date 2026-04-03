import type { UserRole } from "@credit-union/shared";

import {
  toMobileProfile,
  type MobileProfile,
  type ProfileRpcRow,
} from "./mobile-profile";
import { getSupabaseClient } from "./supabase/client";

export type MobileRole = Extract<UserRole, "agent" | "member">;
export type { MobileProfile };

export function isMobileRole(role: UserRole): role is MobileRole {
  return role === "agent" || role === "member";
}

export async function getCurrentMobileProfile() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_my_profile");

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as ProfileRpcRow | undefined) : undefined;
  return row ? toMobileProfile(row) : null;
}

export async function requireCurrentMobileProfile(expectedRoles?: MobileRole[]) {
  const profile = await getCurrentMobileProfile();

  if (!profile) {
    throw new Error("No signed-in mobile profile was found.");
  }

  if (!profile.isActive) {
    throw new Error("This account is inactive.");
  }

  if (expectedRoles && !expectedRoles.includes(profile.role as MobileRole)) {
    throw new Error(`This ${profile.role} account is not supported in the mobile app.`);
  }

  return profile;
}
