import type {
  TransactionRequest,
  TransactionRequestStatus,
} from "@credit-union/shared";
import type {
  AgentDashboard,
  AssignedMember,
  LoanCard,
  MemberDashboard,
  SyncQueueItem,
} from "@/lib/mobile-models";

function buildTransaction(
  id: string,
  type: TransactionRequest["type"],
  amount: number,
  status: TransactionRequestStatus,
  memberName: string,
  createdAt: string
): TransactionRequest {
  return {
    id,
    memberId: "member-001",
    memberName,
    branchId: "branch-main",
    branchName: "Main Branch",
    agentId: "agent-001",
    agentName: "David N.",
    type,
    accountType: type === "withdrawal" ? "deposit" : "savings",
    amount,
    status,
    createdAt,
    note: "Demo mode transaction preview",
  };
}

export const demoAgentDashboard: AgentDashboard = {
  syncState: "OFFLINE",
  pendingSyncCount: 3,
  agentName: "David N.",
  agentCode: "AG-0001",
  branchName: "Main Branch",
  welcomeNote: "Field-ready dashboard for deposits, withdrawals, and member onboarding.",
  lastSyncLabel: "Last synced 18 min ago",
  collectionsToday: 45000,
  withdrawalsToday: 12000,
  pendingApprovals: 8,
  cashOnHand: 33000,
  expectedCash: 35000,
  activity: [
    { id: "act-1", title: "Deposit logged", memberName: "Alice K.", amount: 10000, status: "PENDING APPROVAL", timeLabel: "09:12" },
    { id: "act-2", title: "Withdrawal queued", memberName: "Musa Traders", amount: 5000, status: "PENDING SYNC", timeLabel: "10:04" },
    { id: "act-3", title: "Savings posted", memberName: "XYZ Group", amount: 2500, status: "APPROVED", timeLabel: "10:42" },
  ],
  flowTrend: [
    { label: "Mon", value: 14 },
    { label: "Tue", value: 18 },
    { label: "Wed", value: 11 },
    { label: "Thu", value: 22 },
    { label: "Fri", value: 19 },
  ],
};

export const demoAssignedMembers: AssignedMember[] = [
  {
    id: "member-001",
    code: "MB-0001",
    branchId: "branch-main",
    branchName: "Main Branch",
    agentId: "agent-001",
    agentName: "David N.",
    fullName: "Alice K.",
    phone: "+233 20 111 1001",
    status: "active",
    occupation: "Retailer",
    address: "Kasoa North",
    village: "Kasoa North",
    savingsBalance: 40000,
    depositBalance: 20000,
    lastActivity: "Deposit approved 2h ago",
  },
  {
    id: "member-002",
    code: "MB-0002",
    branchId: "branch-main",
    branchName: "Main Branch",
    agentId: "agent-001",
    agentName: "David N.",
    fullName: "XYZ Group",
    phone: "+233 20 111 1002",
    status: "active",
    occupation: "Group Savings",
    address: "Market Line 2",
    village: "Market Line 2",
    savingsBalance: 68000,
    depositBalance: 12000,
    lastActivity: "Savings posted 35m ago",
  },
  {
    id: "member-003",
    code: "MB-0003",
    branchId: "branch-main",
    branchName: "Main Branch",
    agentId: "agent-001",
    agentName: "David N.",
    fullName: "Musa Traders",
    phone: "+233 20 111 1003",
    status: "active",
    occupation: "Wholesale",
    address: "Harbor Road",
    village: "Harbor Road",
    savingsBalance: 25500,
    depositBalance: 18500,
    lastActivity: "Withdrawal queued 15m ago",
  },
  {
    id: "member-004",
    code: "MB-0004",
    branchId: "branch-main",
    branchName: "Main Branch",
    agentId: "agent-001",
    agentName: "David N.",
    fullName: "Safiya O.",
    phone: "+233 20 111 1004",
    status: "pending",
    occupation: "Tailor",
    address: "Green Court",
    village: "Green Court",
    savingsBalance: 0,
    depositBalance: 0,
    lastActivity: "Draft profile awaiting approval",
  },
];

export const demoAgentTransactions: TransactionRequest[] = [
  buildTransaction("tx-1001", "deposit", 10000, "pending_approval", "Alice K.", "2026-03-29T09:12:00Z"),
  buildTransaction("tx-1002", "withdrawal", 5000, "unsynced", "Musa Traders", "2026-03-29T10:04:00Z"),
  buildTransaction("tx-1003", "deposit", 2500, "approved", "XYZ Group", "2026-03-29T10:42:00Z"),
  buildTransaction("tx-1004", "deposit", 3000, "sync_conflict", "Safiya O.", "2026-03-29T11:20:00Z"),
];

export const demoSyncQueue: SyncQueueItem[] = [
  {
    id: "queue-1",
    type: "Deposit",
    amount: 10000,
    memberName: "Alice K.",
    status: "PENDING SYNC",
    note: "Stored locally on device A12",
  },
  {
    id: "queue-2",
    type: "Withdrawal",
    amount: 5000,
    memberName: "Musa Traders",
    status: "FAILED TO SYNC",
    note: "Retry required after connectivity returns",
  },
  {
    id: "queue-3",
    type: "Member draft",
    amount: 0,
    memberName: "Safiya O.",
    status: "PENDING APPROVAL",
    note: "Awaiting branch manager activation",
  },
];

export const demoMemberDashboard: MemberDashboard = {
  syncState: "ONLINE",
  memberName: "Alice K.",
  memberCode: "MB-0001",
  branchName: "Main Branch",
  savingsBalance: 40000,
  depositBalance: 20000,
  availableBalance: 18500,
  outstandingLoan: 80000,
  nextDueLabel: "12 May",
  branchContact: "Main Branch support: +233 20 555 0100",
  flowTrend: [
    { label: "Jan", value: 8 },
    { label: "Feb", value: 11 },
    { label: "Mar", value: 9 },
    { label: "Apr", value: 14 },
  ],
};

export const demoMemberTransactions: TransactionRequest[] = [
  buildTransaction("mtx-1", "deposit", 10000, "approved", "Alice K.", "2026-03-12T11:00:00Z"),
  buildTransaction("mtx-2", "withdrawal", 5000, "pending_approval", "Alice K.", "2026-03-19T12:15:00Z"),
  buildTransaction("mtx-3", "deposit", 2500, "approved", "Alice K.", "2026-03-24T08:40:00Z"),
];

export const demoLoans: LoanCard[] = [
  {
    id: "loan-100",
    loanCode: "LN-2026-004",
    memberId: "member-001",
    memberName: "Alice K.",
    branchId: "branch-main",
    approvedPrincipal: 100000,
    remainingPrincipal: 80000,
    monthlyInterestRate: 4,
    status: "active",
    nextInterestDue: 12000,
    collateralRequired: false,
    nextDueLabel: "12 May 2026",
    repaymentModeLabel: "Interest plus principal",
    stageTimeline: [
      { id: "loan-stage-1", label: "Application submitted", date: "03 Feb", state: "APPROVED" },
      { id: "loan-stage-2", label: "Under review", date: "05 Feb", state: "APPROVED" },
      { id: "loan-stage-3", label: "Disbursed", date: "12 Feb", state: "APPROVED" },
      { id: "loan-stage-4", label: "Active repayment", date: "Today", state: "PENDING APPROVAL" },
    ],
  },
];

export const demoMemberProfile: AssignedMember = {
  ...demoAssignedMembers[0],
  village: "Kasoa North",
};
