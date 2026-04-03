import type {
  OfflineSyncEnvelope,
  TransactionRequest,
  TransactionType,
} from "@credit-union/shared";

type QueueOperationType = OfflineSyncEnvelope["operationType"];
type QueueStatus = Extract<TransactionRequest["status"], "unsynced" | "sync_conflict">;

export const OFFLINE_SYNC_DEVICE_ID = "expo-mobile";

export interface QueuedTransactionPayload {
  accountType: "savings" | "deposit";
  amount: number;
  memberAccountId: string;
  memberId: string;
  memberName: string;
  note?: string;
  transactionType: Extract<TransactionType, "deposit" | "withdrawal">;
}

export interface OfflineSyncQueueEntry<TPayload = unknown>
  extends OfflineSyncEnvelope<TPayload> {
  lastError: string | null;
  lastTriedAt: string | null;
  retryCount: number;
  status: QueueStatus;
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function simpleHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

export function toQueueSyncLabel(
  status: OfflineSyncQueueEntry<QueuedTransactionPayload>["status"],
) {
  return status === "sync_conflict" ? "FAILED TO SYNC" : "PENDING SYNC";
}

export function toQueueTypeLabel(
  type: QueuedTransactionPayload["transactionType"],
  operationType: QueueOperationType,
) {
  if (operationType === "member_draft") {
    return "Member draft";
  }

  return type === "deposit" ? "Deposit" : "Withdrawal";
}

export function toQueueNote(entry: OfflineSyncQueueEntry<QueuedTransactionPayload>) {
  if (entry.lastError) {
    return entry.lastError;
  }

  if (entry.payload.note?.trim()) {
    return entry.payload.note.trim();
  }

  return `Stored locally on ${entry.deviceId}`;
}

export function withRetryMetadata(
  entry: OfflineSyncQueueEntry<QueuedTransactionPayload>,
  status: QueueStatus,
  reason: string | undefined,
) {
  return {
    ...entry,
    lastError: reason ?? entry.lastError,
    lastTriedAt: new Date().toISOString(),
    retryCount: entry.retryCount + 1,
    status,
  } satisfies OfflineSyncQueueEntry<QueuedTransactionPayload>;
}

export function createQueuedTransactionEntry(input: {
  accountType: QueuedTransactionPayload["accountType"];
  actorId: string;
  amount: number;
  createdAt?: string;
  deviceId?: string;
  memberAccountId: string;
  memberId: string;
  memberName: string;
  note?: string;
  transactionType: QueuedTransactionPayload["transactionType"];
}) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const deviceId = input.deviceId ?? OFFLINE_SYNC_DEVICE_ID;
  const payload: QueuedTransactionPayload = {
    accountType: input.accountType,
    amount: Number(input.amount.toFixed(2)),
    memberAccountId: input.memberAccountId,
    memberId: input.memberId,
    memberName: input.memberName,
    note: input.note?.trim() || undefined,
    transactionType: input.transactionType,
  };
  const payloadHash = simpleHash(JSON.stringify(payload));

  return {
    actorId: input.actorId,
    createdAt,
    deviceId,
    idempotencyKey: `${deviceId}-${input.actorId}-${createdAt}-${payloadHash}`,
    lastError: null,
    lastTriedAt: null,
    operationType: "transaction_request" as const,
    payload,
    payloadHash,
    retryCount: 0,
    status: "unsynced" as const,
  } satisfies OfflineSyncQueueEntry<QueuedTransactionPayload>;
}

export function queueEntryToTransactionRequest(
  entry: OfflineSyncQueueEntry<QueuedTransactionPayload>,
  context: {
    agentId: string;
    agentName: string;
    branchId: string;
    branchName: string;
  },
): TransactionRequest | null {
  if (entry.operationType !== "transaction_request") {
    return null;
  }

  return {
    accountType: entry.payload.accountType,
    agentId: context.agentId,
    agentName: context.agentName,
    amount: entry.payload.amount,
    branchId: context.branchId,
    branchName: context.branchName,
    createdAt: entry.createdAt,
    id: entry.idempotencyKey,
    memberId: entry.payload.memberId,
    memberName: entry.payload.memberName,
    note: entry.payload.note,
    status: entry.status,
    type: entry.payload.transactionType,
  };
}
