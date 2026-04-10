import test from "node:test";
import assert from "node:assert/strict";

import { summarizeMemberDetailCards } from "../apps/admin/lib/member-detail-summary.ts";

test("member detail cards sum balances across multiple savings and deposit accounts", () => {
  const summary = summarizeMemberDetailCards(
    [
      { accountType: "savings", balance: 1200 },
      { accountType: "savings", balance: 300 },
      { accountType: "deposit", balance: 800 },
      { accountType: "deposit", balance: 50 },
    ],
    [],
  );

  assert.equal(summary.savingsBalance, 1500);
  assert.equal(summary.depositBalance, 850);
  assert.equal(summary.outstandingLoanBalance, 0);
  assert.equal(summary.activeLoanCount, 0);
});

test("member detail cards sum outstanding loan balance and count active loans", () => {
  const summary = summarizeMemberDetailCards(
    [],
    [
      { remainingPrincipal: 700 },
      { remainingPrincipal: 125.5 },
      { remainingPrincipal: 0 },
    ],
  );

  assert.equal(summary.savingsBalance, 0);
  assert.equal(summary.depositBalance, 0);
  assert.equal(summary.outstandingLoanBalance, 825.5);
  assert.equal(summary.activeLoanCount, 2);
});
