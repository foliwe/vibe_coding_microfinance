import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPasswordResetAuditAction,
  buildPasswordResetAuditMetadata,
  buildPasswordResetDetailPath,
  canResetLoginPassword,
  getPasswordResetLoginLabel,
} from "../apps/admin/lib/password-reset.ts";

test("admins can reset member, agent, and branch manager passwords", () => {
  assert.equal(
    canResetLoginPassword({
      actorBranchId: null,
      actorRole: "admin",
      targetBranchId: null,
      targetRole: "branch_manager",
    }),
    true,
  );
  assert.equal(
    canResetLoginPassword({
      actorBranchId: null,
      actorRole: "admin",
      targetBranchId: "branch-1",
      targetRole: "agent",
    }),
    true,
  );
  assert.equal(
    canResetLoginPassword({
      actorBranchId: null,
      actorRole: "admin",
      targetBranchId: "branch-1",
      targetRole: "member",
    }),
    true,
  );
});

test("branch managers can reset only same-branch members and agents", () => {
  assert.equal(
    canResetLoginPassword({
      actorBranchId: "branch-1",
      actorRole: "branch_manager",
      targetBranchId: "branch-1",
      targetRole: "agent",
    }),
    true,
  );
  assert.equal(
    canResetLoginPassword({
      actorBranchId: "branch-1",
      actorRole: "branch_manager",
      targetBranchId: "branch-1",
      targetRole: "member",
    }),
    true,
  );
  assert.equal(
    canResetLoginPassword({
      actorBranchId: "branch-1",
      actorRole: "branch_manager",
      targetBranchId: "branch-2",
      targetRole: "agent",
    }),
    false,
  );
  assert.equal(
    canResetLoginPassword({
      actorBranchId: "branch-1",
      actorRole: "branch_manager",
      targetBranchId: "branch-2",
      targetRole: "member",
    }),
    false,
  );
});

test("branch managers cannot reset managers and cannot reset anyone without a branch", () => {
  assert.equal(
    canResetLoginPassword({
      actorBranchId: "branch-1",
      actorRole: "branch_manager",
      targetBranchId: "branch-1",
      targetRole: "branch_manager",
    }),
    false,
  );
  assert.equal(
    canResetLoginPassword({
      actorBranchId: null,
      actorRole: "branch_manager",
      targetBranchId: "branch-1",
      targetRole: "agent",
    }),
    false,
  );
});

test("reset helpers build detail paths and labels without query strings", () => {
  assert.equal(buildPasswordResetDetailPath("member", "member-1"), "/members/member-1");
  assert.equal(buildPasswordResetDetailPath("agent", "agent-1"), "/agents/agent-1");
  assert.equal(buildPasswordResetDetailPath("branch_manager", "manager-1"), "/managers/manager-1");
  assert.equal(buildPasswordResetDetailPath("member", "member-1").includes("?"), false);
  assert.equal(getPasswordResetLoginLabel("member"), "Sign-in code");
  assert.equal(getPasswordResetLoginLabel("agent"), "Email");
});

test("audit helpers use distinct action names and exclude temporary passwords", () => {
  assert.equal(buildPasswordResetAuditAction("member"), "reset_member_password");
  assert.equal(buildPasswordResetAuditAction("agent"), "reset_agent_password");
  assert.equal(buildPasswordResetAuditAction("branch_manager"), "reset_manager_password");

  const metadata = buildPasswordResetAuditMetadata({
    loginIdentifier: "agent@example.com",
    targetRole: "agent",
  });

  assert.deepEqual(metadata, {
    loginIdentifier: "agent@example.com",
    targetRole: "agent",
  });
  assert.equal(Object.hasOwn(metadata, "temporaryPassword"), false);
});
