import type { TransactionRequestStatus } from "@credit-union/shared";

import type { QueueItemStatus } from "./offline-queue";

export type StatusTone =
  | "offline"
  | "online"
  | "pendingSync"
  | "syncing"
  | "failedSync"
  | "pendingApproval"
  | "approved"
  | "rejected"
  | "flagged"
  | "reconciliationRequired"
  | "neutral";

export interface StatusDescriptor {
  tone: StatusTone;
  label: string;
}

export function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getQueueStatusDescriptor(status: QueueItemStatus): StatusDescriptor {
  switch (status) {
    case "unsynced":
      return { tone: "pendingSync", label: "PENDING SYNC" };
    case "syncing":
      return { tone: "syncing", label: "SYNCING" };
    case "pending_approval":
      return { tone: "pendingApproval", label: "PENDING APPROVAL" };
    case "approved":
      return { tone: "approved", label: "APPROVED" };
    case "rejected":
      return { tone: "rejected", label: "REJECTED" };
    case "sync_conflict":
      return { tone: "failedSync", label: "FAILED TO SYNC" };
    default:
      return { tone: "neutral", label: formatLabel(status) };
  }
}

export function getTransactionStatusDescriptor(
  status: TransactionRequestStatus,
): StatusDescriptor {
  if (status === "pending_approval") {
    return { tone: "pendingApproval", label: "PENDING APPROVAL" };
  }

  if (status === "approved") {
    return { tone: "approved", label: "APPROVED" };
  }

  if (status === "rejected") {
    return { tone: "rejected", label: "REJECTED" };
  }

  if (status === "unsynced" || status === "draft") {
    return { tone: "pendingSync", label: "PENDING SYNC" };
  }

  if (status === "sync_conflict") {
    return { tone: "failedSync", label: "FAILED TO SYNC" };
  }

  return { tone: "neutral", label: formatLabel(status) };
}

export function getConnectivityDescriptor(
  isOffline: boolean,
  isSyncing: boolean,
  hasFailures: boolean,
  hasPendingSync: boolean,
): StatusDescriptor {
  if (isOffline) {
    return { tone: "offline", label: "OFFLINE" };
  }

  if (isSyncing) {
    return { tone: "syncing", label: "SYNCING" };
  }

  if (hasFailures) {
    return { tone: "failedSync", label: "FAILED TO SYNC" };
  }

  if (hasPendingSync) {
    return { tone: "pendingSync", label: "PENDING SYNC" };
  }

  return { tone: "online", label: "ONLINE" };
}

export function getReconciliationDescriptor(difference: number): StatusDescriptor {
  if (difference === 0) {
    return { tone: "approved", label: "APPROVED" };
  }

  return { tone: "reconciliationRequired", label: "RECONCILIATION REQUIRED" };
}
