import {
  calculateMonthlyInterest,
  calculateNextLoanPaymentDueAt,
  FRAUD_RULES,
  isLoanPaymentOverdue,
  resolveLoanRepaymentStatus,
  type AdminDashboardSummary,
  type AgentPerformance,
  type BranchSummary,
  type BranchDashboardSummary,
  type FraudAlertRecord,
  type FraudDashboardSummary,
  type FraudRuleId,
  type FraudSeverity,
  type LoanStatus,
  type TransactionRequest,
  type UserRole,
} from "@credit-union/shared";

import { requireRole, type AdminProfile } from "./auth";
import { summarizeMemberDetailCards } from "./member-detail-summary";
import { hasSupabaseEnv } from "./supabase/env";

type DashboardAuthContext = Awaited<ReturnType<typeof requireRole>>;

export type BranchPerformanceChartPoint = {
  branch: string;
  savings: number;
  deposits: number;
};

export type PortfolioTrendChartPoint = {
  month: string;
  deposits: number;
  loans: number;
};

export type ActivityTrendChartPoint = {
  label: string;
  deposits: number;
  withdrawals: number;
};

export type FraudTrendChartPoint = {
  high: number;
  label: string;
  total: number;
};

export type AdminDashboardCharts = {
  branchPerformance: BranchPerformanceChartPoint[];
  portfolioTrend: PortfolioTrendChartPoint[];
};

export type FraudQueueRow = FraudAlertRecord & {
  agentName: string | null;
  assignedToName: string | null;
  branchName: string;
  memberName: string | null;
};

export type FraudBranchRiskRow = {
  branchId: string;
  branchName: string;
  highCount: number;
  investigatingCount: number;
  openCount: number;
  totalScore: number;
};

export type FraudAgentRiskRow = {
  agentId: string;
  agentName: string;
  alertCount: number;
  branchName: string;
  highestScore: number;
  latestDetectedAt: string;
};

export type FraudRuleLibraryRow = {
  description: string;
  id: FraudRuleId;
  severity: FraudSeverity;
  summaryLabel: string;
  thresholdLabel: string;
  title: string;
};

export type FraudPageData = {
  branchRisk: FraudBranchRiskRow[];
  currentBranchLabel: string;
  investigationQueue: FraudQueueRow[];
  isLive: boolean;
  profile: AdminProfile;
  rules: FraudRuleLibraryRow[];
  summary: FraudDashboardSummary;
  topAgents: FraudAgentRiskRow[];
  trend: FraudTrendChartPoint[];
};

export type TransactionQueuePageData = {
  agents: Array<{ id: string; fullName: string }>;
  branches: ReportBranchOption[];
  filters: TransactionPageFilters;
  profile: AdminProfile;
  branchLabel: string;
  historyTransactions: TransactionRequest[];
  pendingTransactions: TransactionRequest[];
  isLive: boolean;
};

export type TransactionPageFilters = {
  accountType?: "savings" | "deposit";
  agentId?: string;
  branchId?: string;
  type?: Extract<TransactionRequest["type"], "deposit" | "withdrawal">;
};

export type MemberRegistryRow = {
  id: string;
  fullName: string;
  agentId: string | null;
  agentName: string;
  branchName: string;
  createdAt: string | null;
  phone: string;
  status: string;
  occupation: string | null;
  address: string | null;
};

export type MembersPageData = {
  currentBranchLabel: string;
  profile: AdminProfile;
  members: MemberRegistryRow[];
  isLive: boolean;
};

export type AgentListRow = {
  id: string;
  fullName: string;
  branchName: string;
  phone: string;
  status: string;
  assignedMemberCount: number;
  collectionsToday: number;
  pendingApprovals: number;
  cashVariance: number;
};

export type AgentsPageData = {
  currentBranchLabel: string;
  profile: AdminProfile;
  agents: AgentListRow[];
  isLive: boolean;
};

export type ManagerRegistryRow = {
  id: string;
  fullName: string;
  branchName: string;
  phone: string;
  status: string;
};

export type ManagersPageData = {
  profile: AdminProfile;
  managers: ManagerRegistryRow[];
  isLive: boolean;
};

export type ManagerDetailPageData = {
  currentBranchLabel: string;
  profile: AdminProfile;
  manager: (ManagerRegistryRow & {
    branchId: string | null;
    email: string | null;
  }) | null;
  branch: BranchSummary | null;
  isLive: boolean;
};

export type MemberAccountDetail = {
  id: string;
  accountType: "savings" | "deposit";
  accountNumber: string;
  status: string;
  balance: number;
};

export type MemberDetailPageData = {
  currentBranchLabel: string;
  profile: AdminProfile;
  member: (MemberRegistryRow & {
    activeLoanCount: number;
    outstandingLoanBalance: number;
    pendingTransactions: number;
    savingsBalance: number;
    depositBalance: number;
  }) | null;
  accounts: MemberAccountDetail[];
  recentTransactions: TransactionRequest[];
  activityTrend: ActivityTrendChartPoint[];
  isLive: boolean;
};

export type AgentDetailPageData = {
  currentBranchLabel: string;
  profile: AdminProfile;
  agent: (AgentListRow & {
    collectionsTotal: number;
  }) | null;
  members: MemberRegistryRow[];
  recentTransactions: TransactionRequest[];
  activityTrend: ActivityTrendChartPoint[];
  isLive: boolean;
};

export type LoanRegistryRow = {
  id: string;
  applicationId: string;
  branchId: string;
  branchName: string;
  memberId: string;
  memberName: string;
  approvedPrincipal: number;
  remainingPrincipal: number;
  monthlyInterestRate: number;
  isOverdue: boolean;
  nextDueAt: string;
  nextDueLabel: string;
  nextInterestDue: number;
  repaymentCount: number;
  riskLabel: "Low" | "Medium" | "High";
  status: LoanStatus;
  disbursedAt: string | null;
  createdAt: string;
};

export type LoanApplicationRegistryRow = {
  id: string;
  branchId: string;
  branchName: string;
  memberName: string;
  requestedAmount: number;
  monthlyInterestRate: number;
  termMonths: number;
  collateralRequired: boolean;
  collateralNotes: string | null;
  status: LoanStatus;
  createdAt: string;
};

export type LoansPageData = {
  profile: AdminProfile;
  applications: LoanApplicationRegistryRow[];
  loans: LoanRegistryRow[];
  summary: {
    dueThisWeek: number;
    interestDue: number;
    outstandingPrincipal: number;
    overdueLoans: number;
    totalPortfolio: number;
  };
  isLive: boolean;
};

export type LoanRepaymentHistoryRow = {
  id: string;
  amount: number;
  createdAt: string;
  dateLabel: string;
  interestComponent: number;
  principalComponent: number;
  recordedBy: string;
  repaymentMode: string;
};

export type LoanScheduleRow = {
  id: string;
  dueAt: string;
  dueLabel: string;
  paidAt: string | null;
  paidLabel: string | null;
  state: "Paid" | "Paid late" | "Upcoming" | "Overdue" | "Pending";
};

export type LoanAuditEventRow = {
  action: string;
  actor: string;
  id: string;
  time: string;
};

export type LoanDetailPageData = {
  currentBranchLabel: string;
  profile: AdminProfile;
  loan: (LoanRegistryRow & {
    applicationStatus: LoanStatus | null;
    collateralNotes: string | null;
    collateralRequired: boolean;
    requestedAmount: number;
    signInCode: string | null;
    termMonths: number;
  }) | null;
  repayments: LoanRepaymentHistoryRow[];
  schedule: LoanScheduleRow[];
  auditEvents: LoanAuditEventRow[];
  isLive: boolean;
};

export type AuditLogRow = {
  time: string;
  actor: string;
  action: string;
  reference: string;
  result: string;
};

export type AuditPageData = {
  profile: AdminProfile;
  rows: AuditLogRow[];
  isLive: boolean;
};

export type ReportBranchOption = {
  id: string;
  name: string;
};

export type ReportJobRow = {
  id: string;
  branchName: string;
  reportType: string;
  status: string;
  requestedAt: string;
  filePath: string | null;
};

export type ReportsPageData = {
  profile: AdminProfile;
  branches: ReportBranchOption[];
  rows: ReportJobRow[];
  currentBranchLabel: string;
  isLive: boolean;
};

export type BranchDetailPageData = {
  profile: AdminProfile;
  branch: BranchSummary;
  summary: BranchDashboardSummary;
  alerts: TransactionRequest[];
  isLive: boolean;
};

export type ReconciliationReviewRow = {
  id: string;
  agentName: string;
  branchName: string;
  businessDate: string;
  countedCash: number;
  expectedCash: number;
  reviewNote: string | null;
  reviewedAt: string | null;
  status: "pending_review" | "approved" | "rejected";
  submittedAt: string;
  variance: number;
  varianceReason: string | null;
};

export type ReconciliationPageData = {
  currentBranchLabel: string;
  pendingRows: ReconciliationReviewRow[];
  profile: AdminProfile;
  recentRows: ReconciliationReviewRow[];
  summary: {
    cashVariance: number;
    expectedCashToday: number;
    pendingApprovals: number;
  };
  isLive: boolean;
};

type BranchDashboardRow = {
  branch_id: string;
  branch_name: string;
  total_members: number | string | null;
  active_agents: number | string | null;
  total_savings: number | string | null;
  total_deposits: number | string | null;
  outstanding_principal: number | string | null;
  pending_approvals: number | string | null;
};

type BranchRow = {
  id: string;
  name: string;
  manager_profile_id: string | null;
};

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name: string;
  phone?: string | null;
  role?: UserRole;
  branch_id: string | null;
  is_active?: boolean;
  created_at?: string;
};

type LoanRow = {
  id?: string;
  application_id: string;
  branch_id: string;
  member_profile_id?: string;
  approved_principal: number | string | null;
  remaining_principal: number | string | null;
  monthly_interest_rate?: number | string | null;
  status: LoanStatus;
  disbursed_at: string | null;
  created_at: string;
};

type LoanApplicationRow = {
  id: string;
  branch_id: string;
  member_profile_id: string;
  requested_amount: number | string | null;
  monthly_interest_rate: number | string | null;
  term_months: number | string | null;
  collateral_required: boolean | null;
  collateral_notes: string | null;
  status: LoanStatus;
  created_at: string;
};

