import type { UserRole } from "@credit-union/shared";

export type PasswordResetActorRole = Extract<UserRole, "admin" | "branch_manager">;
export type ResettableUserRole = Extract<UserRole, "agent" | "branch_manager" | "member">;

export type PasswordResetFlash = {
  fullName: string;
  loginIdentifier: string;
  loginLabel: "Email" | "Sign-in code";
  temporaryPassword: string;
};

export function isResettableUserRole(value: string): value is ResettableUserRole {
  return value === "member" || value === "agent" || value === "branch_manager";
}

export function buildPasswordResetDetailPath(role: ResettableUserRole, profileId: string) {
  switch (role) {
    case "member":
      return `/members/${profileId}`;
    case "agent":
      return `/agents/${profileId}`;
    case "branch_manager":
      return `/managers/${profileId}`;
  }
}

export function buildPasswordResetAuditAction(role: ResettableUserRole) {
  switch (role) {
    case "member":
      return "reset_member_password";
    case "agent":
      return "reset_agent_password";
    case "branch_manager":
      return "reset_manager_password";
  }
}

export function buildPasswordResetAuditMetadata(input: {
  loginIdentifier: string;
  targetRole: ResettableUserRole;
}) {
  return {
    loginIdentifier: input.loginIdentifier,
    targetRole: input.targetRole,
  } satisfies Record<string, unknown>;
}

export function getPasswordResetLoginLabel(role: ResettableUserRole): PasswordResetFlash["loginLabel"] {
  return role === "member" ? "Sign-in code" : "Email";
}

export function canResetLoginPassword(input: {
  actorBranchId: string | null;
  actorRole: PasswordResetActorRole;
  targetBranchId: string | null;
  targetRole: ResettableUserRole;
}) {
  if (input.actorRole === "admin") {
    return true;
  }

  if (!input.actorBranchId) {
    return false;
  }

  if (input.targetRole === "branch_manager") {
    return false;
  }

  return input.targetBranchId === input.actorBranchId;
}
