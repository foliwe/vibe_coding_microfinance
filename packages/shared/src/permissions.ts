import type { UserRole } from "./domain";

const webRoles: UserRole[] = ["admin", "branch_manager"];
const mobileRoles: UserRole[] = ["agent", "member"];

export function canAccessAdmin(role: UserRole): boolean {
  return webRoles.includes(role);
}

export function canAccessMobile(role: UserRole): boolean {
  return mobileRoles.includes(role);
}

export function canApproveTransactions(role: UserRole): boolean {
  return role === "admin" || role === "branch_manager";
}

export function canCreateBranches(role: UserRole): boolean {
  return role === "admin";
}

export function canCreateMembers(role: UserRole): boolean {
  return role === "admin" || role === "branch_manager";
}

export function canDraftMembers(role: UserRole): boolean {
  return role === "agent";
}
