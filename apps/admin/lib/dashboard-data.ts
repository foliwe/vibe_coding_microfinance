import {
  calculateMonthlyInterest,
  type AdminDashboardSummary,
  type AgentPerformance,
  type BranchSummary,
  type BranchDashboardSummary,
  type LoanStatus,
  type TransactionRequest,
  type UserRole,
} from "@credit-union/shared";

import { requireRole, type AdminProfile } from "./auth";
import { hasSupabaseEnv } from "./supabase/env";

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

export type AdminDashboardCharts = {
  branchPerformance: BranchPerformanceChartPoint[];
  portfolioTrend: PortfolioTrendChartPoint[];
};

export type TransactionQueuePageData = {
  profile: AdminProfile;
  branchLabel: string;
  transactions: TransactionRequest[];
  isLive: boolean;
};

export type MemberRegistryRow = {
  id: string;
  fullName: string;
  agentName: string;
  branchName: string;
  phone: string;
  status: string;
  occupation: string | null;
  address: string | null;
};

export type MembersPageData = {
  profile: AdminProfile;
  members: MemberRegistryRow[];
  isLive: boolean;
};

export type UserRegistryRow = {
  id: string;
  fullName: string;
  role: UserRole;
  branchName: string;
  status: string;
};

export type UsersPageData = {
  profile: AdminProfile;
  users: UserRegistryRow[];
  isLive: boolean;
};

export type LoanRegistryRow = {
  id: string;
  memberName: string;
  approvedPrincipal: number;
  remainingPrincipal: number;
  monthlyInterestRate: number;
  nextInterestDue: number;
  status: LoanStatus;
};

export type LoansPageData = {
  profile: AdminProfile;
  loans: LoanRegistryRow[];
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
  full_name: string;
  phone?: string | null;
  role?: UserRole;
  branch_id: string | null;
  is_active?: boolean;
  created_at?: string;
};

type LoanRow = {
  id?: string;
  branch_id: string;
  member_profile_id?: string;
  approved_principal: number | string | null;
  remaining_principal: number | string | null;
  monthly_interest_rate?: number | string | null;
  status: LoanStatus;
};

type RepaymentRow = {
  branch_id: string;
  interest_component: number | string | null;
};

type CashDrawerRow = {
  branch_id: string;
  agent_profile_id: string;
  expected_cash: number | string | null;
  variance: number | string | null;
};

type TransactionRow = {
  id: string;
  branch_id: string;
  member_profile_id: string;
  agent_profile_id: string;
  transaction_type: TransactionRequest["type"];
  amount: number | string | null;
  status: TransactionRequest["status"];
  created_at: string;
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

type ReportJobTableRow = {
  id: string;
  branch_id: string | null;
  report_type: string;
  status: string;
  file_path: string | null;
  created_at: string;
};

function emptyProfile(role: UserRole = "admin"): AdminProfile {
  return {
    id: `empty-${role}`,
    role,
    full_name: "Supabase not configured",
    email: null,
    branch_id: null,
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

async function getBranchMappings(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"]) {
  const { data: branchesData } = await supabase
    .from("branches")
    .select("id, name, manager_profile_id");

  const branches = (branchesData as BranchRow[] | null) ?? [];
  const managerIds = branches
    .map((branch) => branch.manager_profile_id)
    .filter((value): value is string => Boolean(value));

  const { data: managerData } = managerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", managerIds)
    : { data: [] as ProfileRow[] };

  const managerMap = new Map(
    ((managerData as ProfileRow[] | null) ?? []).map((profile) => [
      profile.id,
      profile.full_name,
    ]),
  );

  return { branches, managerMap };
}

async function getPendingTransactions(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  branchId?: string,
  limit = 5,
) {
  let query = supabase
    .from("transaction_requests")
    .select(
      "id, branch_id, member_profile_id, agent_profile_id, transaction_type, amount, status, created_at",
    )
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data } = await query;
  const rows = (data as TransactionRow[] | null) ?? [];

  const actorIds = Array.from(
    new Set(rows.flatMap((row) => [row.member_profile_id, row.agent_profile_id])),
  );
  const branchIds = Array.from(new Set(rows.map((row) => row.branch_id)));

  const { data: profileData } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds)
    : { data: [] as ProfileRow[] };
  const { data: branchData } = branchIds.length
    ? await supabase.from("branches").select("id, name").in("id", branchIds)
    : { data: [] as BranchRow[] };

  const profileMap = new Map(
    ((profileData as ProfileRow[] | null) ?? []).map((profile) => [
      profile.id,
      profile.full_name,
    ]),
  );
  const branchMap = new Map(
    ((branchData as BranchRow[] | null) ?? []).map((branch) => [branch.id, branch.name]),
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
      accountType: "savings",
      amount: toNumber(row.amount),
      status: row.status,
      createdAt: row.created_at,
    }),
  );
}

