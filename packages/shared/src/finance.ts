import type { LoanDetailSummary, LoanStatus, RepaymentMode } from "./domain";

export interface RepaymentPreview {
  interestDue: number;
  principalPaid: number;
  remainingPrincipal: number;
}

export interface LoanPaymentScheduleInput {
  createdAt: string | Date;
  disbursedAt?: string | Date | null;
  repaymentCount?: number;
}

export interface LoanRepaymentStatusInput {
  nextDueAt: string | Date;
  remainingPrincipal: number;
  status: LoanStatus;
  asOf?: string | Date;
}

export interface LoanRepaymentStatusSummary {
  effectiveStatus: LoanStatus;
  isOverdue: boolean;
}

export function calculateMonthlyInterest(
  principal: number,
  monthlyRate: number,
): number {
  return roundCurrency(principal * monthlyRate);
}

export function calculateNextLoanPaymentDueAt({
  createdAt,
  repaymentCount = 0,
}: LoanPaymentScheduleInput): Date {
  const approvalDate = new Date(createdAt);
  const nextDue = new Date(approvalDate);
  const monthsFromApproval = Math.max(1, Math.trunc(repaymentCount));
  nextDue.setUTCMonth(nextDue.getUTCMonth() + monthsFromApproval);

  return nextDue;
}

export function isLoanPaymentOverdue(
  nextDueAt: string | Date,
  asOf: string | Date = new Date(),
): boolean {
  const dueDate = startOfUtcDay(nextDueAt);
  const currentDate = startOfUtcDay(asOf);

  return dueDate.getTime() <= currentDate.getTime();
}

export function resolveLoanRepaymentStatus({
  asOf,
  nextDueAt,
  remainingPrincipal,
  status,
}: LoanRepaymentStatusInput): LoanRepaymentStatusSummary {
  if (status === "defaulted") {
    return {
      effectiveStatus: status,
      isOverdue: remainingPrincipal > 0,
    };
  }

  if (
    remainingPrincipal <= 0 ||
    (status !== "disbursed" && status !== "active")
  ) {
    return {
      effectiveStatus: status,
      isOverdue: false,
    };
  }

  const isOverdue = isLoanPaymentOverdue(nextDueAt, asOf);

  return {
    effectiveStatus: isOverdue ? "defaulted" : status,
    isOverdue,
  };
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

function startOfUtcDay(value: string | Date): Date {
  const date = new Date(value);

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}
