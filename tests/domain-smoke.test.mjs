import test from "node:test";
import assert from "node:assert/strict";

function calculateMonthlyInterest(principal, rate) {
  return Math.round(principal * rate * 100) / 100;
}

function previewRepayment(remainingPrincipal, monthlyRate, paymentAmount, mode) {
  const interestDue = calculateMonthlyInterest(remainingPrincipal, monthlyRate);

  if (mode === "interest_only") {
    return {
      interestDue,
      principalPaid: 0,
      remainingPrincipal,
    };
  }

  const principalPaid = Math.max(paymentAmount - interestDue, 0);
  return {
    interestDue,
    principalPaid,
    remainingPrincipal: Math.max(remainingPrincipal - principalPaid, 0),
  };
}

test("interest only repayment does not reduce principal", () => {
  const result = previewRepayment(80000, 0.05, 4000, "interest_only");
  assert.equal(result.interestDue, 4000);
  assert.equal(result.principalPaid, 0);
  assert.equal(result.remainingPrincipal, 80000);
});

test("interest plus principal reduces remaining balance", () => {
  const result = previewRepayment(80000, 0.05, 10000, "interest_plus_principal");
  assert.equal(result.interestDue, 4000);
  assert.equal(result.principalPaid, 6000);
  assert.equal(result.remainingPrincipal, 74000);
});