export async function getTransactionQueuePageData(): Promise<TransactionQueuePageData> {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("branch_manager"),
      branchLabel: "Supabase setup needed",
      transactions: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  const branchLabel =
    profile.role === "admin"
      ? "All branches"
      : (
          await supabase
            .from("branches")
            .select("name")
            .eq("id", profile.branch_id ?? "")
            .maybeSingle()
        ).data?.name ?? "Branch";

  return {
    profile,
    branchLabel,
    transactions: await getPendingTransactions(supabase, branchId, 25),
    isLive: true,
  };
}

export async function getAdminDashboardData() {
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

  const { supabase, profile } = await requireRole(["admin"]);

  const [{ data: branchRowsData }, { branches, managerMap }, { data: loanRowsData }, { data: repaymentRowsData }, { data: cashRowsData }] =
    await Promise.all([
      supabase.from("branch_dashboard_summary").select("*"),
      getBranchMappings(supabase),
      supabase.from("loans").select("branch_id, approved_principal, remaining_principal, status"),
      supabase.from("loan_repayments").select("branch_id, interest_component"),
      supabase.from("cash_drawers").select("branch_id, expected_cash, variance, agent_profile_id"),
    ]);

  const branchRows = (branchRowsData as BranchDashboardRow[] | null) ?? [];
  const loanRows = (loanRowsData as LoanRow[] | null) ?? [];
  const repaymentRows = (repaymentRowsData as RepaymentRow[] | null) ?? [];
  const cashRows = (cashRowsData as CashDrawerRow[] | null) ?? [];

  const branchPerformance = branchRows.map((row) => {
    const branchLoanRows = loanRows.filter((loan) => loan.branch_id === row.branch_id);
    const branchCashRows = cashRows.filter((cash) => cash.branch_id === row.branch_id);
    const branchMeta = branches.find((branch) => branch.id === row.branch_id);

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
    overdueLoans: loanRows.filter((loan) => loan.status === "defaulted").length,
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
    alerts: await getPendingTransactions(supabase),
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
    { data: branchRowsData },
    { data: branchData },
    { data: loanRowsData },
    { data: repaymentRowsData },
    { data: cashRowsData },
    { data: memberRowsData },
    { data: agentRowsData },
    { data: transactionRowsData },
  ] = await Promise.all([
    supabase.from("branch_dashboard_summary").select("*").eq("branch_id", branchId).single(),
    supabase.from("branches").select("id, name").eq("id", branchId).single(),
    supabase
      .from("loans")
      .select("branch_id, approved_principal, remaining_principal, status")
      .eq("branch_id", branchId),
    supabase
      .from("loan_repayments")
      .select("branch_id, interest_component")
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

  const row = (branchRowsData as BranchDashboardRow | null) ?? null;

  if (!row) {
    return {
      summary: emptyBranchSummary(
        branchId,
        ((branchData as BranchRow | null)?.name ?? "Branch"),
      ),
      alerts: [],
    };
  }

  const loanRows = (loanRowsData as LoanRow[] | null) ?? [];
  const repaymentRows = (repaymentRowsData as RepaymentRow[] | null) ?? [];
  const cashRows = (cashRowsData as CashDrawerRow[] | null) ?? [];
  const memberRows = (memberRowsData as ProfileRow[] | null) ?? [];
  const agentRows = (agentRowsData as ProfileRow[] | null) ?? [];
  const transactionRows = (transactionRowsData as TransactionRow[] | null) ?? [];

  const agentPerformance: AgentPerformance[] = agentRows.map((agent) => {
    const agentTransactions = transactionRows.filter(
      (transaction) => transaction.agent_profile_id === agent.id,
    );
    const agentCashRows = cashRows.filter((cash) => cash.agent_profile_id === agent.id);

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
    branchName: ((branchData as BranchRow | null)?.name ?? row.branch_name),
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
    overdueLoans: loanRows.filter((loan) => loan.status === "defaulted").length,
    pendingApprovals: toNumber(row.pending_approvals),
    expectedCashToday: cashRows.reduce((sum, cash) => sum + toNumber(cash.expected_cash), 0),
    cashVariance: cashRows.reduce((sum, cash) => sum + toNumber(cash.variance), 0),
    agentPerformance,
  };

  return {
    summary,
    alerts: await getPendingTransactions(supabase, branchId),
  };
}

export async function getBranchDashboardData() {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("branch_manager"),
      summary: emptyBranchSummary(),
      alerts: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
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

export async function getMembersPageData(): Promise<MembersPageData> {
  if (!hasSupabaseEnv()) {
    return {
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
      ? supabase.from("profiles").select("id, full_name, phone").in("id", memberIds)
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
    profile,
    members: memberProfiles.map((member) => {
      const memberRow = memberMap.get(member.profile_id);

      return {
        id: member.profile_id,
        fullName: memberRow?.full_name ?? member.profile_id,
        agentName: agentMap.get(member.assigned_agent_id ?? "") ?? "Unassigned",
        branchName: branchMap.get(member.branch_id) ?? member.branch_id,
        phone: memberRow?.phone ?? "No phone",
        status: member.status,
        occupation: member.occupation,
        address: member.residential_address,
      };
    }),
    isLive: true,
  };
}

export async function getMemberDetailPageData(memberId: string) {
  const data = await getMembersPageData();
  const member = data.members.find((row) => row.id === memberId) ?? null;

  return {
    ...data,
    member,
  };
}

export async function getUsersPageData(): Promise<UsersPageData> {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("admin"),
      users: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin"]);
  const [{ data: profileData }, { data: branchData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, branch_id, is_active")
      .order("created_at", { ascending: false }),
    supabase.from("branches").select("id, name"),
  ]);

  const branchMap = new Map(
    ((branchData as BranchRow[] | null) ?? []).map((branch) => [branch.id, branch.name]),
  );

  return {
    profile,
    users: ((profileData as ProfileRow[] | null) ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      role: row.role ?? "member",
      branchName: row.branch_id ? branchMap.get(row.branch_id) ?? row.branch_id : "Institution",
      status: row.is_active ? "active" : "inactive",
    })),
    isLive: true,
  };
}

export async function getLoansPageData(): Promise<LoansPageData> {
  if (!hasSupabaseEnv()) {
    return {
      profile: emptyProfile("branch_manager"),
      loans: [],
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.role === "branch_manager" ? profile.branch_id ?? undefined : undefined;

  let query = supabase
    .from("loans")
    .select(
      "id, branch_id, member_profile_id, approved_principal, remaining_principal, monthly_interest_rate, status",
    )
    .order("created_at", { ascending: false });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data: loanData } = await query;
  const loans = (loanData as LoanRow[] | null) ?? [];
  const memberIds = Array.from(
    new Set(
      loans
        .map((loan) => loan.member_profile_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] as ProfileRow[] };
  const memberMap = new Map(
    ((memberRows as ProfileRow[] | null) ?? []).map((row) => [row.id, row.full_name]),
  );

  return {
    profile,
    loans: loans.map((loan) => {
      const remainingPrincipal = toNumber(loan.remaining_principal);
      const monthlyInterestRate = toNumber(loan.monthly_interest_rate);

      return {
        id: loan.id ?? "loan",
        memberName: memberMap.get(loan.member_profile_id ?? "") ?? "Unknown member",
        approvedPrincipal: toNumber(loan.approved_principal),
        remainingPrincipal,
        monthlyInterestRate,
        nextInterestDue: calculateMonthlyInterest(remainingPrincipal, monthlyInterestRate),
        status: loan.status,
      };
    }),
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
      time: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(row.created_at)),
      actor: row.actor_id ? actorMap.get(row.actor_id) ?? row.actor_id : "System",
      action: row.action,
      reference: row.entity_id,
      result: "Recorded",
    })),
    isLive: true,
  };
}
