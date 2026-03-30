import type { UserRole } from "@credit-union/shared";

import { getSupabaseClient } from "./supabase/client";

export type MobileRole = Extract<UserRole, "agent" | "member">;

export interface MobileProfile {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  branchId: string | null;
  isActive: boolean;
}

type ProfileRpcRow = {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  branch_id: string | null;
  is_active: boolean;
};

export function isMobileRole(role: UserRole): role is MobileRole {
  return role === "agent" || role === "member";
}

export function toMobileProfile(row: ProfileRpcRow): MobileProfile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    branchId: row.branch_id,
    isActive: row.is_active,
  };
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