type RepaymentRow = {
  amount?: number | string | null;
  approved_by?: string | null;
  branch_id: string;
  created_at?: string | null;
  created_by?: string | null;
  id?: string;
  interest_component: number | string | null;
  loan_id?: string | null;
  principal_component?: number | string | null;
  repayment_mode?: string | null;
};

type CashDrawerRow = {
  id?: string;
  branch_id: string;
  agent_profile_id: string;
  business_date?: string;
  counted_cash?: number | string | null;
  status?: string;
  expected_cash: number | string | null;
  variance: number | string | null;
};

type CashReconciliationTableRow = {
  id: string;
  branch_id: string;
  cash_drawer_id: string;
  counted_cash: number | string | null;
  expected_cash: number | string | null;
  review_note: string | null;
  reviewed_at: string | null;
  status: "pending_review" | "approved" | "rejected";
  submitted_at: string;
  variance: number | string | null;
  variance_reason: string | null;
};

type TransactionRow = {
  id: string;
  branch_id: string;
  member_profile_id: string;
  member_account_id: string;
  agent_profile_id: string;
  transaction_type: TransactionRequest["type"];
  amount: number | string | null;
  note?: string | null;
  status: TransactionRequest["status"];
  created_at: string;
};

type QueueMemberAccountRow = {
  account_type: "savings" | "deposit";
  id: string;
};

type MemberAccountRow = {
  id: string;
  account_type: "savings" | "deposit";
  account_number: string;
  status: string;
};

type MemberProfileRegistryRow = {
  profile_id: string;
  branch_id: string;
  assigned_agent_id: string | null;
  status: string;
  occupation: string | null;
  residential_address: string | null;
};

type AuditLogTableRow = {
  actor_id: string | null;
  action: string;
  entity_id: string;
  created_at: string;
};

type FraudAlertTableRow = {
  id: string;
  branch_id: string;
  agent_profile_id: string | null;
  member_profile_id: string | null;
  transaction_request_id: string | null;
  cash_reconciliation_id: string | null;
  rule_id: FraudRuleId;
  severity: FraudSeverity;
  score: number | string | null;
  status: FraudAlertRecord["status"];
  title: string;
  summary: string;
  evidence: Record<string, unknown> | null;
  fingerprint: string;
  detected_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  assigned_to: string | null;
};

type SupabaseErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type SupabaseQueryResult<T> = {
  data: T | null;
  error?: SupabaseErrorLike | null;
};

type ReportJobTableRow = {
  id: string;
  branch_id: string | null;
  report_type: string;
  status: string;
  file_path: string | null;
  created_at: string;
};

const FRAUD_ALERT_PAGE_SIZE = 1000;
const FRAUD_ALERT_SELECT =
  "id, branch_id, agent_profile_id, member_profile_id, transaction_request_id, cash_reconciliation_id, rule_id, severity, score, status, title, summary, evidence, fingerprint, detected_at, last_seen_at, resolved_at, resolution_note, assigned_to";

function emptyProfile(role: UserRole = "admin"): AdminProfile {
  return {
    id: `empty-${role}`,
    role,
    full_name: "Supabase not configured",
    email: null,
    branch_id: null,
    must_change_password: false,
    requires_pin_setup: false,
    is_active: true,
  };
}

function emptyAdminSummary(): AdminDashboardSummary {
  return {
    branchCount: 0,
    totalMembers: 0,
    totalAgents: 0,
    totalSavings: 0,
    totalDeposits: 0,
    totalLoans: 0,
    outstandingPrincipal: 0,
    interestCollected: 0,
    overdueLoans: 0,
    pendingApprovals: 0,
    cashVariance: 0,
    branchPerformance: [],
  };
}

function emptyBranchSummary(branchId = "branch", branchName = "Branch"): BranchDashboardSummary {
  return {
    branchId,
    branchName,
    totalMembers: 0,
    activeAgents: 0,
    newMembersThisMonth: 0,
    totalSavings: 0,
    totalDeposits: 0,
    totalLoans: 0,
    outstandingPrincipal: 0,
    interestCollected: 0,
    overdueLoans: 0,
    pendingApprovals: 0,
    expectedCashToday: 0,
    cashVariance: 0,
    agentPerformance: [],
  };
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getRepaymentCountsByLoanId(rows: RepaymentRow[]) {
  const countsByLoanId = new Map<string, number>();

  for (const row of rows) {
    if (!row.loan_id) {
      continue;
    }

    countsByLoanId.set(row.loan_id, (countsByLoanId.get(row.loan_id) ?? 0) + 1);
  }

  return countsByLoanId;
}

function getLoanPaymentSummary(
  loan: Pick<LoanRow, "created_at" | "disbursed_at" | "remaining_principal" | "status">,
  repaymentCount = 0,
) {
  const nextDue = calculateNextLoanPaymentDueAt({
    createdAt: loan.created_at,
    disbursedAt: loan.disbursed_at,
    repaymentCount,
  });
  const repaymentStatus = resolveLoanRepaymentStatus({
    nextDueAt: nextDue,
    remainingPrincipal: toNumber(loan.remaining_principal),
    status: loan.status,
  });

  return {
    effectiveStatus: repaymentStatus.effectiveStatus,
    isOverdue: repaymentStatus.isOverdue,
    nextDueAt: nextDue.toISOString(),
    nextDueLabel: formatShortDate(nextDue),
  };
}

function getLoanRiskLabel(isOverdue: boolean, nextDueAt: string): "Low" | "Medium" | "High" {
  if (isOverdue) {
    return "High";
  }

  const dueTime = new Date(nextDueAt).getTime();
  const now = new Date();
  const weekFromNow = now.getTime() + 7 * 24 * 60 * 60 * 1000;

  return dueTime <= weekFromNow ? "Medium" : "Low";
}

function getLoanScheduleRows(
  loan: Pick<LoanRow, "created_at" | "status">,
  repayments: RepaymentRow[],
  termMonths: number,
): LoanScheduleRow[] {
  const rowCount = Math.max(3, Math.min(Math.max(termMonths, repayments.length + 3), 12));
  const sortedRepayments = [...repayments].sort(
    (left, right) =>
      new Date(left.created_at ?? "").getTime() -
      new Date(right.created_at ?? "").getTime(),
  );
  const paidInstallmentCount = Math.max(0, sortedRepayments.length - 1);

  return Array.from({ length: rowCount }, (_, index) => {
    const dueAt = calculateNextLoanPaymentDueAt({
      createdAt: loan.created_at,
      repaymentCount: index + 1,
    });
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

function formatSupabaseError(error: SupabaseErrorLike) {
  return [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(" ");
}

function isNoRowsError(error: SupabaseErrorLike) {
  return error.code === "PGRST116";
}

function readSupabaseData<T>(
  result: SupabaseQueryResult<unknown>,
  label: string,
  options: { allowNoRows?: boolean } = {},
) {
  if (result.error) {
    if (options.allowNoRows && isNoRowsError(result.error)) {
      return null;
    }

    throw new Error(`${label}: ${formatSupabaseError(result.error)}`);
  }

  return (result.data ?? null) as T | null;
}

function readSupabaseRows<T>(result: SupabaseQueryResult<unknown[]>, label: string) {
  return readSupabaseData<T[]>(result, label) ?? [];
}

function groupRowsBy<T>(
  rows: readonly T[],
  getKey: (row: T) => string | null | undefined,
) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row);

    if (!key) {
      continue;
    }

    const existing = grouped.get(key);

    if (existing) {
      existing.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  return grouped;
}

async function getDashboardAuthContext(
  allowedRoles: UserRole[],
  context?: DashboardAuthContext,
) {
  if (!context) {
    return requireRole(allowedRoles);
  }

  if (!allowedRoles.includes(context.profile.role)) {
    throw new Error(`Authenticated profile cannot load this dashboard scope.`);
  }

  return context;
}

function firstDayOfCurrentMonth() {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return first.toISOString();
}

function currentDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabelFromOffset(offset: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + offset, 1)),
  );
}

function buildAdminDashboardCharts(summary: AdminDashboardSummary): AdminDashboardCharts {
  const branchPerformance = [...summary.branchPerformance]
    .sort(
      (a, b) =>
        b.totalSavings + b.totalDeposits - (a.totalSavings + a.totalDeposits),
    )
    .map((branch) => ({
      branch: branch.name,
      savings: branch.totalSavings,
      deposits: branch.totalDeposits,
    }));

  const depositWeights = [0.58, 0.67, 0.74, 0.82, 0.91, 1];
  const loanWeights = [0.52, 0.61, 0.7, 0.79, 0.88, 0.96];
  const portfolioTrend = depositWeights.map((weight, index) => ({
    month: monthLabelFromOffset(index - (depositWeights.length - 1)),
    deposits: Math.round(summary.totalDeposits * weight),
    loans: Math.round(summary.totalLoans * loanWeights[index]),
  }));

  return { branchPerformance, portfolioTrend };
}

function activityLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildActivityTrend(transactions: TransactionRequest[], days = 7): ActivityTrendChartPoint[] {
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));

    return {
      key: date.toISOString().slice(0, 10),
      label: activityLabel(date),
      deposits: 0,
      withdrawals: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const transaction of transactions) {
    const key = transaction.createdAt.slice(0, 10);
    const bucket = bucketMap.get(key);

    if (!bucket) {
      continue;
    }

    if (transaction.type === "deposit") {
      bucket.deposits += transaction.amount;
    }

    if (transaction.type === "withdrawal") {
      bucket.withdrawals += transaction.amount;
    }
  }

  return buckets.map(({ key: _key, ...bucket }) => bucket);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildFraudTrend(rows: FraudAlertRecord[], days = 7): FraudTrendChartPoint[] {
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));

    return {
      key: date.toISOString().slice(0, 10),
      label: activityLabel(date),
      total: 0,
      high: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const row of rows) {
    const key = row.detectedAt.slice(0, 10);
    const bucket = bucketMap.get(key);

    if (!bucket) {
      continue;
    }

    bucket.total += 1;

    if (row.severity === "high") {
      bucket.high += 1;
    }
  }

  return buckets.map(({ key: _key, ...bucket }) => bucket);
}

