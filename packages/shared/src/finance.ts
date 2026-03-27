import type { LoanDetailSummary, RepaymentMode } from "./domain";

export interface RepaymentPreview {
  interestDue: number;
  principalPaid: number;
  remainingPrincipal: number;
}

export function calculateMonthlyInterest(
  principal: number,
  monthlyRate: number,
): number {
  return roundCurrency(principal * monthlyRate);
}

export function previewRepayment(
  loan: LoanDetailSummary,
  paymentAmount: number,
  mode: RepaymentMode,
): RepaymentPreview {
  const interestDue = calculateMonthlyInterest(
    loan.remainingPrincipal,
    loan.monthlyInterestRate,
  );

  if (mode === "interest_only") {
    return {
      interestDue,
      principalPaid: 0,
      remainingPrincipal: loan.remainingPrincipal,
    };
  }

  const principalPaid = Math.max(paymentAmount - interestDue, 0);
  return {
    interestDue,
    principalPaid,
    remainingPrincipal: roundCurrency(
      Math.max(loan.remainingPrincipal - principalPaid, 0),
    ),
  };
}

export function formatCurrency(amount: number, currency = "XAF"): string {
  return new Intl.NumberFormat("en-CM", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}
