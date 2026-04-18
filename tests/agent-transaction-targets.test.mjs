import test from "node:test";
import assert from "node:assert/strict";

import {
  listAgentTransactionTargets,
  resolveAgentTransactionTarget,
} from "../apps/mobile/src/lib/agent-transaction-targets.ts";

test("withdrawal member list includes only members with an eligible account target", () => {
  const targets = listAgentTransactionTargets({
    accountRows: [
      {
        account_number: "BR-DEP-001",
        account_type: "deposit",
        id: "acc-1",
        member_profile_id: "member-1",
      },
      {
        account_number: "BR-SAV-002",
        account_type: "savings",
        id: "acc-2",
        member_profile_id: "member-2",
      },
    ],
    balancesByMemberId: new Map([
      ["member-1", { depositBalance: 45000, savingsBalance: 5000 }],
      ["member-2", { depositBalance: 0, savingsBalance: 22000 }],
      ["member-3", { depositBalance: 0, savingsBalance: 0 }],
    ]),
    memberRows: [
      { profile_id: "member-1", sign_in_code: "MMBAM001" },
      { profile_id: "member-2", sign_in_code: "MMBAM002" },
      { profile_id: "member-3", sign_in_code: "MMBAM003" },
    ],
    profileMap: new Map([
      ["member-1", { full_name: "Alice" }],
      ["member-2", { full_name: "Bruno" }],
      ["member-3", { full_name: "Chika" }],
    ]),
    transactionType: "withdrawal",
  });

  assert.deepEqual(
    targets.map((target) => ({
      accountType: target.accountType,
      memberId: target.memberId,
    })),
    [
      { accountType: "deposit", memberId: "member-1" },
      { accountType: "savings", memberId: "member-2" },
    ],
  );
});

test("member-specific withdrawal lookup resolves the correct member and account", () => {
  const targets = listAgentTransactionTargets({
    accountRows: [
      {
        account_number: "BR-SAV-010",
        account_type: "savings",
        id: "acc-10",
        member_profile_id: "member-10",
      },
    ],
    balancesByMemberId: new Map([
      ["member-10", { depositBalance: 0, savingsBalance: 18000 }],
    ]),
    memberRows: [{ profile_id: "member-10", sign_in_code: "MMBAM010" }],
    profileMap: new Map([["member-10", { full_name: "Dora" }]]),
    transactionType: "withdrawal",
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0]?.memberId, "member-10");
  assert.equal(targets[0]?.accountType, "savings");
  assert.equal(targets[0]?.accountNumber, "BR-SAV-010");
});

test("member-specific withdrawal lookup returns null when no eligible account exists", () => {
  const target = resolveAgentTransactionTarget({
    accountRows: [],
    balances: { depositBalance: 0, savingsBalance: 0 },
    memberName: "Empty Member",
    memberRow: { profile_id: "member-empty", sign_in_code: "MMBAM999" },
    preferredAccountType: "deposit",
  });

  assert.equal(target, null);
});
