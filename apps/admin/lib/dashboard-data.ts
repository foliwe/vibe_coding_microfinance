import {
  adminDashboard as mockAdminDashboard,
  branchDashboard as mockBranchDashboard,
  transactions as mockTransactions,
  type AdminDashboardSummary,
  type AgentPerformance,
  type BranchDashboardSummary,
  type TransactionRequest,
} from "@credit-union/shared";

import { requireRole, type AdminProfile } from "./auth";
import { hasSupabaseEnv } from "./supabase/env";

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
  branch_id: string | null;
  created_at?: string;
};

type LoanRow = {
  branch_id: string;
  approved_principal: number | string | null;
  remaining_principal: number | string | null;
  status: string;
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
) {
  let query = supabase
    .from("transaction_requests")
    .select(
      "id, branch_id, member_profile_id, agent_profile_id, transaction_type, amount, status, created_at",
    )
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false })
    .limit(5);

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

export async function getAdminDashboardData() {
  if (!hasSupabaseEnv()) {
    return {
      profile: {
        id: "mock-admin",
        role: "admin",
        full_name: "Demo Admin",
        email: null,
        branch_id: null,
      } satisfies AdminProfile,
      summary: mockAdminDashboard,
      alerts: mockTransactions,
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
    alerts: await getPendingTransactions(supabase),
    isLive: true,
  };
}

export async function getBranchDashboardData() {
  if (!hasSupabaseEnv()) {
    return {
      profile: {
        id: "mock-manager",
        role: "branch_manager",
        full_name: "Demo Branch Manager",
        email: null,
        branch_id: mockBranchDashboard.branchId,
      } satisfies AdminProfile,
      summary: mockBranchDashboard,
      alerts: mockTransactions,
      isLive: false,
    };
  }

  const { supabase, profile } = await requireRole(["admin", "branch_manager"]);
  const branchId = profile.branch_id;

  if (!branchId) {
    return {
      profile,
      summary: mockBranchDashboard,
      alerts: mockTransactions,
      isLive: false,
    };
  }

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
      profile,
      summary: mockBranchDashboard,
      alerts: mockTransactions,
      isLive: false,
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
    profile,
    summary,
    alerts: await getPendingTransactions(supabase, branchId),
    isLive: true,
  };
}
