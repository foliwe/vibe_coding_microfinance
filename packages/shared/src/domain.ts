export type UserRole = "member" | "agent" | "branch_manager" | "admin";

export type AccountType =
  | "savings"
  | "deposit"
  | "loan_principal"
  | "loan_interest"
  | "agent_cash_drawer"
  | "branch_cash_vault";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "loan_disbursement"
  | "loan_repayment"
  | "reversal";

export type TransactionRequestStatus =
  | "draft"
  | "unsynced"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "reversed"
  | "sync_conflict";

export type LoanStatus =
  | "application_submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "disbursed"
  | "active"
  | "closed"
  | "defaulted";

export type RepaymentMode = "interest_only" | "interest_plus_principal";

export interface BranchSummary {
  id: string;
  name: string;
  managerName: string;
  memberCount: number;
  agentCount: number;
  totalSavings: number;
  totalDeposits: number;
  totalLoans: number;
  outstandingPrincipal: number;
  pendingApprovals: number;
  cashVariance: number;
}

export interface AdminDashboardSummary {
  branchCount: number;
  totalMembers: number;
  totalAgents: number;
  totalSavings: number;
  totalDeposits: number;
  totalLoans: number;
  outstandingPrincipal: number;
  interestCollected: number;
  overdueLoans: number;
  pendingApprovals: number;
  cashVariance: number;
  branchPerformance: BranchSummary[];
}

export interface BranchDashboardSummary {
  branchId: string;
  branchName: string;
  totalMembers: number;
  activeAgents: number;
  newMembersThisMonth: number;
  totalSavings: number;
  totalDeposits: number;
  totalLoans: number;
  outstandingPrincipal: number;
  interestCollected: number;
  overdueLoans: number;
  pendingApprovals: number;
  expectedCashToday: number;
  cashVariance: number;
  agentPerformance: AgentPerformance[];
}

export interface AgentPerformance {
  id: string;
  name: string;
  collectionsToday: number;
  pendingApprovals: number;
  cashVariance: number;
}

export interface MemberProfile {
  id: string;
  branchId: string;
  branchName: string;
  agentId: string;
  agentName: string;
  fullName: string;
  phone: string;
  status: "active" | "pending" | "suspended";
  occupation?: string;
  address?: string;
}

export interface MemberAccountSummary {
  memberId: string;
  savingsBalance: number;
  depositBalance: number;
  pendingTransactions: number;
}

export interface TransactionRequest {
  id: string;
  memberId: string;
  memberName: string;
  branchId: string;
  branchName: string;
  agentId: string;
  agentName: string;
  type: TransactionType;
  accountType: Extract<AccountType, "savings" | "deposit">;
  amount: number;
  status: TransactionRequestStatus;
  createdAt: string;
  note?: string;
}

export interface LoanDetailSummary {
  id: string;
  memberId: string;
  memberName: string;
  branchId: string;
  approvedPrincipal: number;
  remainingPrincipal: number;
  monthlyInterestRate: number;
  status: LoanStatus;
  nextInterestDue: number;
  collateralRequired: boolean;
}

export interface OfflineSyncEnvelope<TPayload = unknown> {
  idempotencyKey: string;
  deviceId: string;
  actorId: string;
  operationType: "transaction_request" | "member_draft";
  createdAt: string;
  payloadHash: string;
  payload: TPayload;
}

export interface ApprovalActionPayload {
  requestId: string;
  action: "approve" | "reject" | "reverse";
  note?: string;
  actorId: string;
}

export interface ReportRequest {
  type:
    | "daily_collections"
    | "member_statement"
    | "loan_portfolio"
    | "arrears_default"
    | "reconciliation_variance"
    | "audit_trail";
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  agentId?: string;
  status?: string;
  format: "csv" | "xlsx" | "pdf";
}

export interface ReportResult {
  reportId: string;
  status: "queued" | "running" | "completed" | "failed";
  downloadUrl?: string;
}
