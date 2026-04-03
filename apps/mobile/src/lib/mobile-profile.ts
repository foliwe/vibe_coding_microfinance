import type { UserRole } from "@credit-union/shared";

export interface MobileProfile {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  branchId: string | null;
  mustChangePassword: boolean;
  requiresPinSetup: boolean;
  isActive: boolean;
}

export type ProfileRpcRow = {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  branch_id: string | null;
  must_change_password: boolean;
  requires_pin_setup: boolean;
  is_active: boolean;
};

export function toMobileProfile(row: ProfileRpcRow): MobileProfile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    branchId: row.branch_id,
    mustChangePassword: row.must_change_password,
    requiresPinSetup: row.requires_pin_setup,
    isActive: row.is_active,
  };
}