async function getCurrentBranchLabel(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  profile: AdminProfile,
) {
  if (profile.role === "admin") {
    return "All branches";
  }

  if (!profile.branch_id) {
    return "Unassigned branch";
  }

  const branchResult = await supabase
    .from("branches")
    .select("name")
    .eq("id", profile.branch_id)
    .maybeSingle();
  const data = readSupabaseData<Pick<BranchRow, "name">>(
    branchResult,
    "Load current branch label",
    { allowNoRows: true },
  );

  return data?.name ?? "Branch";
}

async function mapTransactions(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  rows: TransactionRow[],
) {
  const actorIds = Array.from(
    new Set(rows.flatMap((row) => [row.member_profile_id, row.agent_profile_id])),
  );
  const memberAccountIds = Array.from(new Set(rows.map((row) => row.member_account_id)));
  const branchIds = Array.from(new Set(rows.map((row) => row.branch_id)));

  const [profileResult, branchResult, accountResult] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", actorIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    branchIds.length
      ? supabase.from("branches").select("id, name").in("id", branchIds)
      : Promise.resolve({ data: [] as BranchRow[] }),
    memberAccountIds.length
      ? supabase
          .from("member_accounts")
          .select("id, account_type")
          .in("id", memberAccountIds)
      : Promise.resolve({ data: [] as QueueMemberAccountRow[] }),
  ]);
  const profileRows = readSupabaseRows<ProfileRow>(
    profileResult,
    "Load transaction profile names",
  );
  const branchRows = readSupabaseRows<BranchRow>(
    branchResult,
    "Load transaction branch names",
  );
  const accountRows = readSupabaseRows<QueueMemberAccountRow>(
    accountResult,
    "Load transaction account types",
  );

  const profileMap = new Map(
    profileRows.map((profile) => [profile.id, profile.full_name]),
  );
  const branchMap = new Map(branchRows.map((branch) => [branch.id, branch.name]));
  const accountMap = new Map(
    accountRows.map((account) => [account.id, account.account_type]),
  );

  return rows.map(
    (row): TransactionRequest => ({
      id: row.id,
      memberId: row.member_profile_id,
      memberName: profileMap.get(row.member_profile_id) ?? row.member_profile_id,
      branchId: row.branch_id,
      branchName: branchMap.get(row.branch_id) ?? row.branch_id,
      agentId: row.agent_profile_id,
      agentName: profileMap.get(row.agent_profile_id) ?? row.agent_profile_id,
      type: row.transaction_type,
      accountType: accountMap.get(row.member_account_id) ?? "savings",
      amount: toNumber(row.amount),
      status: row.status,
      createdAt: row.created_at,
      note: row.note ?? undefined,
    }),
  );
}

async function getBranchMappings(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"]) {
  const branchResult = await supabase
    .from("branches")
    .select("id, name, manager_profile_id");

  const branches = readSupabaseRows<BranchRow>(branchResult, "Load branch mappings");
  const managerIds = branches
    .map((branch) => branch.manager_profile_id)
    .filter((value): value is string => Boolean(value));

  const managerResult = managerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", managerIds)
    : { data: [] as ProfileRow[] };
  const managerRows = readSupabaseRows<ProfileRow>(
    managerResult,
    "Load branch manager names",
  );

  const managerMap = new Map(
    managerRows.map((profile) => [profile.id, profile.full_name]),
  );

  return { branches, managerMap };
}

async function getProfileNameMap(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  ids: string[],
) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const result = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const rows = readSupabaseRows<ProfileRow>(result, "Load profile names");

  return new Map(rows.map((profile) => [profile.id, profile.full_name]));
}

async function getPendingTransactions(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  filters: TransactionPageFilters,
  branchId?: string,
) {
  return getTransactionsByScope(supabase, filters, {
    branchId,
    excludePending: false,
    onlyPending: true,
  });
}

async function getTransactionsByScope(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  filters: TransactionPageFilters,
  options?: {
    branchId?: string;
    excludePending?: boolean;
    onlyPending?: boolean;
  },
) {
  let query = supabase
    .from("transaction_requests")
    .select(
      "id, branch_id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, note, status, created_at",
    )
    .order("created_at", { ascending: false });

  const branchScope = options?.branchId ?? filters.branchId;

  if (options?.onlyPending) {
    query = query.eq("status", "pending_approval");
  }

  if (options?.excludePending) {
    query = query.neq("status", "pending_approval");
  }

  if (branchScope) {
    query = query.eq("branch_id", branchScope);
  }

  if (filters.type) {
    query = query.eq("transaction_type", filters.type);
  }

  if (filters.agentId) {
    query = query.eq("agent_profile_id", filters.agentId);
  }

  const { data } = await query;
  const rows = (data as TransactionRow[] | null) ?? [];
  const transactions = await mapTransactions(supabase, rows);

  if (!filters.accountType) {
    return transactions;
  }

  return transactions.filter(
    (transaction) => transaction.accountType === filters.accountType,
  );
}

async function getTransactionFilterOptions(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  profile: AdminProfile,
  filters: TransactionPageFilters,
) {
  let branchQuery = supabase
    .from("branches")
    .select("id, name")
    .order("name", { ascending: true });
  let agentQuery = supabase
    .from("profiles")
    .select("id, full_name, branch_id")
    .eq("role", "agent")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (profile.role === "branch_manager") {
    const scopedBranchId = profile.branch_id ?? undefined;

    if (scopedBranchId) {
      branchQuery = branchQuery.eq("id", scopedBranchId);
      agentQuery = agentQuery.eq("branch_id", scopedBranchId);
    }
  } else if (filters.branchId) {
    agentQuery = agentQuery.eq("branch_id", filters.branchId);
  }

  const [{ data: branchData }, { data: agentData }] = await Promise.all([
    branchQuery,
    agentQuery,
  ]);

  return {
    branches: ((branchData as BranchRow[] | null) ?? []).map((branch) => ({
      id: branch.id,
      name: branch.name,
    })),
    agents: ((agentData as ProfileRow[] | null) ?? []).map((agent) => ({
      id: agent.id,
      fullName: agent.full_name,
    })),
  };
}

