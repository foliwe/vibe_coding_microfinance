import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OfflineSyncEnvelope } from "@credit-union/shared";

import type { SyncQueueItem } from "@/mocks/mobile-data";

import {
  createQueuedTransactionEntry,
  type OfflineSyncQueueEntry,
  type QueuedTransactionPayload,
  sortByCreatedAtDesc,
  toQueueNote,
  toQueueSyncLabel,
  toQueueTypeLabel,
  withRetryMetadata,
} from "./offline-sync-core";
import { getErrorMessage } from "./errors";
import { getMobileStaffDeviceIdentity } from "./staff-device";
import { getSupabaseClient } from "./supabase/client";

const STORAGE_KEY = "credit-union/offline-sync-queue/v1";

type SyncResult = {
  idempotencyKey: string;
  reason?: string;
  status: "accepted" | "rejected" | "duplicate" | "conflict";
};

type SyncResponse = {
  results?: SyncResult[];
};

export interface QueueSyncSummary {
  accepted: number;
  conflicts: number;
  duplicates: number;
  processed: number;
  rejected: number;
  remaining: number;
}

function isQueueEntry(
  value: unknown,
): value is OfflineSyncQueueEntry<QueuedTransactionPayload> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;
  const payload = entry.payload as Record<string, unknown> | undefined;

  return (
    typeof entry.idempotencyKey === "string" &&
    typeof entry.deviceId === "string" &&
    typeof entry.actorId === "string" &&
    typeof entry.operationType === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.payloadHash === "string" &&
    (entry.status === "unsynced" || entry.status === "sync_conflict") &&
    typeof entry.retryCount === "number" &&
    typeof entry.lastError !== "undefined" &&
    payload !== undefined &&
    typeof payload.memberAccountId === "string" &&
    typeof payload.memberId === "string" &&
    typeof payload.memberName === "string" &&
    typeof payload.transactionType === "string" &&
    typeof payload.accountType === "string" &&
    typeof payload.amount === "number"
  );
}

async function readQueue() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [] as OfflineSyncQueueEntry<QueuedTransactionPayload>[];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortByCreatedAtDesc(parsed.filter(isQueueEntry));
  } catch {
    return [];
  }
}

async function writeQueue(entries: OfflineSyncQueueEntry<QueuedTransactionPayload>[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortByCreatedAtDesc(entries)));
}

function toFunctionEnvelope(
  entry: OfflineSyncQueueEntry<QueuedTransactionPayload>,
): OfflineSyncEnvelope<QueuedTransactionPayload> {
  return {
    actorId: entry.actorId,
    createdAt: entry.createdAt,
    deviceId: entry.deviceId,
    idempotencyKey: entry.idempotencyKey,
    operationType: entry.operationType,
    payload: entry.payload,
    payloadHash: entry.payloadHash,
  };
}

export function isOfflineSyncableError(error: unknown) {
  const normalized = getErrorMessage(error, "").toLowerCase();

  return (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed") ||
    normalized.includes("network error") ||
    normalized.includes("fetch")
  );
}

export async function getOfflineSyncQueue() {
  return readQueue();
}

export async function getOfflineSyncQueueItems(): Promise<SyncQueueItem[]> {
  const queue = await readQueue();

  return queue.map((entry) => ({
    amount: entry.operationType === "transaction_request" ? entry.payload.amount : 0,
    id: entry.idempotencyKey,
    memberName:
      entry.operationType === "transaction_request"
        ? entry.payload.memberName
        : "Pending member",
    note: toQueueNote(entry),
    status: toQueueSyncLabel(entry.status),
    type:
      entry.operationType === "transaction_request"
        ? toQueueTypeLabel(entry.payload.transactionType, entry.operationType)
        : "Member draft",
  }));
}

export async function queueTransactionRequest(input: {
  accountType: QueuedTransactionPayload["accountType"];
  actorId: string;
  amount: number;
  memberAccountId: string;
  memberId: string;
  memberName: string;
  note?: string;
  transactionType: QueuedTransactionPayload["transactionType"];
}) {
  const device = await getMobileStaffDeviceIdentity();
  const entry = createQueuedTransactionEntry({
    ...input,
    deviceId: device.id,
  });

  const queue = await readQueue();
  await writeQueue([entry, ...queue.filter((item) => item.idempotencyKey !== entry.idempotencyKey)]);
  return entry;
}

export async function syncOfflineQueue(options?: { retryFailedOnly?: boolean }) {
  const queue = await readQueue();
  const targets = queue.filter((entry) =>
    options?.retryFailedOnly ? entry.status === "sync_conflict" : true,
  );

  if (targets.length === 0) {
    return {
      accepted: 0,
      conflicts: 0,
      duplicates: 0,
      processed: 0,
      rejected: 0,
      remaining: queue.length,
    } satisfies QueueSyncSummary;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("sync-ingest", {
    body: {
      items: targets.map(toFunctionEnvelope),
    },
  });

  if (error) {
    throw error;
  }

  const results = Array.isArray((data as SyncResponse | null)?.results)
    ? (((data as SyncResponse).results ?? []) as SyncResult[])
    : [];
  const resultMap = new Map(results.map((result) => [result.idempotencyKey, result]));

  let accepted = 0;
  let duplicates = 0;
  let conflicts = 0;
  let rejected = 0;

  const nextQueue: OfflineSyncQueueEntry<QueuedTransactionPayload>[] = [];

  for (const entry of queue) {
    const result = resultMap.get(entry.idempotencyKey);

    if (!result) {
      nextQueue.push(entry);
      continue;
    }

    if (result.status === "accepted") {
      accepted += 1;
      continue;
    }

    if (result.status === "duplicate") {
      duplicates += 1;
      continue;
    }

    if (result.status === "conflict") {
      conflicts += 1;
      nextQueue.push(withRetryMetadata(entry, "sync_conflict", result.reason));
      continue;
    }

    rejected += 1;
    nextQueue.push(withRetryMetadata(entry, "sync_conflict", result.reason));
  }

  await writeQueue(nextQueue);

  return {
    accepted,
    conflicts,
    duplicates,
    processed: targets.length,
    rejected,
    remaining: nextQueue.length,
  } satisfies QueueSyncSummary;
}
