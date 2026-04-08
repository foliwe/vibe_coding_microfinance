import {
  calculateMonthlyInterest,
  type LoanStatus,
  type TransactionType,
  type TransactionRequest,
} from "@credit-union/shared";

import {
  type AgentDashboard,
  type AssignedMember,
  type LoanCard,
  type MemberDashboard,
  type TrendDatum,
} from "./mobile-models";

import {
  getOfflineSyncQueue,
  getOfflineSyncQueueItems,
  isOfflineSyncableError,
  queueTransactionRequest,
  syncOfflineQueue,
} from "./offline-sync";
import { queueEntryToTransactionRequest } from "./offline-sync-core";
import { requireCurrentMobileProfile } from "./mobile-auth";
import {
  registerMobileStaffDevice,
  requireAllowedMobileStaffDevice,
} from "./staff-device";
import {
  getWithdrawalConnectivityMessage,
  shouldQueueOfflineTransaction,
} from "./transaction-submission";
import { getSupabaseClient } from "./supabase/client";

type BranchRow = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
};

type ProfileRow = {
  branch_id: string | null;
  email?: string | null;
  full_name: string;
  id: string;
  phone: string;
};

type MemberProfileRow = {
  assigned_agent_id: string | null;
  branch_id: string;
  date_of_birth: string | null;
  gender: string | null;
  id_number: string | null;
  id_type: string | null;
  next_of_kin_address: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  occupation: string | null;
  profile_id: string;
  residential_address: string | null;
  sign_in_code: string | null;
  status: string;
};

type MemberAccountRow = {
  account_number: string;
  account_type: "savings" | "deposit";
  id: string;
  member_profile_id: string;
  status: string;
};

type TransactionRow = {
  agent_profile_id: string;
  amount: number | string;
  created_at: string;
  id: string;
  member_account_id: string;
  member_profile_id: string;
  note: string | null;
  status: TransactionRequest["status"];
  transaction_type: TransactionRequest["type"];
};

type CashDrawerRow = {
  id: string;
  branch_id: string;
  agent_profile_id: string;
  business_date: string;
  counted_cash: number | string | null;
  expected_cash: number | string | null;
  status: string;
  variance: number | string | null;
};

