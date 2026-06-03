export type LoanScheduleRow = {
  id: string;
  dueAt: string;
  dueLabel: string;
  paidAt: string | null;
  paidLabel: string | null;
  state: "Paid" | "Paid late" | "Upcoming" | "Overdue" | "Pending";
};

export type LoanScheduleRepaymentRow = {
  created_at?: string | null;
};

export function getLoanScheduleRows(
  loan: { created_at: string; status: string },
  repayments: LoanScheduleRepaymentRow[],
  termMonths: number,
): LoanScheduleRow[] {
  const rowCount = Math.max(3, Math.min(Math.max(termMonths, repayments.length + 3), 12));
  const sortedRepayments = [...repayments].sort(
    (left, right) =>
      new Date(left.created_at ?? "").getTime() -
      new Date(right.created_at ?? "").getTime(),
  );
  const paidInstallmentCount = sortedRepayments.length;

  return Array.from({ length: rowCount }, (_, index) => {
    const dueAt = calculateNextLoanPaymentDueAt(loan.created_at, index + 1);
    const repayment = index < paidInstallmentCount ? sortedRepayments[index] : undefined;
    const paidAt = repayment?.created_at ?? null;
    const paidLate = paidAt
      ? startOfDay(paidAt).getTime() > startOfDay(dueAt).getTime()
      : false;
    const overdue = !paidAt && isLoanPaymentOverdue(dueAt);
    const state = paidAt
      ? paidLate
        ? "Paid late"
        : "Paid"
      : overdue
        ? "Overdue"
        : index === paidInstallmentCount
          ? "Upcoming"
          : "Pending";

    return {
      id: `payment-${index + 1}`,
      dueAt: dueAt.toISOString(),
      dueLabel: formatShortDate(dueAt),
      paidAt,
      paidLabel: paidAt ? formatShortDate(paidAt) : null,
      state,
    };
  });
}

function startOfDay(value: string | Date) {
  const date = new Date(value);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calculateNextLoanPaymentDueAt(createdAt: string | Date, repaymentCount: number): Date {
  const approvalDate = new Date(createdAt);
  const nextDue = new Date(approvalDate);
  const monthsFromApproval = Math.max(1, Math.trunc(repaymentCount));
  nextDue.setUTCMonth(nextDue.getUTCMonth() + monthsFromApproval);

  return nextDue;
}

function isLoanPaymentOverdue(nextDueAt: string | Date, asOf: string | Date = new Date()) {
  return startOfUtcDay(nextDueAt).getTime() <= startOfUtcDay(asOf).getTime();
}

function startOfUtcDay(value: string | Date): Date {
  const date = new Date(value);

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
