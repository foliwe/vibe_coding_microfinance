import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateNextLoanPaymentDueAt,
  isLoanPaymentOverdue,
  resolveLoanRepaymentStatus,
} from "../packages/shared/src/finance.ts";
import { getLoanScheduleRows } from "../apps/admin/lib/loan-schedule.ts";

test("loan next payment due date follows the approval-date schedule", () => {
  const dueAt = calculateNextLoanPaymentDueAt({
    createdAt: "2026-04-24T18:37:54.957Z",
    disbursedAt: "2026-04-24T18:40:15.211Z",
    repaymentCount: 1,
  });

  assert.equal(dueAt.toISOString(), "2026-05-24T18:37:54.957Z");
});

test("late or early repayments do not become the next payment anchor", () => {
  const dueAt = calculateNextLoanPaymentDueAt({
    createdAt: "2026-04-24T18:37:54.957Z",
    disbursedAt: "2026-04-24T18:40:15.211Z",
    repaymentCount: 2,
  });

  assert.equal(dueAt.toISOString(), "2026-06-24T18:37:54.957Z");
});

test("active loans become effectively defaulted once the payment due date arrives", () => {
  const nextDueAt = "2026-05-24T18:41:53.726Z";

  assert.equal(isLoanPaymentOverdue(nextDueAt, "2026-05-24T00:00:00.000Z"), true);
  assert.deepEqual(
    resolveLoanRepaymentStatus({
      nextDueAt,
      remainingPrincipal: 49000,
      status: "active",
      asOf: "2026-05-25T00:00:00.000Z",
    }),
    {
      effectiveStatus: "defaulted",
      isOverdue: true,
    },
  );
});

test("approved but undisbursed loans do not become overdue", () => {
  assert.deepEqual(
    resolveLoanRepaymentStatus({
      nextDueAt: "2026-05-24T18:41:53.726Z",
      remainingPrincipal: 49000,
      status: "approved",
      asOf: "2026-05-25T00:00:00.000Z",
    }),
    {
      effectiveStatus: "approved",
      isOverdue: false,
    },
  );
});

test("loan repayment schedule counts the first recorded repayment", () => {
  const schedule = getLoanScheduleRows(
    {
      created_at: "2099-04-24T18:37:54.957Z",
      status: "active",
    },
    [
      {
        amount: 50,
        branch_id: "branch-1",
        created_at: "2099-05-24T18:37:54.957Z",
        interest_component: 30,
        loan_id: "loan-1",
        principal_component: 20,
      },
    ],
    6,
  );

  assert.equal(schedule[0].id, "payment-1");
  assert.equal(schedule[0].state, "Paid");
  assert.equal(schedule[0].paidAt, "2099-05-24T18:37:54.957Z");
  assert.equal(schedule[1].id, "payment-2");
  assert.equal(schedule[1].state, "Upcoming");
});
