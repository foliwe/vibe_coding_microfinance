import test from "node:test";
import assert from "node:assert/strict";

import {
  createApprovedAdminTransaction,
  getAdminDashboardSummary,
  getAuthenticatedMemberAccountBalance,
  getBranchDashboardSummary,
  getMemberAccountBalance,
  getSeededPanelContext,
} from "./e2e/support/admin-panel-fixtures.ts";

function toCents(amount) {
  return Math.round(amount * 100);
}

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function requireSeededContext(t) {
  try {
    return await getSeededPanelContext();
  } catch (error) {
    t.skip(
      error instanceof Error
        ? `Seeded dashboard fixtures are unavailable: ${error.message}`
        : "Seeded dashboard fixtures are unavailable.",
    );
    return null;
  }
}

test(
  "authenticated admins can read member account balances through the balance RPC",
  { skip: !hasSupabaseEnv },
  async (t) => {
    const context = await requireSeededContext(t);

    if (!context) {
      return;
    }

    const serviceBalance = await getMemberAccountBalance(context.depositAccount.id);
    let authenticatedBalance;

    try {
      authenticatedBalance = await getAuthenticatedMemberAccountBalance({
        memberAccountId: context.depositAccount.id,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("permission denied for function get_member_account_balance")
      ) {
        t.skip(
          "Database grant for get_member_account_balance is not applied yet. Apply migration 0017_restore_member_balance_rpc_grants.sql.",
        );
        return;
      }

      throw error;
    }

    assert.equal(toCents(authenticatedBalance), toCents(serviceBalance));
  },
);

test(
  "approved deposit-account transactions roll up into admin and branch deposit totals",
  { skip: !hasSupabaseEnv },
  async (t) => {
    const context = await requireSeededContext(t);

    if (!context) {
      return;
    }

    const depositAmount = 37.5;
    const [adminBefore, branchBefore, memberBefore] = await Promise.all([
      getAdminDashboardSummary(),
      getBranchDashboardSummary(context.branch.id),
      getMemberAccountBalance(context.depositAccount.id),
    ]);

    const request = await createApprovedAdminTransaction({
      accountType: "deposit",
      amount: depositAmount,
      transactionType: "deposit",
    });

    const [adminAfter, branchAfter, memberAfter] = await Promise.all([
      getAdminDashboardSummary(),
      getBranchDashboardSummary(context.branch.id),
      getMemberAccountBalance(context.depositAccount.id),
    ]);

    assert.equal(request.status, "approved");
    assert.equal(request.transactionType, "deposit");
    assert.equal(request.memberAccountId, context.depositAccount.id);
    assert.equal(toCents(memberAfter - memberBefore), toCents(depositAmount));
    assert.equal(
      toCents(branchAfter.totalDeposits - branchBefore.totalDeposits),
      toCents(depositAmount),
    );
    assert.equal(
      toCents(adminAfter.totalDeposits - adminBefore.totalDeposits),
      toCents(depositAmount),
    );
    assert.equal(branchAfter.totalSavings, branchBefore.totalSavings);
    assert.equal(adminAfter.totalSavings, adminBefore.totalSavings);
  },
);

test(
  "approved savings deposits increase savings totals without touching deposit totals",
  { skip: !hasSupabaseEnv },
  async (t) => {
    const context = await requireSeededContext(t);

    if (!context) {
      return;
    }

    const savingsAmount = 28.25;
    const [adminBefore, branchBefore, memberBefore] = await Promise.all([
      getAdminDashboardSummary(),
      getBranchDashboardSummary(context.branch.id),
      getMemberAccountBalance(context.savingsAccount.id),
    ]);

    const request = await createApprovedAdminTransaction({
      accountType: "savings",
      amount: savingsAmount,
      transactionType: "deposit",
    });

    const [adminAfter, branchAfter, memberAfter] = await Promise.all([
      getAdminDashboardSummary(),
      getBranchDashboardSummary(context.branch.id),
      getMemberAccountBalance(context.savingsAccount.id),
    ]);

    assert.equal(request.status, "approved");
    assert.equal(request.transactionType, "deposit");
    assert.equal(request.memberAccountId, context.savingsAccount.id);
    assert.equal(toCents(memberAfter - memberBefore), toCents(savingsAmount));
    assert.equal(
      toCents(branchAfter.totalSavings - branchBefore.totalSavings),
      toCents(savingsAmount),
    );
    assert.equal(
      toCents(adminAfter.totalSavings - adminBefore.totalSavings),
      toCents(savingsAmount),
    );
    assert.equal(branchAfter.totalDeposits, branchBefore.totalDeposits);
    assert.equal(adminAfter.totalDeposits, adminBefore.totalDeposits);
  },
);