type CashReconciliationRow = {
  id: string;
  cash_drawer_id: string;
  counted_cash: number | string;
  expected_cash: number | string;
  variance: number | string;
  variance_reason: string | null;
  status: "pending_review" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

type LoanRow = {
  application_id: string;
  approved_principal: number | string;
  branch_id: string;
  created_at: string;
  disbursed_at: string | null;
  id: string;
  member_profile_id: string;
  monthly_interest_rate: number | string;
  remaining_principal: number | string;
  status: LoanStatus;
};

type LoanApplicationRow = {
  collateral_required: boolean;
  created_at: string;
  id: string;
  status: LoanStatus;
};

type LoanRepaymentRow = {
  created_at: string;
  loan_id: string;
  repayment_mode: "interest_only" | "interest_plus_principal";
};

type CreateMemberResponse = {
  memberId: string;
  signInIdentifier: string;
  temporaryPassword: string;
};

export interface AgentTransactionTarget {
  accountId: string;
  accountNumber: string;
  accountType: "savings" | "deposit";
  availableBalance: number;
  depositBalance: number;
  memberCode: string;
  memberId: string;
  memberName: string;
  savingsBalance: number;
}

export interface AgentReconciliationSummary {
  actualCash: number;
  canSubmit: boolean;
  difference: number;
  expectedCash: number;
  reconciliationId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  statusLabel: "APPROVED" | "PENDING REVIEW" | "RECONCILIATION REQUIRED" | "REJECTED";
  submittedAt: string | null;
  varianceReason: string | null;
}

export interface AgentMemberDetail {
  analytics: TrendDatum[];
  depositTarget: AgentTransactionTarget | null;
  member: AssignedMember;
  recentTransactions: TransactionRequest[];
  savingsTarget: AgentTransactionTarget | null;
}

const DAYS_IN_MONTH = 30;
const MEMBER_ACCOUNT_TYPES = ["savings", "deposit"] as const;

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function startOfLocalDay(offsetDays = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function formatProfileCode(prefix: "AG" | "MB", id: string) {
  return `${prefix}-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

function getMemberSignInCode(row: Pick<MemberProfileRow, "profile_id" | "sign_in_code">) {
  return row.sign_in_code ?? formatProfileCode("MB", row.profile_id);
}

function buildIdempotencyKey(actorId: string, transactionType: TransactionType) {
  const entropy = Math.random().toString(36).slice(2, 10);
  return `mobile-${transactionType}-${actorId}-${Date.now()}-${entropy}`;
}

function formatCalendarLabel(value: string | Date, options: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

export function formatDateLabel(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return formatCalendarLabel(value, {
    day: "2-digit",
    month: "short",
    ...options,
  });
}

export function formatTransactionMonthLabel(value: string | Date) {
  return formatCalendarLabel(value, {
    month: "long",
    year: "numeric",
  });
}

export function formatTransactionDayLabel(value: string | Date) {
  return formatCalendarLabel(value, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTimeLabel(value: string | Date) {
  return formatCalendarLabel(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function formatTimeLabel(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(dateString: string) {
  const deltaMs = Date.now() - new Date(dateString).getTime();

  if (!Number.isFinite(deltaMs)) {
    return "recently";
  }

  const minutes = Math.max(1, Math.floor(deltaMs / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toMemberStatus(status: string): AssignedMember["status"] {
  if (status === "active" || status === "pending" || status === "suspended") {
    return status;
  }

  return "pending";
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSyncState(rows: TransactionRow[]): AgentDashboard["syncState"] {
  if (rows.some((row) => row.status === "sync_conflict")) {
    return "FAILED TO SYNC";
  }

  if (rows.some((row) => row.status === "draft" || row.status === "unsynced")) {
    return "PENDING SYNC";
  }

  return "ONLINE";
}

function toAgentReconciliationStatusLabel(
  drawer: CashDrawerRow,
  reconciliation: CashReconciliationRow | null,
): AgentReconciliationSummary["statusLabel"] {
  if (reconciliation?.status === "approved" || drawer.status === "closed") {
    return "APPROVED";
  }

  if (reconciliation?.status === "pending_review" || drawer.status === "pending_review") {
    return "PENDING REVIEW";
  }

  if (reconciliation?.status === "rejected") {
    return "REJECTED";
  }

  return "RECONCILIATION REQUIRED";
}

function buildBalanceMap(
  transactions: TransactionRow[],
  accountMap: Map<string, MemberAccountRow>,
) {
  const balances = new Map<string, number>();

  for (const row of transactions) {
    if (row.status !== "approved") {
      continue;
    }

    const account = accountMap.get(row.member_account_id);

    if (!account) {
      continue;
    }

    const nextAmount =
      (balances.get(account.id) ?? 0) +
      (row.transaction_type === "deposit" ? toNumber(row.amount) : -toNumber(row.amount));

    balances.set(account.id, nextAmount);
  }

  return balances;
}

function filterTransactionsForMember(
  transactions: TransactionRow[],
  memberId: string,
) {
  return transactions.filter((transaction) => transaction.member_profile_id === memberId);
}

function getBalancesForMember(
  memberId: string,
  accountRows: MemberAccountRow[],
  balanceMap: Map<string, number>,
) {
  let savingsBalance = 0;
  let depositBalance = 0;

  for (const account of accountRows) {
    if (account.member_profile_id !== memberId) {
      continue;
    }

    const balance = balanceMap.get(account.id) ?? 0;

    if (account.account_type === "savings") {
      savingsBalance += balance;
    } else if (account.account_type === "deposit") {
      depositBalance += balance;
    }
  }

  return { depositBalance, savingsBalance };
}

function buildTransactionLabel(
  row: TransactionRow,
  memberName: string,
  branchId: string,
  branchName: string,
  agentName: string,
  accountType: "savings" | "deposit",
): TransactionRequest {
  return {
    id: row.id,
    memberId: row.member_profile_id,
    memberName,
    branchId,
    branchName,
    agentId: row.agent_profile_id,
    agentName,
    type: row.transaction_type,
    accountType,
    amount: toNumber(row.amount),
    status: row.status,
    createdAt: row.created_at,
    note: row.note ?? undefined,
  };
}

function buildActivityStatus(row: TransactionRow) {
  const map: Record<TransactionRow["status"], string> = {
    approved: "APPROVED",
    draft: "PENDING SYNC",
    pending_approval: "PENDING APPROVAL",
    rejected: "REJECTED",
    reversed: "REJECTED",
    sync_conflict: "FAILED TO SYNC",
    unsynced: "PENDING SYNC",
  };

  return map[row.status];
}

function buildLastActivity(row?: TransactionRow) {
  if (!row) {
    return "No recent transaction activity";
  }

  return `${titleCase(row.transaction_type)} ${buildActivityStatus(row).toLowerCase()} ${formatRelativeTime(row.created_at)}`;
}

function buildAgentTrend(rows: TransactionRow[]) {
  const totals = new Map<string, number>();
  const labels: string[] = [];

  for (let offset = -4; offset <= 0; offset += 1) {
    const date = startOfLocalDay(offset);
    const key = date.toISOString().slice(0, 10);
    labels.push(key);
    totals.set(key, 0);
  }

  for (const row of rows) {
    const key = new Date(row.created_at).toISOString().slice(0, 10);

    if (!totals.has(key)) {
      continue;
    }

    totals.set(key, (totals.get(key) ?? 0) + toNumber(row.amount));
  }

  return labels.map((key) => ({
    label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(key)),
    value: totals.get(key) ?? 0,
  }));
}

function buildMemberTrend(rows: TransactionRow[]) {
  const entries = Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (3 - index), 1);
    date.setHours(0, 0, 0, 0);

    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date),
      value: 0,
    };
  });

  const entryMap = new Map(entries.map((entry) => [entry.key, entry]));

  for (const row of rows) {
    if (row.status !== "approved") {
      continue;
    }

    const date = new Date(row.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const entry = entryMap.get(key);

    if (!entry) {
      continue;
    }

    entry.value += toNumber(row.amount);
  }

  return entries.map(({ label, value }) => ({ label, value }));
}

function buildBranchContact(branchName: string, phone: string | null) {
  return phone ? `${branchName} support: ${phone}` : `${branchName} support desk`;
}

function buildNextDueLabel(loan: LoanRow, latestRepayment?: LoanRepaymentRow) {
  const anchor = latestRepayment?.created_at ?? loan.disbursed_at ?? loan.created_at;
  const nextDue = new Date(anchor);
  nextDue.setDate(nextDue.getDate() + DAYS_IN_MONTH);

  return formatDateLabel(nextDue.toISOString(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function getBranch(branchId: string | null) {
  if (!branchId) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, code, name, phone")
    .eq("id", branchId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as BranchRow | null) ?? null;
}

async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, branch_id")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(
    (((data as ProfileRow[] | null) ?? [])).map((row) => [row.id, row]),
  );
}

async function getAccountRowsForMemberIds(memberIds: string[]) {
  if (memberIds.length === 0) {
    return [] as MemberAccountRow[];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_accounts")
    .select("id, member_profile_id, account_type, account_number, status")
    .eq("status", "active")
    .in("member_profile_id", memberIds)
    .in("account_type", [...MEMBER_ACCOUNT_TYPES]);

  if (error) {
    throw error;
  }

  return (data as MemberAccountRow[] | null) ?? [];
}

async function getTransactionsForMemberIds(memberIds: string[]) {
  if (memberIds.length === 0) {
    return [] as TransactionRow[];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("transaction_requests")
    .select(
      "id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, status, created_at, note",
    )
    .in("member_profile_id", memberIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as TransactionRow[] | null) ?? [];
}

function buildAgentTransactionTargetFromContext({
  accountRows,
  balances,
  memberName,
  memberRow,
  preferredAccountType,
}: {
  accountRows: MemberAccountRow[];
  balances: { depositBalance: number; savingsBalance: number };
  memberName: string;
  memberRow: Pick<MemberProfileRow, "profile_id" | "sign_in_code">;
  preferredAccountType: "deposit" | "savings";
}) {
  const selectedAccount = accountRows.find(
    (row) => row.account_type === preferredAccountType,
  );

  if (!selectedAccount) {
    return null;
  }

  return {
    accountId: selectedAccount.id,
    accountNumber: selectedAccount.account_number,
    accountType: selectedAccount.account_type,
    availableBalance:
      selectedAccount.account_type === "deposit"
        ? balances.depositBalance
        : balances.savingsBalance,
    depositBalance: balances.depositBalance,
    memberCode: getMemberSignInCode(memberRow),
    memberId: memberRow.profile_id,
    memberName,
    savingsBalance: balances.savingsBalance,
  } satisfies AgentTransactionTarget;
}

async function getAgentTransactionTarget(
  transactionType: Extract<TransactionType, "deposit" | "withdrawal">,
  options?: {
    memberId?: string;
    preferredAccountType?: "deposit" | "savings";
    strictAccountTypeMatch?: boolean;
  },
) {
  const supabase = getSupabaseClient();
  const profile = await requireCurrentMobileProfile(["agent"]);
  let query = supabase
    .from("member_profiles")
    .select(
      "profile_id, branch_id, assigned_agent_id, occupation, residential_address, sign_in_code, status",
    )
    .eq("assigned_agent_id", profile.id)
    .eq("status", "active")
    .order("profile_id", { ascending: true });

  if (options?.memberId) {
    query = query.eq("profile_id", options.memberId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const memberRows = (data as MemberProfileRow[] | null) ?? [];
  const memberIds = memberRows.map((row) => row.profile_id);

  if (memberIds.length === 0) {
    return null;
  }

  const [profileMap, accountRows, transactionRows] = await Promise.all([
    getProfilesByIds(memberIds),
    getAccountRowsForMemberIds(memberIds),
    getTransactionsForMemberIds(memberIds),
  ]);

  const accountMap = new Map(accountRows.map((row) => [row.id, row]));
  const balanceMap = buildBalanceMap(transactionRows, accountMap);
  const preferredAccountType =
    options?.preferredAccountType ??
    (transactionType === "withdrawal" ? "deposit" : "savings");

  for (const memberRow of memberRows) {
    const memberAccounts = accountRows.filter(
      (row) => row.member_profile_id === memberRow.profile_id,
    );
    const balances = getBalancesForMember(
      memberRow.profile_id,
      accountRows,
      balanceMap,
    );
    const memberProfile = profileMap.get(memberRow.profile_id);
    const target = buildAgentTransactionTargetFromContext({
      accountRows: memberAccounts,
      balances,
      memberName: memberProfile?.full_name ?? "Assigned member",
      memberRow,
      preferredAccountType,
    });

    if (!target) {
      if (options?.strictAccountTypeMatch) {
        continue;
      }

      const fallbackAccountType = memberAccounts[0]?.account_type;

      if (!fallbackAccountType) {
        continue;
      }

      return buildAgentTransactionTargetFromContext({
        accountRows: memberAccounts,
        balances,
        memberName: memberProfile?.full_name ?? "Assigned member",
        memberRow,
        preferredAccountType: fallbackAccountType,
      });
    }

    return target;
  }

  return null;
}

export const mobileData = {
  getDepositTarget: () => getAgentTransactionTarget("deposit"),
  getDepositTargetForMember: (
    memberId: string,
    accountType: "deposit" | "savings",
  ) =>
    getAgentTransactionTarget("deposit", {
      memberId,
      preferredAccountType: accountType,
      strictAccountTypeMatch: true,
    }),
  getWithdrawalTarget: () => getAgentTransactionTarget("withdrawal"),

  async getAgentDashboard(): Promise<AgentDashboard> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["agent"]);

    const [branch, transactionRows, cashDrawerResponse, offlineQueue] = await Promise.all([
      getBranch(profile.branchId),
      supabase
        .from("transaction_requests")
        .select(
          "id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, status, created_at, note",
        )
        .eq("agent_profile_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("cash_drawers")
        .select("expected_cash, counted_cash, variance, business_date, status")
        .eq("agent_profile_id", profile.id)
        .order("business_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getOfflineSyncQueue(),
    ]);

    const transactionData = (transactionRows.data as TransactionRow[] | null) ?? [];

    if (transactionRows.error) {
      throw transactionRows.error;
    }

    if (cashDrawerResponse.error) {
      throw cashDrawerResponse.error;
    }

    const queuedTransactionRows = offlineQueue
      .filter((entry) => entry.actorId === profile.id)
      .map((entry) =>
        queueEntryToTransactionRequest(entry, {
          agentId: profile.id,
          agentName: profile.fullName,
          branchId: branch?.id ?? profile.branchId ?? "",
          branchName: branch?.name ?? "Assigned Branch",
        }),
      )
      .filter((row): row is TransactionRequest => row !== null);
    const queuedTransactionIds = new Set(queuedTransactionRows.map((row) => row.id));
    const combinedTransactions = [
      ...queuedTransactionRows,
      ...transactionData
        .map((row) =>
          buildTransactionLabel(
            row,
            "",
            branch?.id ?? profile.branchId ?? "",
            branch?.name ?? "Assigned Branch",
            profile.fullName,
            "savings",
          ),
        )
        .filter((row) => !queuedTransactionIds.has(row.id)),
    ].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    const memberIds = Array.from(
      new Set(transactionData.map((row) => row.member_profile_id)),
    );
    const memberMap = await getProfilesByIds(memberIds);
    const cashDrawer = (cashDrawerResponse.data as CashDrawerRow | null) ?? null;
    const todayStart = startOfLocalDay().getTime();
    const hydratedTransactions = combinedTransactions.map((row) => ({
      ...row,
      memberName:
        row.memberName ||
        memberMap.get(row.memberId)?.full_name ||
        "Assigned member",
    }));
    const todayRows = hydratedTransactions.filter(
      (row) => new Date(row.createdAt).getTime() >= todayStart,
    );
    const pendingSyncCount = hydratedTransactions.filter(
      (row) =>
        row.status === "draft" ||
        row.status === "unsynced" ||
        row.status === "sync_conflict",
    ).length;

    return {
      syncState: getSyncState(
        hydratedTransactions.map((row) => ({
          agent_profile_id: row.agentId,
          amount: row.amount,
          created_at: row.createdAt,
          id: row.id,
          member_account_id: row.id,
          member_profile_id: row.memberId,
          note: row.note ?? null,
          status: row.status,
          transaction_type: row.type,
        })),
      ),
      pendingSyncCount,
      agentName: profile.fullName,
      agentCode: formatProfileCode("AG", profile.id),
      branchName: branch?.name ?? "Assigned Branch",
      welcomeNote: "Signed-in field dashboard with live member activity and approval visibility.",
      lastSyncLabel: cashDrawer?.business_date
        ? `Cash drawer updated ${formatRelativeTime(cashDrawer.business_date)}`
        : "Session active and ready",
      collectionsToday: todayRows
        .filter((row) => row.type === "deposit")
        .reduce((sum, row) => sum + toNumber(row.amount), 0),
      withdrawalsToday: todayRows
        .filter((row) => row.type === "withdrawal")
        .reduce((sum, row) => sum + toNumber(row.amount), 0),
      pendingApprovals: hydratedTransactions.filter((row) => row.status === "pending_approval").length,
      cashOnHand:
        cashDrawer?.counted_cash == null
          ? toNumber(cashDrawer?.expected_cash)
          : toNumber(cashDrawer.counted_cash),
      expectedCash: toNumber(cashDrawer?.expected_cash),
      activity: hydratedTransactions.slice(0, 5).map((row) => ({
        id: row.id,
        title:
          row.type === "deposit"
            ? row.status === "approved"
              ? "Deposit approved"
              : "Deposit logged"
            : row.status === "approved"
              ? "Withdrawal approved"
              : "Withdrawal requested",
        memberName: row.memberName,
        amount: toNumber(row.amount),
        status: buildActivityStatus({
          agent_profile_id: row.agentId,
          amount: row.amount,
          created_at: row.createdAt,
          id: row.id,
          member_account_id: row.id,
          member_profile_id: row.memberId,
          note: row.note ?? null,
          status: row.status,
          transaction_type: row.type,
        }),
        timeLabel: formatTimeLabel(row.createdAt),
      })),
      flowTrend: buildAgentTrend(
        hydratedTransactions.map((row) => ({
          agent_profile_id: row.agentId,
          amount: row.amount,
          created_at: row.createdAt,
          id: row.id,
          member_account_id: row.id,
          member_profile_id: row.memberId,
          note: row.note ?? null,
          status: row.status,
          transaction_type: row.type,
        })),
      ),
    };
  },

  async getAssignedMembers(): Promise<AssignedMember[]> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["agent"]);
    const branch = await getBranch(profile.branchId);
    const { data, error } = await supabase
      .from("member_profiles")
      .select(
        "profile_id, branch_id, assigned_agent_id, date_of_birth, gender, residential_address, occupation, id_type, id_number, next_of_kin_name, next_of_kin_phone, next_of_kin_address, sign_in_code, status",
      )
      .eq("assigned_agent_id", profile.id)
      .order("profile_id", { ascending: true });

    if (error) {
      throw error;
    }

    const memberRows = (data as MemberProfileRow[] | null) ?? [];
    const memberIds = memberRows.map((row) => row.profile_id);
    const [profileMap, accountRows, transactionRows] = await Promise.all([
      getProfilesByIds(memberIds),
      getAccountRowsForMemberIds(memberIds),
      getTransactionsForMemberIds(memberIds),
    ]);

    const accountMap = new Map(accountRows.map((row) => [row.id, row]));
    const balanceMap = buildBalanceMap(transactionRows, accountMap);

    return memberRows.map((row) => {
      const memberProfile = profileMap.get(row.profile_id);
      const memberTransactions = transactionRows.filter(
        (transaction) => transaction.member_profile_id === row.profile_id,
      );
      const latestTransaction = memberTransactions[0];
      const balances = getBalancesForMember(row.profile_id, accountRows, balanceMap);

      return {
        id: row.profile_id,
        code: getMemberSignInCode(row),
        branchId: row.branch_id,
        branchName: branch?.name ?? "Assigned Branch",
        agentId: profile.id,
        agentName: profile.fullName,
        fullName: memberProfile?.full_name ?? "Member",
        phone: memberProfile?.phone ?? "No phone on file",
        status: toMemberStatus(row.status),
        occupation: row.occupation ?? undefined,
        address: row.residential_address ?? undefined,
        village: row.residential_address ?? "Address pending",
        savingsBalance: balances.savingsBalance,
        depositBalance: balances.depositBalance,
        lastActivity: buildLastActivity(latestTransaction),
      };
    });
  },

  async getAssignedMemberDetail(memberId: string): Promise<AgentMemberDetail | null> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["agent"]);
    const { data, error } = await supabase
      .from("member_profiles")
      .select(
        "profile_id, branch_id, assigned_agent_id, date_of_birth, gender, residential_address, occupation, id_type, id_number, next_of_kin_name, next_of_kin_phone, next_of_kin_address, sign_in_code, status",
      )
      .eq("assigned_agent_id", profile.id)
      .eq("profile_id", memberId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const memberRow = (data as MemberProfileRow | null) ?? null;

    if (!memberRow) {
      return null;
    }

    const [branch, memberProfileMap, accountRows, transactionRows] = await Promise.all([
      getBranch(memberRow.branch_id),
      getProfilesByIds([memberRow.profile_id]),
      getAccountRowsForMemberIds([memberRow.profile_id]),
      getTransactionsForMemberIds([memberRow.profile_id]),
    ]);
    const accountMap = new Map(accountRows.map((row) => [row.id, row]));
    const balanceMap = buildBalanceMap(transactionRows, accountMap);
    const balances = getBalancesForMember(memberRow.profile_id, accountRows, balanceMap);
    const memberProfile = memberProfileMap.get(memberRow.profile_id);
    const agentIds = Array.from(
      new Set(transactionRows.map((row) => row.agent_profile_id).filter(Boolean)),
    );
    const agentMap = await getProfilesByIds(agentIds);
    const member = {
      id: memberRow.profile_id,
      code: getMemberSignInCode(memberRow),
      branchId: memberRow.branch_id,
      branchName: branch?.name ?? "Assigned Branch",
      agentId: profile.id,
      agentName: profile.fullName,
      fullName: memberProfile?.full_name ?? "Member",
      phone: memberProfile?.phone ?? "No phone on file",
      status: toMemberStatus(memberRow.status),
      dateOfBirth: memberRow.date_of_birth ?? undefined,
      gender: memberRow.gender ?? undefined,
      occupation: memberRow.occupation ?? undefined,
      address: memberRow.residential_address ?? undefined,
      idType: memberRow.id_type ?? undefined,
      idNumber: memberRow.id_number ?? undefined,
      nextOfKinName: memberRow.next_of_kin_name ?? undefined,
      nextOfKinPhone: memberRow.next_of_kin_phone ?? undefined,
      nextOfKinAddress: memberRow.next_of_kin_address ?? undefined,
      village: memberRow.residential_address ?? "Address pending",
      savingsBalance: balances.savingsBalance,
      depositBalance: balances.depositBalance,
      lastActivity: buildLastActivity(transactionRows[0]),
    } satisfies AssignedMember;
    const savingsTarget =
      member.status === "active"
        ? buildAgentTransactionTargetFromContext({
            accountRows,
            balances,
            memberName: member.fullName,
            memberRow,
            preferredAccountType: "savings",
          })
        : null;
    const depositTarget =
      member.status === "active"
        ? buildAgentTransactionTargetFromContext({
            accountRows,
            balances,
            memberName: member.fullName,
            memberRow,
            preferredAccountType: "deposit",
          })
        : null;

    return {
      analytics: [
        { label: "Savings", value: balances.savingsBalance },
        { label: "Deposit", value: balances.depositBalance },
      ],
      depositTarget,
      member,
      recentTransactions: transactionRows.slice(0, 6).map((row) =>
        buildTransactionLabel(
          row,
          member.fullName,
          branch?.id ?? member.branchId,
          branch?.name ?? member.branchName,
          agentMap.get(row.agent_profile_id)?.full_name ?? profile.fullName,
          accountMap.get(row.member_account_id)?.account_type ?? "savings",
        ),
      ),
      savingsTarget,
    };
  },

  async getAgentTransactions(): Promise<TransactionRequest[]> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["agent"]);
    const [branch, queue, response] = await Promise.all([
      getBranch(profile.branchId),
      getOfflineSyncQueue(),
      supabase
        .from("transaction_requests")
        .select(
          "id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, status, created_at, note",
        )
        .eq("agent_profile_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);

    if (response.error) {
      throw response.error;
    }

    const rows = (response.data as TransactionRow[] | null) ?? [];
    const memberIds = Array.from(new Set(rows.map((row) => row.member_profile_id)));
    const accountIds = Array.from(new Set(rows.map((row) => row.member_account_id)));
    const [memberMap, accountRows] = await Promise.all([
      getProfilesByIds(memberIds),
      accountIds.length
        ? supabase
            .from("member_accounts")
            .select("id, member_profile_id, account_type, account_number, status")
            .in("id", accountIds)
        : Promise.resolve({ data: [] as MemberAccountRow[], error: null }),
    ]);

    if (accountRows.error) {
      throw accountRows.error;
    }

    const accountMap = new Map(
      (((accountRows.data as MemberAccountRow[] | null) ?? [])).map((row) => [row.id, row]),
    );
    const liveTransactions = rows.map((row) =>
      buildTransactionLabel(
        row,
        memberMap.get(row.member_profile_id)?.full_name ?? "Assigned member",
        branch?.id ?? profile.branchId ?? "",
        branch?.name ?? "Assigned Branch",
        profile.fullName,
        accountMap.get(row.member_account_id)?.account_type ?? "savings",
      ),
    );
    const queuedTransactions = queue
      .filter((entry) => entry.actorId === profile.id)
      .map((entry) =>
        queueEntryToTransactionRequest(entry, {
          agentId: profile.id,
          agentName: profile.fullName,
          branchId: branch?.id ?? profile.branchId ?? "",
          branchName: branch?.name ?? "Assigned Branch",
        }),
      )
      .filter((row): row is TransactionRequest => row !== null);

    return [...queuedTransactions, ...liveTransactions].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  },

  async createAgentTransactionRequest({
    accountType,
    amount,
    memberAccountId,
    memberId,
    memberName,
    note,
    transactionPin,
    transactionType,
  }: {
    accountType: "savings" | "deposit";
    amount: number;
    memberAccountId: string;
    memberId: string;
    memberName: string;
    note?: string;
    transactionPin?: string;
    transactionType: Extract<TransactionType, "deposit" | "withdrawal">;
  }) {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["agent"]);
    const { device } = await requireAllowedMobileStaffDevice({
      autoRegisterIfNeeded: true,
    });

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    const normalizedPin = transactionPin?.trim() || null;

    if (transactionType === "withdrawal" && !normalizedPin) {
      throw new Error("Enter your 4-digit transaction PIN before submitting the withdrawal.");
    }

    if (normalizedPin && !/^\d{4}$/.test(normalizedPin)) {
      throw new Error("Transaction PIN must be exactly 4 digits.");
    }

    const idempotencyKey = buildIdempotencyKey(profile.id, transactionType);

    const { data, error } = await supabase.rpc("create_transaction_request", {
      p_actor_id: profile.id,
      p_amount: Number(amount.toFixed(2)),
      p_device_id: device.id,
      p_idempotency_key: idempotencyKey,
      p_member_account_id: memberAccountId,
      p_note: note?.trim() || null,
      p_payload_hash: null,
      p_submitted_offline: false,
      p_transaction_pin: transactionType === "withdrawal" ? normalizedPin : null,
      p_transaction_type: transactionType,
    });

    if (error) {
      if (shouldQueueOfflineTransaction(transactionType, isOfflineSyncableError(error))) {
        await queueTransactionRequest({
          accountType,
          actorId: profile.id,
          amount,
          memberAccountId,
          memberId,
          memberName,
          note,
          transactionType,
        });

        return {
          data: null,
          mode: "queued" as const,
        };
      }

      if (transactionType === "withdrawal" && isOfflineSyncableError(error)) {
        throw new Error(getWithdrawalConnectivityMessage());
      }

      throw error;
    }

    return {
      data,
      mode: "submitted" as const,
    };
  },

  async changeAgentCredentials(input: {
    confirmNewPassword: string;
    confirmTransactionPin: string;
    currentPassword: string;
    newPassword: string;
    transactionPin: string;
  }) {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["agent"]);

    const currentPassword = input.currentPassword.trim();
    const newPassword = input.newPassword.trim();
    const confirmNewPassword = input.confirmNewPassword.trim();
    const transactionPin = input.transactionPin.trim();
    const confirmTransactionPin = input.confirmTransactionPin.trim();

    if (profile.mustChangePassword) {
      if (!currentPassword) {
        throw new Error("Enter your current temporary password.");
      }

      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error("Your new password and confirmation must match.");
      }
    }

    if (profile.requiresPinSetup) {
      if (!/^\d{4}$/.test(transactionPin)) {
        throw new Error("Transaction PIN must be exactly 4 digits.");
      }

      if (transactionPin !== confirmTransactionPin) {
        throw new Error("Your transaction PIN and confirmation must match.");
      }
    }

    if (profile.mustChangePassword) {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }
    }

    if (profile.mustChangePassword) {
      const { error: completeError } = await supabase.rpc("complete_password_change");

      if (completeError) {
        throw completeError;
      }
    }

    if (profile.requiresPinSetup) {
      const { error: pinError } = await supabase.rpc("set_my_transaction_pin", {
        p_pin: transactionPin,
      });

      if (pinError) {
        throw pinError;
      }
    }

    await registerMobileStaffDevice();
    await supabase.auth.refreshSession();
    return requireCurrentMobileProfile(["agent"]);
  },

  async createMember(input: {
    fullName: string;
    idCardNumber: string;
    phone: string;
  }): Promise<CreateMemberResponse> {
    const supabase = getSupabaseClient();
    const { device } = await requireAllowedMobileStaffDevice({
      autoRegisterIfNeeded: true,
    });
    const { data: sessionResponse } = await supabase.auth.getSession();
    const accessToken = sessionResponse.session?.access_token;

    if (!accessToken) {
      throw new Error("Your session expired. Sign in again before creating a member.");
    }

    const { data, error } = await supabase.functions.invoke("create-member", {
      body: {
        deviceId: device.id,
        deviceName: device.name,
        fullName: input.fullName.trim(),
        idCardNumber: input.idCardNumber.trim(),
        phone: input.phone.trim(),
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async updateMemberProfile(input: {
    dateOfBirth: string;
    fullName: string;
    gender: string;
    nextOfKinAddress: string;
    nextOfKinName: string;
    nextOfKinPhone: string;
    occupation: string;
    phone: string;
    residentialAddress: string;
  }): Promise<AssignedMember> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc("update_my_member_profile", {
      p_date_of_birth: input.dateOfBirth.trim() || null,
      p_full_name: input.fullName.trim(),
      p_gender: input.gender.trim() || null,
      p_next_of_kin_address: input.nextOfKinAddress.trim() || null,
      p_next_of_kin_name: input.nextOfKinName.trim() || null,
      p_next_of_kin_phone: input.nextOfKinPhone.trim() || null,
      p_occupation: input.occupation.trim() || null,
      p_phone: input.phone.trim(),
      p_residential_address: input.residentialAddress.trim() || null,
    });

    if (error) {
      throw error;
    }

    return mobileData.getMemberProfile();
  },

  async changeMemberPassword(input: {
    currentPassword: string;
    newPassword: string;
  }) {
    const supabase = getSupabaseClient();
    await requireCurrentMobileProfile(["member"]);

    if (!input.currentPassword.trim()) {
      throw new Error("Enter your current temporary password.");
    }

    if (input.newPassword.trim().length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: input.newPassword.trim(),
    });

    if (updateError) {
      throw updateError;
    }

    const { error: completeError } = await supabase.rpc("complete_password_change");

    if (completeError) {
      throw completeError;
    }

    await supabase.auth.refreshSession();
  },

  async getAgentReconciliation(): Promise<AgentReconciliationSummary> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["agent"]);
    const today = new Date().toISOString().slice(0, 10);
    const { data: drawerData, error: drawerError } = await supabase
      .from("cash_drawers")
      .select("id, branch_id, agent_profile_id, business_date, counted_cash, expected_cash, status, variance")
      .eq("agent_profile_id", profile.id)
      .eq("business_date", today)
      .order("business_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (drawerError) {
      throw drawerError;
    }

    const drawer = (drawerData as CashDrawerRow | null) ?? null;

    if (!drawer) {
      throw new Error("No open cash drawer was found for today.");
    }

    const { data: reconciliationData, error: reconciliationError } = await supabase
      .from("cash_reconciliations")
      .select(
        "id, cash_drawer_id, counted_cash, expected_cash, variance, variance_reason, status, submitted_at, reviewed_at, review_note",
      )
      .eq("cash_drawer_id", drawer.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reconciliationError) {
      throw reconciliationError;
    }

    const reconciliation = (reconciliationData as CashReconciliationRow | null) ?? null;
    const expectedCash = reconciliation
      ? toNumber(reconciliation.expected_cash)
      : toNumber(drawer.expected_cash);
    const actualCash = reconciliation
      ? toNumber(reconciliation.counted_cash)
      : drawer.counted_cash == null
        ? expectedCash
        : toNumber(drawer.counted_cash);
    const difference = reconciliation
      ? toNumber(reconciliation.variance)
      : roundCurrency(actualCash - expectedCash);

    return {
      actualCash,
      canSubmit:
        drawer.status !== "closed" &&
        (reconciliation === null || reconciliation.status === "rejected"),
      difference,
      expectedCash,
      reconciliationId: reconciliation?.id ?? null,
      reviewNote: reconciliation?.review_note ?? null,
      reviewedAt: reconciliation?.reviewed_at
        ? formatDateTimeLabel(reconciliation.reviewed_at)
        : null,
      statusLabel: toAgentReconciliationStatusLabel(drawer, reconciliation),
      submittedAt: reconciliation?.submitted_at
        ? formatDateTimeLabel(reconciliation.submitted_at)
        : null,
      varianceReason: reconciliation?.variance_reason ?? null,
    };
  },

  async submitAgentReconciliation(input: {
    actualCash: string;
    varianceReason: string;
  }) {
    const supabase = getSupabaseClient();
    await requireCurrentMobileProfile(["agent"]);
    const { device } = await requireAllowedMobileStaffDevice({
      autoRegisterIfNeeded: true,
    });

    const countedCash = Number(input.actualCash.trim());

    if (!Number.isFinite(countedCash) || countedCash < 0) {
      throw new Error("Actual cash must be zero or greater.");
    }

    const { error } = await supabase.rpc("submit_cash_reconciliation", {
      p_counted_cash: Number(countedCash.toFixed(2)),
      p_device_id: device.id,
      p_variance_reason: input.varianceReason.trim() || null,
    });

    if (error) {
      throw error;
    }

    return mobileData.getAgentReconciliation();
  },

  getSyncQueue: () => getOfflineSyncQueueItems(),

  retryFailedSyncQueue: () => syncOfflineQueue({ retryFailedOnly: true }),

  syncQueue: () => syncOfflineQueue(),

  async getMemberDashboard(): Promise<MemberDashboard> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["member"]);

    const [
      branch,
      memberProfileResponse,
      transactionResponse,
      accountResponse,
      loanResponse,
    ] = await Promise.all([
      getBranch(profile.branchId),
      supabase
        .from("member_profiles")
        .select(
          "profile_id, branch_id, assigned_agent_id, date_of_birth, gender, residential_address, occupation, id_type, id_number, next_of_kin_name, next_of_kin_phone, next_of_kin_address, sign_in_code, status",
        )
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("transaction_requests")
        .select(
          "id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, status, created_at, note",
        )
        .eq("member_profile_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("member_accounts")
        .select("id, member_profile_id, account_type, account_number, status")
        .eq("member_profile_id", profile.id)
        .eq("status", "active")
        .in("account_type", [...MEMBER_ACCOUNT_TYPES]),
      supabase
        .from("loans")
        .select(
          "id, application_id, branch_id, member_profile_id, approved_principal, remaining_principal, monthly_interest_rate, disbursed_at, status, created_at",
        )
        .eq("member_profile_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);

    if (memberProfileResponse.error) {
      throw memberProfileResponse.error;
    }

    if (transactionResponse.error) {
      throw transactionResponse.error;
    }

    if (accountResponse.error) {
      throw accountResponse.error;
    }

    if (loanResponse.error) {
      throw loanResponse.error;
    }

    const memberProfile = (memberProfileResponse.data as MemberProfileRow | null) ?? null;
    const transactionRows = filterTransactionsForMember(
      (transactionResponse.data as TransactionRow[] | null) ?? [],
      profile.id,
    );
    const accountRows = (accountResponse.data as MemberAccountRow[] | null) ?? [];
    const loanRows = (loanResponse.data as LoanRow[] | null) ?? [];
    const accountMap = new Map(accountRows.map((row) => [row.id, row]));
    const balanceMap = buildBalanceMap(transactionRows, accountMap);
    const balances = getBalancesForMember(profile.id, accountRows, balanceMap);
    const outstandingLoan = loanRows.reduce(
      (sum, row) => sum + toNumber(row.remaining_principal),
      0,
    );
    const activeLoan = loanRows.find((row) =>
      ["approved", "disbursed", "active", "defaulted"].includes(row.status),
    );
    const repaymentResponse = await (
      activeLoan
        ? supabase
            .from("loan_repayments")
            .select("loan_id, created_at, repayment_mode")
            .eq("loan_id", activeLoan.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    );

    if (repaymentResponse.error) {
      throw repaymentResponse.error;
    }

    const latestRepayment = (repaymentResponse.data as LoanRepaymentRow | null) ?? null;

    return {
      syncState: getSyncState(transactionRows),
      memberName: profile.fullName,
      memberCode: memberProfile?.sign_in_code ?? formatProfileCode("MB", profile.id),
      branchName: branch?.name ?? "Assigned Branch",
      savingsBalance: balances.savingsBalance,
      depositBalance: balances.depositBalance,
      availableBalance: balances.depositBalance,
      outstandingLoan,
      nextDueLabel: activeLoan
        ? buildNextDueLabel(activeLoan, latestRepayment ?? undefined)
        : "No active loan",
      branchContact: buildBranchContact(branch?.name ?? "Branch", branch?.phone ?? null),
      flowTrend: buildMemberTrend(transactionRows),
    };
  },

  async getMemberTransactions(): Promise<TransactionRequest[]> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["member"]);
    const branch = await getBranch(profile.branchId);
    const { data, error } = await supabase
      .from("transaction_requests")
      .select(
        "id, member_profile_id, member_account_id, agent_profile_id, transaction_type, amount, status, created_at, note",
      )
      .eq("member_profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = filterTransactionsForMember(
      (data as TransactionRow[] | null) ?? [],
      profile.id,
    );
    const agentIds = Array.from(new Set(rows.map((row) => row.agent_profile_id)));
    const accountIds = Array.from(new Set(rows.map((row) => row.member_account_id)));
    const [agentMap, accountRows] = await Promise.all([
      getProfilesByIds(agentIds),
      accountIds.length
        ? supabase
            .from("member_accounts")
            .select("id, member_profile_id, account_type, account_number, status")
            .in("id", accountIds)
        : Promise.resolve({ data: [] as MemberAccountRow[], error: null }),
    ]);

    if (accountRows.error) {
      throw accountRows.error;
    }

    const accountMap = new Map(
      (((accountRows.data as MemberAccountRow[] | null) ?? [])).map((row) => [row.id, row]),
    );

    return rows.map((row) =>
      buildTransactionLabel(
        row,
        profile.fullName,
        branch?.id ?? profile.branchId ?? "",
        branch?.name ?? "Assigned Branch",
        agentMap.get(row.agent_profile_id)?.full_name ?? "Assigned agent",
        accountMap.get(row.member_account_id)?.account_type ?? "savings",
      ),
    );
  },

  async getLoans(): Promise<LoanCard[]> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["member"]);
    const { data, error } = await supabase
      .from("loans")
      .select(
        "id, application_id, branch_id, member_profile_id, approved_principal, remaining_principal, monthly_interest_rate, disbursed_at, status, created_at",
      )
      .eq("member_profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const loans = (data as LoanRow[] | null) ?? [];
    const applicationIds = Array.from(
      new Set(loans.map((loan) => loan.application_id).filter(Boolean)),
    );
    const loanIds = loans.map((loan) => loan.id);

    const [applicationResponse, repaymentResponse] = await Promise.all([
      applicationIds.length
        ? supabase
            .from("loan_applications")
            .select("id, status, created_at, collateral_required")
            .in("id", applicationIds)
        : Promise.resolve({ data: [] as LoanApplicationRow[], error: null }),
      loanIds.length
        ? supabase
            .from("loan_repayments")
            .select("loan_id, created_at, repayment_mode")
            .in("loan_id", loanIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as LoanRepaymentRow[], error: null }),
    ]);

    if (applicationResponse.error) {
      throw applicationResponse.error;
    }

    if (repaymentResponse.error) {
      throw repaymentResponse.error;
    }

    const applicationMap = new Map(
      (((applicationResponse.data as LoanApplicationRow[] | null) ?? [])).map((row) => [row.id, row]),
    );
    const repaymentMap = new Map<string, LoanRepaymentRow>();

    for (const row of ((repaymentResponse.data as LoanRepaymentRow[] | null) ?? [])) {
      if (!repaymentMap.has(row.loan_id)) {
        repaymentMap.set(row.loan_id, row);
      }
    }

    return loans.map((loan) => {
      const application = applicationMap.get(loan.application_id);
      const latestRepayment = repaymentMap.get(loan.id);
      const remainingPrincipal = toNumber(loan.remaining_principal);
      const monthlyInterestRate = toNumber(loan.monthly_interest_rate);

      return {
        id: loan.id,
        loanCode: `LN-${new Date(loan.created_at).getFullYear()}-${loan.id
          .replace(/-/g, "")
          .slice(0, 4)
          .toUpperCase()}`,
        memberId: profile.id,
        memberName: profile.fullName,
        branchId: loan.branch_id,
        approvedPrincipal: toNumber(loan.approved_principal),
        remainingPrincipal,
        monthlyInterestRate,
        status: loan.status,
        nextInterestDue: calculateMonthlyInterest(
          remainingPrincipal,
          monthlyInterestRate,
        ),
        collateralRequired: application?.collateral_required ?? false,
        nextDueLabel: buildNextDueLabel(loan, latestRepayment),
        repaymentModeLabel:
          latestRepayment?.repayment_mode === "interest_only"
            ? "Interest only"
            : "Interest plus principal",
        stageTimeline: [
          {
            id: `${loan.id}-submitted`,
            label: "Application submitted",
            date: formatDateLabel(application?.created_at ?? loan.created_at),
            state: "APPROVED",
          },
          {
            id: `${loan.id}-review`,
            label: titleCase(application?.status ?? "under_review"),
            date: formatDateLabel(loan.created_at),
            state:
              loan.status === "rejected" ? "REJECTED" : "APPROVED",
          },
          ...(loan.disbursed_at
            ? [
                {
                  id: `${loan.id}-disbursed`,
                  label: "Disbursed",
                  date: formatDateLabel(loan.disbursed_at),
                  state: "APPROVED",
                },
              ]
            : []),
          {
            id: `${loan.id}-status`,
            label: titleCase(loan.status),
            date: formatDateLabel(latestRepayment?.created_at ?? loan.created_at),
            state:
              loan.status === "defaulted"
                ? "RECONCILIATION REQUIRED"
                : loan.status === "rejected"
                  ? "REJECTED"
                  : "APPROVED",
          },
        ],
      };
    });
  },

  async getMemberProfile(): Promise<AssignedMember> {
    const supabase = getSupabaseClient();
    const profile = await requireCurrentMobileProfile(["member"]);
    const [branch, memberProfileResponse, accountRows, transactionRows, profileMap] = await Promise.all([
      getBranch(profile.branchId),
      supabase
        .from("member_profiles")
        .select(
          "profile_id, branch_id, assigned_agent_id, date_of_birth, gender, residential_address, occupation, id_type, id_number, next_of_kin_name, next_of_kin_phone, next_of_kin_address, sign_in_code, status",
        )
        .eq("profile_id", profile.id)
        .maybeSingle(),
      getAccountRowsForMemberIds([profile.id]),
      getTransactionsForMemberIds([profile.id]),
      getProfilesByIds([profile.id]),
    ]);

    if (memberProfileResponse.error) {
      throw memberProfileResponse.error;
    }

    const memberProfile = (memberProfileResponse.data as MemberProfileRow | null) ?? null;
    const accountMap = new Map(accountRows.map((row) => [row.id, row]));
    const balanceMap = buildBalanceMap(transactionRows, accountMap);
    const balances = getBalancesForMember(profile.id, accountRows, balanceMap);
    const latestTransaction = transactionRows[0];
    const agentMap =
      memberProfile?.assigned_agent_id
        ? await getProfilesByIds([memberProfile.assigned_agent_id])
        : new Map<string, ProfileRow>();

    return {
      id: profile.id,
      code: memberProfile?.sign_in_code ?? formatProfileCode("MB", profile.id),
      branchId: memberProfile?.branch_id ?? profile.branchId ?? "",
      branchName: branch?.name ?? "Assigned Branch",
      agentId: memberProfile?.assigned_agent_id ?? "",
      agentName:
        memberProfile?.assigned_agent_id
          ? agentMap.get(memberProfile.assigned_agent_id)?.full_name ?? "Assigned agent"
          : "Unassigned",
      fullName: profile.fullName,
      phone: profileMap.get(profile.id)?.phone ?? "No phone on file",
      status: toMemberStatus(memberProfile?.status ?? "pending"),
      dateOfBirth: memberProfile?.date_of_birth ?? undefined,
      gender: memberProfile?.gender ?? undefined,
      occupation: memberProfile?.occupation ?? undefined,
      address: memberProfile?.residential_address ?? undefined,
      idType: memberProfile?.id_type ?? undefined,
      idNumber: memberProfile?.id_number ?? undefined,
      nextOfKinName: memberProfile?.next_of_kin_name ?? undefined,
      nextOfKinPhone: memberProfile?.next_of_kin_phone ?? undefined,
      nextOfKinAddress: memberProfile?.next_of_kin_address ?? undefined,
      village: memberProfile?.residential_address ?? "Address pending",
      savingsBalance: balances.savingsBalance,
      depositBalance: balances.depositBalance,
      lastActivity: buildLastActivity(latestTransaction),
    };
  },
};