export async function getTransactionQueuePageData(
  filters: TransactionPageFilters = {},
): Promise<TransactionQueuePageData> {
  if (!hasSupabaseEnv()) {
    return {
      agents: [],
      branches: [],
      filters,
      profile: emptyProfile("branch_manager"),
      branchLabel: "Supabase setup needed",
      historyTransactions: [],
      pendingTransactions: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;
  const branchLabel = await getCurrentBranchLabel(supabase, profile);

  const scopedFilters: TransactionPageFilters = {
    accountType: filters.accountType,
    agentId: filters.agentId,
    branchId: profile.role === "branch_manager" ? branchId : filters.branchId,
    type: filters.type,
  };

  const [{ agents, branches }, pendingTransactions, historyTransactions] =
    await Promise.all([
      getTransactionFilterOptions(supabase, profile, scopedFilters),
      getPendingTransactions(supabase, scopedFilters, branchId),
      getTransactionsByScope(supabase, scopedFilters, {
        branchId,
        excludePending: true,
      }),
    ]);

  return {
    agents,
    branches,
    filters: scopedFilters,
    profile,
    branchLabel,
    historyTransactions,
    pendingTransactions,
    isLive: true,
  };
}

export async function getAdminDashboardData(context?: DashboardAuthContext) {
  if (!hasSupabaseEnv()) {
    const summary = emptyAdminSummary();
    return {
      profile: emptyProfile("admin"),
      summary,
      charts: buildAdminDashboardCharts(summary),
      alerts: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await getDashboardAuthContext(["admin"], context);

  const [branchRowsResult, { branches, managerMap }, loanRowsResult, repaymentRowsResult, cashRowsResult] =
    await Promise.all([
      supabase.from("branch_dashboard_summary").select("*"),
      getBranchMappings(supabase),
      supabase.from("loans").select("id, branch_id, approved_principal, remaining_principal, status, disbursed_at, created_at"),
      supabase.from("loan_repayments").select("branch_id, loan_id, interest_component, created_at"),
      supabase.from("cash_drawers").select("branch_id, expected_cash, variance, agent_profile_id"),
    ]);

  const branchRows = readSupabaseRows<BranchDashboardRow>(
    branchRowsResult,
    "Load admin branch dashboard summary",
  );
  const loanRows = readSupabaseRows<LoanRow>(loanRowsResult, "Load admin loan totals");
  const repaymentRows = readSupabaseRows<RepaymentRow>(
    repaymentRowsResult,
    "Load admin repayment totals",
  );
  const cashRows = readSupabaseRows<CashDrawerRow>(
    cashRowsResult,
    "Load admin cash drawer totals",
  );
  const repaymentCountsByLoanId = getRepaymentCountsByLoanId(repaymentRows);
  const branchesById = new Map(branches.map((branch) => [branch.id, branch]));
  const loanRowsByBranchId = groupRowsBy(loanRows, (loan) => loan.branch_id);
  const cashRowsByBranchId = groupRowsBy(cashRows, (cash) => cash.branch_id);

  const branchPerformance = branchRows.map((row) => {
    const branchLoanRows = loanRowsByBranchId.get(row.branch_id) ?? [];
    const branchCashRows = cashRowsByBranchId.get(row.branch_id) ?? [];
    const branchMeta = branchesById.get(row.branch_id);

    return {
      id: row.branch_id,
      name: row.branch_name,
      managerName:
        managerMap.get(branchMeta?.manager_profile_id ?? "") ?? "Unassigned",
      memberCount: toNumber(row.total_members),
      agentCount: toNumber(row.active_agents),
      totalSavings: toNumber(row.total_savings),
      totalDeposits: toNumber(row.total_deposits),
      totalLoans: branchLoanRows.reduce(
        (sum, loan) => sum + toNumber(loan.approved_principal),
        0,
      ),
      outstandingPrincipal: toNumber(row.outstanding_principal),
      pendingApprovals: toNumber(row.pending_approvals),
      cashVariance: branchCashRows.reduce(
        (sum, cash) => sum + toNumber(cash.variance),
        0,
      ),
    };
  });

  const summary: AdminDashboardSummary = {
    branchCount: branchPerformance.length,
    totalMembers: branchPerformance.reduce((sum, branch) => sum + branch.memberCount, 0),
    totalAgents: branchPerformance.reduce((sum, branch) => sum + branch.agentCount, 0),
    totalSavings: branchPerformance.reduce((sum, branch) => sum + branch.totalSavings, 0),
    totalDeposits: branchPerformance.reduce((sum, branch) => sum + branch.totalDeposits, 0),
    totalLoans: branchPerformance.reduce((sum, branch) => sum + branch.totalLoans, 0),
    outstandingPrincipal: branchPerformance.reduce(
      (sum, branch) => sum + branch.outstandingPrincipal,
      0,
    ),
    interestCollected: repaymentRows.reduce(
      (sum, repayment) => sum + toNumber(repayment.interest_component),
      0,
    ),
    overdueLoans: loanRows.filter((loan) =>
      getLoanPaymentSummary(loan, repaymentCountsByLoanId.get(loan.id ?? "") ?? 0).isOverdue,
    ).length,
    pendingApprovals: branchPerformance.reduce(
      (sum, branch) => sum + branch.pendingApprovals,
      0,
    ),
    cashVariance: branchPerformance.reduce((sum, branch) => sum + branch.cashVariance, 0),
    branchPerformance,
  };

  return {
    profile,
    summary,
    charts: buildAdminDashboardCharts(summary),
    alerts: await getPendingTransactions(supabase, {}),
    isLive: true,
  };
}

async function getBranchDashboardSnapshot(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  branchId: string,
) {
  const today = currentDateIso();
  const startOfMonth = firstDayOfCurrentMonth();

  const [
    branchSummaryResult,
    branchResult,
    loanRowsResult,
    repaymentRowsResult,
    cashRowsResult,
    memberRowsResult,
    agentRowsResult,
    transactionRowsResult,
  ] = await Promise.all([
    supabase.from("branch_dashboard_summary").select("*").eq("branch_id", branchId).single(),
    supabase.from("branches").select("id, name").eq("id", branchId).single(),
    supabase
      .from("loans")
      .select("id, branch_id, approved_principal, remaining_principal, status, disbursed_at, created_at")
      .eq("branch_id", branchId),
    supabase
      .from("loan_repayments")
      .select("branch_id, loan_id, interest_component, created_at")
      .eq("branch_id", branchId),
    supabase
      .from("cash_drawers")
      .select("branch_id, agent_profile_id, expected_cash, variance")
      .eq("branch_id", branchId)
      .eq("business_date", today),
    supabase
      .from("profiles")
      .select("id, full_name, branch_id, created_at")
      .eq("role", "member")
      .eq("branch_id", branchId)
      .gte("created_at", startOfMonth),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "agent")
      .eq("branch_id", branchId),
    supabase
      .from("transaction_requests")
      .select(
        "id, branch_id, member_profile_id, agent_profile_id, transaction_type, amount, status, created_at",
      )
      .eq("branch_id", branchId)
      .gte("created_at", `${today}T00:00:00.000Z`),
  ]);

  const row = readSupabaseData<BranchDashboardRow>(
    branchSummaryResult,
    "Load branch dashboard summary",
    { allowNoRows: true },
  );
  const branch = readSupabaseData<BranchRow>(
    branchResult,
    "Load branch dashboard branch record",
    { allowNoRows: true },
  );

  if (!row) {
    return {
      summary: emptyBranchSummary(
        branchId,
        branch?.name ?? "Branch",
      ),
      alerts: [],
    };
  }

  const loanRows = readSupabaseRows<LoanRow>(loanRowsResult, "Load branch loans");
  const repaymentRows = readSupabaseRows<RepaymentRow>(
    repaymentRowsResult,
    "Load branch repayments",
  );
  const cashRows = readSupabaseRows<CashDrawerRow>(
    cashRowsResult,
    "Load branch cash drawers",
  );
  const memberRows = readSupabaseRows<ProfileRow>(
    memberRowsResult,
    "Load new branch members",
  );
  const agentRows = readSupabaseRows<ProfileRow>(agentRowsResult, "Load branch agents");
  const transactionRows = readSupabaseRows<TransactionRow>(
    transactionRowsResult,
    "Load branch daily transactions",
  );
  const repaymentCountsByLoanId = getRepaymentCountsByLoanId(repaymentRows);
  const transactionRowsByAgentId = groupRowsBy(
    transactionRows,
    (transaction) => transaction.agent_profile_id,
  );
  const cashRowsByAgentId = groupRowsBy(cashRows, (cash) => cash.agent_profile_id);

  const agentPerformance: AgentPerformance[] = agentRows.map((agent) => {
    const agentTransactions = transactionRowsByAgentId.get(agent.id) ?? [];
    const agentCashRows = cashRowsByAgentId.get(agent.id) ?? [];

    return {
      id: agent.id,
      name: agent.full_name,
      collectionsToday: agentTransactions.reduce(
        (sum, transaction) => sum + toNumber(transaction.amount),
        0,
      ),
      pendingApprovals: agentTransactions.filter(
        (transaction) => transaction.status === "pending_approval",
      ).length,
      cashVariance: agentCashRows.reduce(
        (sum, cash) => sum + toNumber(cash.variance),
        0,
      ),
    };
  });

  const summary: BranchDashboardSummary = {
    branchId,
    branchName: branch?.name ?? row.branch_name,
    totalMembers: toNumber(row.total_members),
    activeAgents: toNumber(row.active_agents),
    newMembersThisMonth: memberRows.length,
    totalSavings: toNumber(row.total_savings),
    totalDeposits: toNumber(row.total_deposits),
    totalLoans: loanRows.reduce((sum, loan) => sum + toNumber(loan.approved_principal), 0),
    outstandingPrincipal: loanRows.reduce(
      (sum, loan) => sum + toNumber(loan.remaining_principal),
      0,
    ),
    interestCollected: repaymentRows.reduce(
      (sum, repayment) => sum + toNumber(repayment.interest_component),
      0,
    ),
    overdueLoans: loanRows.filter((loan) =>
      getLoanPaymentSummary(loan, repaymentCountsByLoanId.get(loan.id ?? "") ?? 0).isOverdue,
    ).length,
    pendingApprovals: toNumber(row.pending_approvals),
    expectedCashToday: cashRows.reduce((sum, cash) => sum + toNumber(cash.expected_cash), 0),
    cashVariance: cashRows.reduce((sum, cash) => sum + toNumber(cash.variance), 0),
    agentPerformance,
  };

  return {
    summary,
    alerts: await getPendingTransactions(supabase, {}, branchId),
  };
}

export async function getBranchDashboardData(context?: DashboardAuthContext) {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("branch_manager"),
      summary: emptyBranchSummary(),
      alerts: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await getDashboardAuthContext(
    ["admin", "branch_manager"],
    context,
  );
  const branchId = profile.branch_id;

  if (!branchId) {
    return {
      profile,
      summary: emptyBranchSummary("unassigned", "Unassigned branch"),
      alerts: [],
      isLive: true,
    };
  }

  const snapshot = await getBranchDashboardSnapshot(supabase, branchId);

  return {
    profile,
    ...snapshot,
    isLive: true,
  };
}

export async function getAdminDashboardPageData() {
  if (!hasSupabaseEnv()) {
    const [dashboard, fraud] = await Promise.all([
      getAdminDashboardData(),
      getFraudPageData(),
    ]);

    return { dashboard, fraud };
  }

  const context = await requireRole(["admin"]);
  const [dashboard, fraud] = await Promise.all([
    getAdminDashboardData(context),
    getFraudPageData(context),
  ]);

  return { dashboard, fraud };
}

export async function getBranchDashboardPageData() {
  if (!hasSupabaseEnv()) {
    const [dashboard, fraud] = await Promise.all([
      getBranchDashboardData(),
      getFraudPageData(),
    ]);

    return { dashboard, fraud };
  }

  const context = await requireRole(["admin", "branch_manager"]);
  const [dashboard, fraud] = await Promise.all([
    getBranchDashboardData(context),
    getFraudPageData(context),
  ]);

  return { dashboard, fraud };
}

export async function getReconciliationPageData(): Promise<ReconciliationPageData> {
  if (!hasSupabaseEnv()) {
    return {
      currentBranchLabel: "Supabase setup needed",
      pendingRows: [],
      profile: emptyProfile("branch_manager"),
      recentRows: [],
      summary: {
        cashVariance: 0,
        expectedCashToday: 0,
        pendingApprovals: 0,
      },
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchScope = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  if (profile.role === "branch_manager" && !branchScope) {
    return {
      currentBranchLabel: "Unassigned branch",
      pendingRows: [],
      profile,
      recentRows: [],
      summary: {
        cashVariance: 0,
        expectedCashToday: 0,
        pendingApprovals: 0,
      },
      isLive: true,
    };
  }

  const today = currentDateIso();
  let reconciliationQuery = supabase
    .from("cash_reconciliations")
    .select(
      "id, branch_id, cash_drawer_id, counted_cash, expected_cash, variance, variance_reason, status, submitted_at, reviewed_at, review_note",
    )
    .order("submitted_at", { ascending: false })
    .limit(40);
  let cashDrawerQuery = supabase
    .from("cash_drawers")
    .select("id, branch_id, agent_profile_id, business_date, counted_cash, expected_cash, status, variance")
    .eq("business_date", today);
  let pendingApprovalsQuery = supabase
    .from("transaction_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_approval");

  if (branchScope) {
    reconciliationQuery = reconciliationQuery.eq("branch_id", branchScope);
    cashDrawerQuery = cashDrawerQuery.eq("branch_id", branchScope);
    pendingApprovalsQuery = pendingApprovalsQuery.eq("branch_id", branchScope);
  }

  const [{ branches }, reconciliationResponse, cashDrawerResponse, pendingApprovalsResponse] =
    await Promise.all([
      getBranchMappings(supabase),
      reconciliationQuery,
      cashDrawerQuery,
      pendingApprovalsQuery,
    ]);

  const reconciliationRows =
    (reconciliationResponse.data as CashReconciliationTableRow[] | null) ?? [];
  const cashDrawerRows = (cashDrawerResponse.data as CashDrawerRow[] | null) ?? [];
  const drawerMap = new Map(
    cashDrawerRows
      .filter((row): row is CashDrawerRow & { id: string } => Boolean(row.id))
      .map((row) => [row.id, row]),
  );
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));
  const agentIds = Array.from(
    new Set(
      cashDrawerRows
        .map((row) => row.agent_profile_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const agentMap = await getProfileNameMap(supabase, agentIds);

  const rows = reconciliationRows.map((row) => {
    const drawer = drawerMap.get(row.cash_drawer_id);

    return {
      id: row.id,
      agentName:
        agentMap.get(drawer?.agent_profile_id ?? "") ??
        drawer?.agent_profile_id ??
        "Assigned agent",
      branchName: branchMap.get(row.branch_id) ?? row.branch_id,
      businessDate: drawer?.business_date ?? today,
      countedCash: toNumber(row.counted_cash),
      expectedCash: toNumber(row.expected_cash),
      reviewNote: row.review_note,
      reviewedAt: row.reviewed_at,
      status: row.status,
      submittedAt: row.submitted_at,
      variance: toNumber(row.variance),
      varianceReason: row.variance_reason,
    } satisfies ReconciliationReviewRow;
  });

  return {
    currentBranchLabel:
      profile.role === "admin"
        ? "All branches"
        : branchMap.get(branchScope ?? "") ?? "Assigned branch",
    pendingRows: rows.filter((row) => row.status === "pending_review"),
    profile,
    recentRows: rows.filter((row) => row.status !== "pending_review").slice(0, 12),
    summary: {
      cashVariance: cashDrawerRows.reduce((sum, row) => sum + toNumber(row.variance), 0),
      expectedCashToday: cashDrawerRows.reduce(
        (sum, row) => sum + toNumber(row.expected_cash),
        0,
      ),
      pendingApprovals: pendingApprovalsResponse.count ?? 0,
    },
    isLive: true,
  };
}

export async function getBranchDetailPageData(branchId: string): Promise<BranchDetailPageData> {
  if (!hasSupabaseEnv()) {
    const summary = emptyBranchSummary(branchId, "Branch");

    return {
      profile: emptyProfile("admin"),
      branch: {
        id: branchId,
        name: summary.branchName,
        managerName: "Unassigned",
        memberCount: summary.totalMembers,
        agentCount: summary.activeAgents,
        totalSavings: summary.totalSavings,
        totalDeposits: summary.totalDeposits,
        totalLoans: summary.totalLoans,
        outstandingPrincipal: summary.outstandingPrincipal,
        pendingApprovals: summary.pendingApprovals,
        cashVariance: summary.cashVariance,
      },
      summary,
      alerts: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin"]);

  const [{ branches, managerMap }, snapshot] = await Promise.all([
    getBranchMappings(supabase),
    getBranchDashboardSnapshot(supabase, branchId),
  ]);

  const branchMeta = branches.find((branch) => branch.id === branchId);
  const branch: BranchSummary = {
    id: snapshot.summary.branchId,
    name: branchMeta?.name ?? snapshot.summary.branchName,
    managerName:
      managerMap.get(branchMeta?.manager_profile_id ?? "") ?? "Unassigned",
    memberCount: snapshot.summary.totalMembers,
    agentCount: snapshot.summary.activeAgents,
    totalSavings: snapshot.summary.totalSavings,
    totalDeposits: snapshot.summary.totalDeposits,
    totalLoans: snapshot.summary.totalLoans,
    outstandingPrincipal: snapshot.summary.outstandingPrincipal,
    pendingApprovals: snapshot.summary.pendingApprovals,
    cashVariance: snapshot.summary.cashVariance,
  };

  return {
    profile,
    branch,
    summary: snapshot.summary,
    alerts: snapshot.alerts,
    isLive: true,
  };
}

export async function getReportsPageData(): Promise<ReportsPageData> {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("branch_manager"),
      branches: [],
      rows: [],
      currentBranchLabel: "Supabase setup needed",
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  let branchQuery = supabase.from("branches").select("id, name").order("name", { ascending: true });
  let jobsQuery = supabase
    .from("report_jobs")
    .select("id, branch_id, report_type, status, file_path, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (branchId) {
    branchQuery = branchQuery.eq("id", branchId);
    jobsQuery = jobsQuery.eq("branch_id", branchId);
  }

  const [{ data: branchRowsData }, { data: jobRowsData }] = await Promise.all([
    branchQuery,
    jobsQuery,
  ]);

  const branches = (((branchRowsData as { id: string; name: string }[] | null) ?? [])).map(
    (branch) => ({
      id: branch.id,
      name: branch.name,
    }),
  );
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));
  const rows = ((jobRowsData as ReportJobTableRow[] | null) ?? []).map((row) => ({
    id: row.id,
    branchName: row.branch_id ? branchMap.get(row.branch_id) ?? row.branch_id : "All branches",
    reportType: row.report_type,
    status: row.status,
    requestedAt: new Date(row.created_at).toLocaleString(),
    filePath: row.file_path,
  }));

  return {
    profile,
    branches,
    rows,
    currentBranchLabel:
      profile.role === "admin" ? "All branches" : branches[0]?.name ?? "Branch",
    isLive: true,
  };
}

export async function getAgentsPageData(): Promise<AgentsPageData> {
  if (!hasSupabaseEnv()) {
    return {
      currentBranchLabel: "Branch",
      profile: emptyProfile("branch_manager"),
      agents: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;
  const today = currentDateIso();

  let agentQuery = supabase
    .from("profiles")
    .select("id, full_name, phone, branch_id, is_active")
    .eq("role", "agent")
    .order("full_name", { ascending: true });

  if (branchId) {
    agentQuery = agentQuery.eq("branch_id", branchId);
  }

  const { data: agentData } = await agentQuery;
  const agents = (agentData as ProfileRow[] | null) ?? [];
  const agentIds = agents.map((agent) => agent.id);
  const branchIds = Array.from(
    new Set(
      agents
        .map((agent) => agent.branch_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [
    { data: branchRows },
    { data: memberProfileRows },
    { data: todayTransactionRows },
    { data: pendingTransactionRows },
    { data: cashRowsData },
  ] = await Promise.all([
    branchIds.length
      ? supabase.from("branches").select("id, name").in("id", branchIds)
      : Promise.resolve({ data: [] as BranchRow[] }),
    agentIds.length
      ? supabase
          .from("member_profiles")
          .select(
            "profile_id, branch_id, assigned_agent_id, status, occupation, residential_address",
          )
          .in("assigned_agent_id", agentIds)
      : Promise.resolve({ data: [] as MemberProfileRegistryRow[] }),
    agentIds.length
      ? supabase
          .from("transaction_requests")
          .select(
            "id, branch_id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, note, status, created_at",
          )
          .in("agent_profile_id", agentIds)
          .gte("created_at", `${today}T00:00:00.000Z`)
      : Promise.resolve({ data: [] as TransactionRow[] }),
    agentIds.length
      ? supabase
          .from("transaction_requests")
          .select("id, branch_id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, note, status, created_at")
          .in("agent_profile_id", agentIds)
          .eq("status", "pending_approval")
      : Promise.resolve({ data: [] as TransactionRow[] }),
    agentIds.length
      ? supabase
          .from("cash_drawers")
          .select("branch_id, agent_profile_id, expected_cash, variance")
          .in("agent_profile_id", agentIds)
          .eq("business_date", today)
      : Promise.resolve({ data: [] as CashDrawerRow[] }),
  ]);

  const branchMap = new Map(
    ((branchRows as BranchRow[] | null) ?? []).map((branch) => [branch.id, branch.name]),
  );
  const assignedMembers = (memberProfileRows as MemberProfileRegistryRow[] | null) ?? [];
  const todayTransactions = (todayTransactionRows as TransactionRow[] | null) ?? [];
  const pendingTransactions = (pendingTransactionRows as TransactionRow[] | null) ?? [];
  const cashRows = (cashRowsData as CashDrawerRow[] | null) ?? [];

  return {
    currentBranchLabel: await getCurrentBranchLabel(supabase, profile),
    profile,
    agents: agents.map((agent) => ({
      id: agent.id,
      fullName: agent.full_name,
      branchName: agent.branch_id ? branchMap.get(agent.branch_id) ?? agent.branch_id : "Unassigned",
      phone: agent.phone ?? "No phone",
      status: agent.is_active ? "active" : "inactive",
      assignedMemberCount: assignedMembers.filter(
        (member) => member.assigned_agent_id === agent.id,
      ).length,
      collectionsToday: todayTransactions
        .filter((transaction) => transaction.agent_profile_id === agent.id)
        .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0),
      pendingApprovals: pendingTransactions.filter(
        (transaction) => transaction.agent_profile_id === agent.id,
      ).length,
      cashVariance: cashRows
        .filter((cash) => cash.agent_profile_id === agent.id)
        .reduce((sum, cash) => sum + toNumber(cash.variance), 0),
    })),
    isLive: true,
  };
}

export async function getMembersPageData(): Promise<MembersPageData> {
  if (!hasSupabaseEnv()) {
    return {
      currentBranchLabel: "Branch",
      profile: emptyProfile("branch_manager"),
      members: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  let query = supabase
    .from("member_profiles")
    .select(
      "profile_id, branch_id, assigned_agent_id, status, occupation, residential_address",
    )
    .order("profile_id", { ascending: true });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data: memberProfileData } = await query;
  const memberProfiles = (memberProfileData as MemberProfileRegistryRow[] | null) ?? [];
  const memberIds = memberProfiles.map((member) => member.profile_id);
  const agentIds = Array.from(
    new Set(
      memberProfiles
        .map((member) => member.assigned_agent_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const branchIds = Array.from(new Set(memberProfiles.map((member) => member.branch_id)));

  const [{ data: memberRows }, { data: agentRows }, { data: branchRows }] = await Promise.all([
    memberIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name, phone, created_at")
          .in("id", memberIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    agentIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", agentIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    branchIds.length
      ? supabase.from("branches").select("id, name").in("id", branchIds)
      : Promise.resolve({ data: [] as BranchRow[] }),
  ]);

  const memberMap = new Map(
    ((memberRows as ProfileRow[] | null) ?? []).map((row) => [row.id, row]),
  );
  const agentMap = new Map(
    ((agentRows as ProfileRow[] | null) ?? []).map((row) => [row.id, row.full_name]),
  );
  const branchMap = new Map(
    ((branchRows as BranchRow[] | null) ?? []).map((row) => [row.id, row.name]),
  );

  return {
    currentBranchLabel: await getCurrentBranchLabel(supabase, profile),
    profile,
    members: memberProfiles.map((member) => {
      const memberRow = memberMap.get(member.profile_id);

      return {
        id: member.profile_id,
        fullName: memberRow?.full_name ?? member.profile_id,
        agentId: member.assigned_agent_id,
        agentName: agentMap.get(member.assigned_agent_id ?? "") ?? "Unassigned",
        branchName: branchMap.get(member.branch_id) ?? member.branch_id,
        createdAt: memberRow?.created_at ?? null,
        phone: memberRow?.phone ?? "No phone",
        status: member.status,
        occupation: member.occupation,
        address: member.residential_address,
      };
    }),
    isLive: true,
  };
}

export async function getMemberDetailPageData(memberId: string): Promise<MemberDetailPageData> {
  if (!hasSupabaseEnv()) {
    return {
      currentBranchLabel: "Branch",
      profile: emptyProfile("branch_manager"),
      member: null,
      accounts: [],
      recentTransactions: [],
      activityTrend: buildActivityTrend([]),
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const currentBranchLabel = await getCurrentBranchLabel(supabase, profile);

  let memberQuery = supabase
    .from("member_profiles")
    .select(
      "profile_id, branch_id, assigned_agent_id, status, occupation, residential_address",
    )
    .eq("profile_id", memberId);

  if (profile.role === "branch_manager" && profile.branch_id) {
    memberQuery = memberQuery.eq("branch_id", profile.branch_id);
  }

  const { data: memberProfileData } = await memberQuery.maybeSingle();
  const memberProfile = (memberProfileData as MemberProfileRegistryRow | null) ?? null;

  if (!memberProfile) {
    return {
      currentBranchLabel,
      profile,
      member: null,
      accounts: [],
      recentTransactions: [],
      activityTrend: buildActivityTrend([]),
      isLive: true,
    };
  }

  const [
    { data: memberRow },
    { data: agentRow },
    { data: branchRow },
    { data: accountRowsData },
    { data: transactionRowsData },
    pendingTransactionsResult,
    { data: loanRowsData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .eq("id", memberId)
      .maybeSingle(),
    memberProfile.assigned_agent_id
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", memberProfile.assigned_agent_id)
          .maybeSingle()
      : Promise.resolve({ data: null as ProfileRow | null }),
    supabase.from("branches").select("id, name").eq("id", memberProfile.branch_id).maybeSingle(),
    supabase
      .from("member_accounts")
      .select("id, account_type, account_number, status")
      .eq("member_profile_id", memberId)
      .order("account_type", { ascending: true }),
    supabase
      .from("transaction_requests")
      .select(
        "id, branch_id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, note, status, created_at",
      )
      .eq("member_profile_id", memberId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("transaction_requests")
      .select("id", { count: "exact", head: true })
      .eq("member_profile_id", memberId)
      .eq("status", "pending_approval"),
    supabase
      .from("loans")
      .select("id, branch_id, member_profile_id, approved_principal, remaining_principal, monthly_interest_rate, status")
      .eq("member_profile_id", memberId),
  ]);

  const accounts = (accountRowsData as MemberAccountRow[] | null) ?? [];
  const accountDetails = await Promise.all(
    accounts.map(async (account) => {
      const { data, error } = await supabase.rpc("get_member_account_balance", {
        p_member_account_id: account.id,
      });

      if (error) {
        throw error;
      }

      return {
        id: account.id,
        accountType: account.account_type,
        accountNumber: account.account_number,
        status: account.status,
        balance: toNumber(data as number | string | null),
      };
    }),
  );

  const recentTransactions = await mapTransactions(
    supabase,
    (transactionRowsData as TransactionRow[] | null) ?? [],
  );
  const loans = (loanRowsData as LoanRow[] | null) ?? [];
  const memberCards = summarizeMemberDetailCards(
    accountDetails,
    loans.map((loan) => ({
      remainingPrincipal: toNumber(loan.remaining_principal),
    })),
  );

  return {
    currentBranchLabel,
    profile,
    member: {
      id: memberProfile.profile_id,
      fullName: (memberRow as ProfileRow | null)?.full_name ?? memberProfile.profile_id,
      agentId: memberProfile.assigned_agent_id,
      agentName: (agentRow as ProfileRow | null)?.full_name ?? "Unassigned",
      branchName: (branchRow as BranchRow | null)?.name ?? memberProfile.branch_id,
      createdAt: (memberRow as ProfileRow | null)?.created_at ?? null,
      phone: (memberRow as ProfileRow | null)?.phone ?? "No phone",
      status: memberProfile.status,
      occupation: memberProfile.occupation,
      address: memberProfile.residential_address,
      activeLoanCount: memberCards.activeLoanCount,
      outstandingLoanBalance: memberCards.outstandingLoanBalance,
      pendingTransactions: pendingTransactionsResult.count ?? 0,
      savingsBalance: memberCards.savingsBalance,
      depositBalance: memberCards.depositBalance,
    },
    accounts: accountDetails,
    recentTransactions,
    activityTrend: buildActivityTrend(recentTransactions),
    isLive: true,
  };
}

export async function getAgentDetailPageData(agentId: string): Promise<AgentDetailPageData> {
  if (!hasSupabaseEnv()) {
    return {
      currentBranchLabel: "Branch",
      profile: emptyProfile("branch_manager"),
      agent: null,
      members: [],
      recentTransactions: [],
      activityTrend: buildActivityTrend([]),
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const currentBranchLabel = await getCurrentBranchLabel(supabase, profile);
  const today = currentDateIso();

  let agentQuery = supabase
    .from("profiles")
    .select("id, full_name, phone, branch_id, is_active")
    .eq("id", agentId)
    .eq("role", "agent");

  if (profile.role === "branch_manager" && profile.branch_id) {
    agentQuery = agentQuery.eq("branch_id", profile.branch_id);
  }

  const { data: agentRowData } = await agentQuery.maybeSingle();
  const agentRow = (agentRowData as ProfileRow | null) ?? null;

  if (!agentRow) {
    return {
      currentBranchLabel,
      profile,
      agent: null,
      members: [],
      recentTransactions: [],
      activityTrend: buildActivityTrend([]),
      isLive: true,
    };
  }

  const [
    { data: branchRow },
    { data: memberProfileRowsData },
    { data: memberRowsData },
    { data: transactionRowsData },
    pendingTransactionsResult,
    { data: cashRowsData },
  ] = await Promise.all([
    agentRow.branch_id
      ? supabase.from("branches").select("id, name").eq("id", agentRow.branch_id).maybeSingle()
      : Promise.resolve({ data: null as BranchRow | null }),
    supabase
      .from("member_profiles")
      .select(
        "profile_id, branch_id, assigned_agent_id, status, occupation, residential_address",
      )
      .eq("assigned_agent_id", agentId)
      .order("profile_id", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("role", "member"),
    supabase
      .from("transaction_requests")
      .select(
        "id, branch_id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, note, status, created_at",
      )
      .eq("agent_profile_id", agentId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("transaction_requests")
      .select("id", { count: "exact", head: true })
      .eq("agent_profile_id", agentId)
      .eq("status", "pending_approval"),
    supabase
      .from("cash_drawers")
      .select("branch_id, agent_profile_id, expected_cash, variance")
      .eq("agent_profile_id", agentId)
      .eq("business_date", today),
  ]);

  const memberProfiles = (memberProfileRowsData as MemberProfileRegistryRow[] | null) ?? [];
  const memberRows = (memberRowsData as ProfileRow[] | null) ?? [];
  const memberMap = new Map(memberRows.map((member) => [member.id, member]));
  const recentTransactions = await mapTransactions(
    supabase,
    (transactionRowsData as TransactionRow[] | null) ?? [],
  );
  const collectionsTotal = recentTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const collectionsToday = recentTransactions
    .filter((transaction) => transaction.createdAt.startsWith(today))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const cashRows = (cashRowsData as CashDrawerRow[] | null) ?? [];

  return {
    currentBranchLabel,
    profile,
    agent: {
      id: agentRow.id,
      fullName: agentRow.full_name,
      branchName: (branchRow as BranchRow | null)?.name ?? agentRow.branch_id ?? "Unassigned",
      phone: agentRow.phone ?? "No phone",
      status: agentRow.is_active ? "active" : "inactive",
      assignedMemberCount: memberProfiles.length,
      collectionsTotal,
      collectionsToday,
      pendingApprovals: pendingTransactionsResult.count ?? 0,
      cashVariance: cashRows.reduce((sum, cash) => sum + toNumber(cash.variance), 0),
    },
    members: memberProfiles.map((member) => {
      const memberRow = memberMap.get(member.profile_id);

      return {
        id: member.profile_id,
        fullName: memberRow?.full_name ?? member.profile_id,
        agentId: member.assigned_agent_id,
        agentName: agentRow.full_name,
        branchName: (branchRow as BranchRow | null)?.name ?? member.branch_id,
        createdAt: memberRow?.created_at ?? null,
        phone: memberRow?.phone ?? "No phone",
        status: member.status,
        occupation: member.occupation,
        address: member.residential_address,
      };
    }),
    recentTransactions,
    activityTrend: buildActivityTrend(recentTransactions),
    isLive: true,
  };
}

export async function getManagersPageData(): Promise<ManagersPageData> {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("admin"),
      managers: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin"]);
  const [{ data: managerRowsData }, { data: branchRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, branch_id, is_active")
      .eq("role", "branch_manager")
      .order("full_name", { ascending: true }),
    supabase.from("branches").select("id, name"),
  ]);

  const branchMap = new Map(
    ((branchRows as BranchRow[] | null) ?? []).map((branch) => [branch.id, branch.name]),
  );

  return {
    profile,
    managers: ((managerRowsData as ProfileRow[] | null) ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      branchName: row.branch_id ? branchMap.get(row.branch_id) ?? row.branch_id : "Unassigned",
      phone: row.phone ?? "No phone",
      status: row.is_active ? "active" : "inactive",
    })),
    isLive: true,
  };
}

export async function getManagerDetailPageData(
  managerId: string,
): Promise<ManagerDetailPageData> {
  if (!hasSupabaseEnv()) {
    return {
      currentBranchLabel: "All branches",
      profile: emptyProfile("admin"),
      manager: null,
      branch: null,
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin"]);
  const { data: managerRowData } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, branch_id, is_active")
    .eq("id", managerId)
    .eq("role", "branch_manager")
    .maybeSingle();

  const managerRow = (managerRowData as ProfileRow | null) ?? null;

  if (!managerRow) {
    return {
      currentBranchLabel: "All branches",
      profile,
      manager: null,
      branch: null,
      isLive: true,
    };
  }

  let branch: BranchSummary | null = null;

  if (managerRow.branch_id) {
    const [{ branches, managerMap }, snapshot] = await Promise.all([
      getBranchMappings(supabase),
      getBranchDashboardSnapshot(supabase, managerRow.branch_id),
    ]);

    const branchMeta = branches.find((item) => item.id === managerRow.branch_id);
    branch = {
      id: snapshot.summary.branchId,
      name: branchMeta?.name ?? snapshot.summary.branchName,
      managerName:
        managerMap.get(branchMeta?.manager_profile_id ?? "") ?? managerRow.full_name,
      memberCount: snapshot.summary.totalMembers,
      agentCount: snapshot.summary.activeAgents,
      totalSavings: snapshot.summary.totalSavings,
      totalDeposits: snapshot.summary.totalDeposits,
      totalLoans: snapshot.summary.totalLoans,
      outstandingPrincipal: snapshot.summary.outstandingPrincipal,
      pendingApprovals: snapshot.summary.pendingApprovals,
      cashVariance: snapshot.summary.cashVariance,
    };
  }

  return {
    currentBranchLabel: "All branches",
    profile,
    manager: {
      id: managerRow.id,
      branchId: managerRow.branch_id,
      branchName: branch?.name ?? "Unassigned",
      email: managerRow.email ?? null,
      fullName: managerRow.full_name,
      phone: managerRow.phone ?? "No phone",
      status: managerRow.is_active ? "active" : "inactive",
    },
    branch,
    isLive: true,
  };
}

export async function getLoansPageData(): Promise<LoansPageData> {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("branch_manager"),
      applications: [],
      loans: [],
      summary: {
        dueThisWeek: 0,
        interestDue: 0,
        outstandingPrincipal: 0,
        overdueLoans: 0,
        totalPortfolio: 0,
      },
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  let loanQuery = supabase
    .from("loans")
    .select(
      "id, application_id, branch_id, member_profile_id, approved_principal, remaining_principal, monthly_interest_rate, status, disbursed_at, created_at",
    )
    .order("created_at", { ascending: false });
  let applicationQuery = supabase
    .from("loan_applications")
    .select(
      "id, branch_id, member_profile_id, requested_amount, monthly_interest_rate, term_months, collateral_required, collateral_notes, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (branchId) {
    loanQuery = loanQuery.eq("branch_id", branchId);
    applicationQuery = applicationQuery.eq("branch_id", branchId);
  }

  const [{ data: loanData }, { data: applicationData }] = await Promise.all([
    loanQuery,
    applicationQuery,
  ]);
  const loans = (loanData as LoanRow[] | null) ?? [];
  const applications = (applicationData as LoanApplicationRow[] | null) ?? [];
  const loanIds = loans.map((loan) => loan.id).filter((value): value is string => Boolean(value));
  const { data: repaymentData } = loanIds.length
    ? await supabase
        .from("loan_repayments")
        .select("loan_id, created_at, branch_id, interest_component")
        .in("loan_id", loanIds)
        .order("created_at", { ascending: false })
    : { data: [] as RepaymentRow[] };
  const repaymentCountsByLoanId = getRepaymentCountsByLoanId(
    (repaymentData as RepaymentRow[] | null) ?? [],
  );
  const memberIds = Array.from(
    new Set(
      [...loans.map((loan) => loan.member_profile_id), ...applications.map((application) => application.member_profile_id)]
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] as ProfileRow[] };
  const memberMap = new Map(
    ((memberRows as ProfileRow[] | null) ?? []).map((row) => [row.id, row.full_name]),
  );
  const branchIds = Array.from(
    new Set(
      [...loans.map((loan) => loan.branch_id), ...applications.map((application) => application.branch_id)]
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const { data: branchRows } = branchIds.length
    ? await supabase.from("branches").select("id, name").in("id", branchIds)
    : { data: [] as BranchRow[] };
  const branchMap = new Map(
    ((branchRows as BranchRow[] | null) ?? []).map((row) => [row.id, row.name]),
  );

  const loanRows = loans.map((loan) => {
    const remainingPrincipal = toNumber(loan.remaining_principal);
    const monthlyInterestRate = toNumber(loan.monthly_interest_rate);
    const repaymentCount = repaymentCountsByLoanId.get(loan.id ?? "") ?? 0;
    const paymentSummary = getLoanPaymentSummary(loan, repaymentCount);
    const nextInterestDue = calculateMonthlyInterest(remainingPrincipal, monthlyInterestRate);

    return {
      id: loan.id ?? "loan",
      applicationId: loan.application_id,
      branchId: loan.branch_id,
      branchName: branchMap.get(loan.branch_id) ?? "Unknown branch",
      memberId: loan.member_profile_id ?? "",
      memberName: memberMap.get(loan.member_profile_id ?? "") ?? "Unknown member",
      approvedPrincipal: toNumber(loan.approved_principal),
      remainingPrincipal,
      monthlyInterestRate,
      nextInterestDue,
      repaymentCount,
      riskLabel: getLoanRiskLabel(paymentSummary.isOverdue, paymentSummary.nextDueAt),
      isOverdue: paymentSummary.isOverdue,
      nextDueAt: paymentSummary.nextDueAt,
      nextDueLabel: paymentSummary.nextDueLabel,
      status: paymentSummary.effectiveStatus,
      disbursedAt: loan.disbursed_at,
      createdAt: loan.created_at,
    };
  });

  return {
    profile,
    applications: applications.map((application) => ({
      id: application.id,
      branchId: application.branch_id,
      branchName: branchMap.get(application.branch_id) ?? "Unknown branch",
      memberName: memberMap.get(application.member_profile_id) ?? "Unknown member",
      requestedAmount: toNumber(application.requested_amount),
      monthlyInterestRate: toNumber(application.monthly_interest_rate),
      termMonths: Number(application.term_months ?? 0),
      collateralRequired: Boolean(application.collateral_required),
      collateralNotes: application.collateral_notes,
      status: application.status,
      createdAt: application.created_at,
    })),
    loans: loanRows,
    summary: {
      dueThisWeek: loanRows.filter((loan) => loan.riskLabel === "Medium").length,
      interestDue: loanRows.reduce((sum, loan) => sum + loan.nextInterestDue, 0),
      outstandingPrincipal: loanRows.reduce((sum, loan) => sum + loan.remainingPrincipal, 0),
      overdueLoans: loanRows.filter((loan) => loan.isOverdue).length,
      totalPortfolio: loanRows.reduce((sum, loan) => sum + loan.approvedPrincipal, 0),
    },
    isLive: true,
  };
}

export async function getLoanDetailPageData(loanId: string): Promise<LoanDetailPageData> {
  if (!hasSupabaseEnv()) {
    return {
      currentBranchLabel: "Branch",
      profile: emptyProfile("branch_manager"),
      loan: null,
      repayments: [],
      schedule: [],
      auditEvents: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  let loanQuery = supabase
    .from("loans")
    .select(
      "id, application_id, branch_id, member_profile_id, approved_principal, remaining_principal, monthly_interest_rate, status, disbursed_at, created_at",
    )
    .eq("id", loanId);

  if (branchId) {
    loanQuery = loanQuery.eq("branch_id", branchId);
  }

  const { data: loanData } = await loanQuery.maybeSingle();
  const loan = (loanData as LoanRow | null) ?? null;

  if (!loan) {
    return {
      currentBranchLabel: profile.role === "admin" ? "All branches" : "Branch",
      profile,
      loan: null,
      repayments: [],
      schedule: [],
      auditEvents: [],
      isLive: true,
    };
  }

  const [
    { data: applicationData },
    { data: repaymentData },
    { data: memberData },
    { data: memberProfileData },
    { data: branchData },
    { data: auditData },
  ] = await Promise.all([
    supabase
      .from("loan_applications")
      .select("id, branch_id, member_profile_id, requested_amount, monthly_interest_rate, term_months, collateral_required, collateral_notes, status, created_at")
      .eq("id", loan.application_id)
      .maybeSingle(),
    supabase
      .from("loan_repayments")
      .select("id, loan_id, branch_id, amount, repayment_mode, interest_component, principal_component, created_by, approved_by, created_at")
      .eq("loan_id", loan.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", loan.member_profile_id ?? "")
      .maybeSingle(),
    supabase
      .from("member_profiles")
      .select("profile_id, sign_in_code")
      .eq("profile_id", loan.member_profile_id ?? "")
      .maybeSingle(),
    supabase
      .from("branches")
      .select("id, name")
      .eq("id", loan.branch_id)
      .maybeSingle(),
    supabase
      .from("audit_logs")
      .select("id, actor_id, action, created_at")
      .eq("entity_id", loan.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const application = (applicationData as LoanApplicationRow | null) ?? null;
  const repayments = (repaymentData as RepaymentRow[] | null) ?? [];
  const member = (memberData as Pick<ProfileRow, "id" | "full_name"> | null) ?? null;
  const memberProfile = (memberProfileData as { sign_in_code: string | null } | null) ?? null;
  const branch = (branchData as Pick<BranchRow, "id" | "name"> | null) ?? null;
  const actorIds = Array.from(
    new Set(
      [
        ...repayments.flatMap((row) => [row.created_by, row.approved_by]),
        ...(((auditData as { actor_id: string | null }[] | null) ?? []).map((row) => row.actor_id)),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const { data: actorData } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as Pick<ProfileRow, "id" | "full_name">[] };
  const actorMap = new Map(
    ((actorData as Pick<ProfileRow, "id" | "full_name">[] | null) ?? []).map((row) => [
      row.id,
      row.full_name,
    ]),
  );
  const repaymentCountsByLoanId = getRepaymentCountsByLoanId(repayments);
  const paymentSummary = getLoanPaymentSummary(
    loan,
    repaymentCountsByLoanId.get(loan.id ?? "") ?? 0,
  );
  const remainingPrincipal = toNumber(loan.remaining_principal);
  const monthlyInterestRate = toNumber(loan.monthly_interest_rate);
  const loanRow: LoanDetailPageData["loan"] = {
    id: loan.id ?? "loan",
    applicationId: loan.application_id,
    applicationStatus: application?.status ?? null,
    branchId: loan.branch_id,
    branchName: branch?.name ?? "Unknown branch",
    collateralNotes: application?.collateral_notes ?? null,
    collateralRequired: Boolean(application?.collateral_required),
    createdAt: loan.created_at,
    disbursedAt: loan.disbursed_at,
    approvedPrincipal: toNumber(loan.approved_principal),
    memberId: loan.member_profile_id ?? "",
    memberName: member?.full_name ?? "Unknown member",
    monthlyInterestRate,
    nextDueAt: paymentSummary.nextDueAt,
    nextDueLabel: paymentSummary.nextDueLabel,
    nextInterestDue: calculateMonthlyInterest(remainingPrincipal, monthlyInterestRate),
    remainingPrincipal,
    repaymentCount: repayments.length,
    requestedAmount: toNumber(application?.requested_amount),
    riskLabel: getLoanRiskLabel(paymentSummary.isOverdue, paymentSummary.nextDueAt),
    isOverdue: paymentSummary.isOverdue,
    signInCode: memberProfile?.sign_in_code ?? null,
    status: paymentSummary.effectiveStatus,
    termMonths: Number(application?.term_months ?? 12),
  };

  return {
    currentBranchLabel: profile.role === "admin" ? "All branches" : loanRow.branchName,
    profile,
    loan: loanRow,
    repayments: repayments.map((repayment) => ({
      id: repayment.id ?? `${loan.id}-${repayment.created_at}`,
      amount: toNumber(repayment.amount),
      createdAt: repayment.created_at ?? loan.created_at,
      dateLabel: formatShortDate(repayment.created_at ?? loan.created_at),
      interestComponent: toNumber(repayment.interest_component),
      principalComponent: toNumber(repayment.principal_component),
      recordedBy:
        actorMap.get(repayment.approved_by ?? "") ??
        actorMap.get(repayment.created_by ?? "") ??
        "System",
      repaymentMode: repayment.repayment_mode === "interest_only"
        ? "Interest only"
        : "Interest plus principal",
    })),
    schedule: getLoanScheduleRows(loan, repayments, loanRow.termMonths),
    auditEvents: ((auditData as { id: string; action: string; actor_id: string | null; created_at: string }[] | null) ?? [])
      .map((row) => ({
        id: row.id,
        action: row.action,
        actor: row.actor_id ? actorMap.get(row.actor_id) ?? "Unknown actor" : "System",
        time: formatDateTime(row.created_at),
      })),
    isLive: true,
  };
}

export async function getAuditPageData(): Promise<AuditPageData> {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("admin"),
      rows: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const { data: auditData } = await supabase
    .from("audit_logs")
    .select("actor_id, action, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  const rows = (auditData as AuditLogTableRow[] | null) ?? [];
  const actorIds = Array.from(
    new Set(rows.map((row) => row.actor_id).filter((value): value is string => Boolean(value))),
  );
  const { data: actorRows } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as ProfileRow[] };
  const actorMap = new Map(
    ((actorRows as ProfileRow[] | null) ?? []).map((row) => [row.id, row.full_name]),
  );

  return {
    profile,
    rows: rows.map((row) => ({
      time: formatDateTime(row.created_at),
      actor: row.actor_id ? actorMap.get(row.actor_id) ?? row.actor_id : "System",
      action: row.action,
      reference: row.entity_id,
      result: "Recorded",
    })),
    isLive: true,
  };
}

export async function getFraudPageData(context?: DashboardAuthContext): Promise<FraudPageData> {
  const rules = FRAUD_RULES.map((rule) => ({
    description: rule.description,
    id: rule.id,
    severity: rule.severity,
    summaryLabel: rule.summaryLabel,
    thresholdLabel: rule.thresholdLabel,
    title: rule.title,
  }));

  if (!hasSupabaseEnv()) {
    return {
      branchRisk: [],
      currentBranchLabel: "Supabase setup needed",
      investigationQueue: [],
      isLive: false,
      profile: emptyProfile("admin"),
      rules,
      summary: {
        averageApprovalSeconds: 0,
        highRiskTransactions: 0,
        multiDeviceFlags: 0,
        offlineBurstCases: 0,
        openAlerts: 0,
      },
      topAgents: [],
      trend: [],
    };
  }

  const { supabase, profile } = await getDashboardAuthContext(
    ["admin", "branch_manager"],
    context,
  );
  const currentBranchLabel = await getCurrentBranchLabel(supabase, profile);
  const alertRowsPromise = (async () => {
    const rows: FraudAlertTableRow[] = [];

    for (let page = 0; ; page += 1) {
      const from = page * FRAUD_ALERT_PAGE_SIZE;
      const to = from + FRAUD_ALERT_PAGE_SIZE - 1;
      const alertQuery = supabase
        .from("fraud_alerts")
        .select(FRAUD_ALERT_SELECT)
        .order("last_seen_at", { ascending: false })
        .range(from, to);

      const scopedAlertQuery =
        profile.role === "branch_manager" && profile.branch_id
          ? alertQuery.eq("branch_id", profile.branch_id)
          : alertQuery;

      const pageRows = readSupabaseRows<FraudAlertTableRow>(
        await scopedAlertQuery,
        "Load fraud alerts",
      );

      rows.push(...pageRows);

      if (pageRows.length < FRAUD_ALERT_PAGE_SIZE) {
        return rows;
      }
    }
  })();

  const approvalTimeQuery = supabase
    .from("transaction_requests")
    .select("created_at, approved_at")
    .eq("status", "approved")
    .not("approved_at", "is", null)
    .order("approved_at", { ascending: false })
    .limit(100);

  const scopedApprovalTimeQuery =
    profile.role === "branch_manager" && profile.branch_id
      ? approvalTimeQuery.eq("branch_id", profile.branch_id)
      : approvalTimeQuery;

  const [alertRows, approvalResult, { branches }] = await Promise.all([
    alertRowsPromise,
    scopedApprovalTimeQuery,
    getBranchMappings(supabase),
  ]);

  const approvalRows = readSupabaseRows<{
    approved_at: string | null;
    created_at: string;
  }>(approvalResult, "Load fraud approval timings");
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));
  const profileIds = Array.from(
    new Set(
      alertRows.flatMap((row) =>
        [row.agent_profile_id, row.member_profile_id, row.assigned_to].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  );
  const profileMap = await getProfileNameMap(supabase, profileIds);

  const alerts: FraudQueueRow[] = alertRows.map((row) => ({
    agentName: row.agent_profile_id ? profileMap.get(row.agent_profile_id) ?? row.agent_profile_id : null,
    agentProfileId: row.agent_profile_id,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to ? profileMap.get(row.assigned_to) ?? row.assigned_to : null,
    branchId: row.branch_id,
    branchName: branchMap.get(row.branch_id) ?? row.branch_id,
    cashReconciliationId: row.cash_reconciliation_id,
    detectedAt: row.detected_at,
    evidence: row.evidence ?? {},
    fingerprint: row.fingerprint,
    id: row.id,
    lastSeenAt: row.last_seen_at,
    memberName: row.member_profile_id ? profileMap.get(row.member_profile_id) ?? row.member_profile_id : null,
    memberProfileId: row.member_profile_id,
    resolutionNote: row.resolution_note,
    resolvedAt: row.resolved_at,
    ruleId: row.rule_id,
    score: toNumber(row.score),
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    title: row.title,
    transactionRequestId: row.transaction_request_id,
  }));

  const activeAlerts = alerts.filter(
    (row) => row.status === "open" || row.status === "investigating",
  );
  const approvalDurations = approvalRows
    .map((row) => {
      if (!row.approved_at) {
        return null;
      }

      const seconds = Math.round(
        (new Date(row.approved_at).getTime() - new Date(row.created_at).getTime()) / 1000,
      );
      return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
    })
    .filter((value): value is number => value !== null);

  const summary: FraudDashboardSummary = {
    averageApprovalSeconds:
      approvalDurations.length > 0
        ? Math.round(
            approvalDurations.reduce((sum, value) => sum + value, 0) / approvalDurations.length,
          )
        : 0,
    highRiskTransactions: activeAlerts.filter(
      (row) => row.transactionRequestId && row.score >= 85,
    ).length,
    multiDeviceFlags: activeAlerts.filter((row) => row.ruleId === "multi_device_access").length,
    offlineBurstCases: activeAlerts.filter((row) => row.ruleId === "offline_transaction_burst").length,
    openAlerts: activeAlerts.length,
  };

  const branchRisk = Array.from(
    activeAlerts.reduce((map, row) => {
      const current = map.get(row.branchId) ?? {
        branchId: row.branchId,
        branchName: row.branchName,
        highCount: 0,
        investigatingCount: 0,
        openCount: 0,
        totalScore: 0,
      };

      current.totalScore += row.score;

      if (row.score >= 85) {
        current.highCount += 1;
      }

      if (row.status === "investigating") {
        current.investigatingCount += 1;
      }

      if (row.status === "open") {
        current.openCount += 1;
      }

      map.set(row.branchId, current);
      return map;
    }, new Map<string, FraudBranchRiskRow>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.totalScore - left.totalScore);

  const topAgents = Array.from(
    activeAlerts.reduce((map, row) => {
      if (!row.agentProfileId) {
        return map;
      }

      const current = map.get(row.agentProfileId) ?? {
        agentId: row.agentProfileId,
        agentName: row.agentName ?? row.agentProfileId,
        alertCount: 0,
        branchName: row.branchName,
        highestScore: 0,
        latestDetectedAt: row.lastSeenAt,
      };

      current.alertCount += 1;
      current.highestScore = Math.max(current.highestScore, row.score);

      if (new Date(row.lastSeenAt).getTime() > new Date(current.latestDetectedAt).getTime()) {
        current.latestDetectedAt = row.lastSeenAt;
      }

      map.set(row.agentProfileId, current);
      return map;
    }, new Map<string, FraudAgentRiskRow>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => {
      if (right.highestScore !== left.highestScore) {
        return right.highestScore - left.highestScore;
      }

      return right.alertCount - left.alertCount;
    })
    .slice(0, 8);

  const investigationQueue = [...activeAlerts]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime();
    })
    .slice(0, 12);

  return {
    branchRisk,
    currentBranchLabel,
    investigationQueue,
    isLive: true,
    profile,
    rules,
    summary,
    topAgents: topAgents.map((row) => ({
      ...row,
      latestDetectedAt: formatDateTime(row.latestDetectedAt),
    })),
    trend: buildFraudTrend(alerts),
  };
}
