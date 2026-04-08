import type {
  LoanDetailSummary,
  MemberProfile,
  TransactionRequest,
} from "@credit-union/shared";

export type SyncState =
  | "ONLINE"
  | "OFFLINE"
  | "PENDING SYNC"
  | "SYNCING"
  | "FAILED TO SYNC";

export interface TrendDatum {
  label: string;
  value: number;
}

export interface AgentActivityItem {
  id: string;
  title: string;
  memberName: string;
  amount: number;
  status: string;
  timeLabel: string;
}

export interface AssignedMember extends MemberProfile {
  code: string;
  village: string;
  savingsBalance: number;
  depositBalance: number;
  lastActivity: string;
}

export interface SyncQueueItem {
  id: string;
  type: string;
  amount: number;
  memberName: string;
  status: SyncState | "PENDING APPROVAL";
  note: string;
}

export interface AgentDashboard {
  syncState: SyncState;
  pendingSyncCount: number;
  agentName: string;
  agentCode: string;
  branchName: string;
  welcomeNote: string;
  lastSyncLabel: string;
  collectionsToday: number;
  withdrawalsToday: number;
  pendingApprovals: number;
  cashOnHand: number;
  expectedCash: number;
  activity: AgentActivityItem[];
  flowTrend: TrendDatum[];
}

export interface MemberDashboard {
  syncState: SyncState;
  memberName: string;
  memberCode: string;
  branchName: string;
  savingsBalance: number;
  depositBalance: number;
  availableBalance: number;
  outstandingLoan: number;
  nextDueLabel: string;
  branchContact: string;
  flowTrend: TrendDatum[];
}

export interface LoanCard extends LoanDetailSummary {
  loanCode: string;
  nextDueLabel: string;
  repaymentModeLabel: string;
  stageTimeline: { id: string; label: string; date: string; state: string }[];
}

export type MobileTransactionCard = TransactionRequest;
