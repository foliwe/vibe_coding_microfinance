export const PASSWORD_POLICY = {
  minimumLength: 12,
} as const;

export const FRAUD_SEVERITY_SCORES = {
  low: 30,
  medium: 60,
  high: 85,
} as const;

export type FraudSeverity = keyof typeof FRAUD_SEVERITY_SCORES;

export type FraudAlertStatus =
  | "open"
  | "investigating"
  | "resolved"
  | "false_positive";

export type FraudRuleId =
  | "login_anomaly"
  | "offline_transaction_burst"
  | "unusual_deposit_size"
  | "multi_device_access"
  | "fast_approval"
  | "agent_behavioral_pattern"
  | "duplicate_cash_entry"
  | "failed_pin_attempts"
  | "out_of_branch_handling"
  | "dormant_account_reactivation_spike"
  | "reconciliation_variance";

export type FraudRuleDefinition = {
  description: string;
  id: FraudRuleId;
  severity: FraudSeverity;
  summaryLabel: string;
  thresholdLabel: string;
  title: string;
};

export type FraudAlertRecord = {
  agentProfileId: string | null;
  assignedTo: string | null;
  branchId: string;
  cashReconciliationId: string | null;
  detectedAt: string;
  evidence: Record<string, unknown>;
  fingerprint: string;
  id: string;
  lastSeenAt: string;
  memberProfileId: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  ruleId: FraudRuleId;
  score: number;
  severity: FraudSeverity;
  status: FraudAlertStatus;
  summary: string;
  title: string;
  transactionRequestId: string | null;
};

export type FraudDashboardSummary = {
  averageApprovalSeconds: number;
  highRiskTransactions: number;
  multiDeviceFlags: number;
  offlineBurstCases: number;
  openAlerts: number;
};

export const FRAUD_RULE_CATALOG: Record<FraudRuleId, FraudRuleDefinition> = {
  login_anomaly: {
    id: "login_anomaly",
    title: "Login anomalies",
    summaryLabel: "Identity and session anomalies",
    severity: "medium",
    thresholdLabel:
      "Different trusted device/workstation within 24h or repeated denied device access",
    description:
      "Highlights staff sign-ins that follow unusual device activity or repeated access denials.",
  },
  offline_transaction_burst: {
    id: "offline_transaction_burst",
    title: "Offline transaction bursts",
    summaryLabel: "Burst of offline cash capture",
    severity: "high",
    thresholdLabel: "3+ offline deposits in 20m or FCFA 150,000+ offline in 60m",
    description:
      "Flags sudden clusters of offline deposit capture that could mask delayed or duplicated cash posting.",
  },
  unusual_deposit_size: {
    id: "unusual_deposit_size",
    title: "Unusual deposit sizes",
    summaryLabel: "Deposit amount outlier",
    severity: "medium",
    thresholdLabel:
      "At least 3x trailing 30-day average and FCFA 50,000+, or first deposit FCFA 100,000+",
    description:
      "Compares new deposits against the member's recent history to surface outlier cash movements.",
  },
  multi_device_access: {
    id: "multi_device_access",
    title: "Multi-device access",
    summaryLabel: "Conflicting device trust activity",
    severity: "high",
    thresholdLabel: "Blocked mismatch, rebind-required access, or reset/re-register within 7 days",
    description:
      "Surfaces suspicious device churn across trusted phones and branch workstations.",
  },
  fast_approval: {
    id: "fast_approval",
    title: "Fast approvals",
    summaryLabel: "Approval speed anomaly",
    severity: "medium",
    thresholdLabel: "Approval under 60s or 5+ approvals by one approver in 10m",
    description:
      "Catches review behavior that is unusually fast or dense for normal maker-checker controls.",
  },
  agent_behavioral_pattern: {
    id: "agent_behavioral_pattern",
    title: "Agent behavioral patterns",
    summaryLabel: "Concentrated agent activity",
    severity: "medium",
    thresholdLabel: "10+ transactions in 60m or same member >60% of the last 20 transactions",
    description:
      "Monitors whether an agent's cash activity is unusually concentrated by time or member.",
  },
  duplicate_cash_entry: {
    id: "duplicate_cash_entry",
    title: "Duplicate cash entries",
    summaryLabel: "Potential duplicate posting",
    severity: "high",
    thresholdLabel: "Same agent, member, account, type, and amount repeated within 15m",
    description:
      "Looks for near-identical cash transactions that could indicate duplicate submission or fraud.",
  },
  failed_pin_attempts: {
    id: "failed_pin_attempts",
    title: "Failed PIN attempts",
    summaryLabel: "Withdrawal PIN failures",
    severity: "high",
    thresholdLabel: "3+ failed live withdrawal PIN validations in 30m",
    description:
      "Escalates repeated withdrawal PIN failures that may suggest credential guessing or coercion.",
  },
  out_of_branch_handling: {
    id: "out_of_branch_handling",
    title: "Out-of-branch handling",
    summaryLabel: "Scope mismatch event",
    severity: "high",
    thresholdLabel: "Approval or device event where actor scope does not match branch scope",
    description:
      "Surfaces actions that appear outside the branch scope expected for the staff member's role.",
  },
  dormant_account_reactivation_spike: {
    id: "dormant_account_reactivation_spike",
    title: "Dormant account reactivation spikes",
    summaryLabel: "Dormant account cash-out pattern",
    severity: "high",
    thresholdLabel: "Withdrawal >= 80% of a deposit within 48h after 90+ days of inactivity",
    description:
      "Flags cash-out behavior shortly after a dormant account becomes active again.",
  },
  reconciliation_variance: {
    id: "reconciliation_variance",
    title: "Reconciliation variance",
    summaryLabel: "Cash reconciliation exception",
    severity: "medium",
    thresholdLabel: "Variance above FCFA 5,000 or 2 rejected reconciliations in 7 days",
    description:
      "Detects when end-of-day cash closeouts show large variance or repeated rejection patterns.",
  },
};

export const FRAUD_RULES = Object.values(FRAUD_RULE_CATALOG);

export function fraudSeverityToScore(severity: FraudSeverity) {
  return FRAUD_SEVERITY_SCORES[severity];
}
