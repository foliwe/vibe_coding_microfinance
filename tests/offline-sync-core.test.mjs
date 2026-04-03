import test from "node:test";
import assert from "node:assert/strict";

import {
  createQueuedTransactionEntry,
  queueEntryToTransactionRequest,
  toQueueNote,
  toQueueSyncLabel,
  withRetryMetadata,
} from "../apps/mobile/src/lib/offline-sync-core.ts";

test("createQueuedTransactionEntry normalizes payload and produces idempotency metadata", () => {
  const entry = createQueuedTransactionEntry({
    accountType: "savings",
    actorId: "agent-1",
    amount: 125.678,
    createdAt: "2026-04-01T10:00:00.000Z",
    deviceId: "device-9",
    memberAccountId: "account-1",
    memberId: "member-1",
    memberName: "Ada Lovelace",
    note: "  First collection  ",
    transactionType: "deposit",
  });

  assert.equal(entry.status, "unsynced");
  assert.equal(entry.retryCount, 0);
  assert.equal(entry.payload.amount, 125.68);
  assert.equal(entry.payload.note, "First collection");
  assert.match(entry.idempotencyKey, /^device-9-agent-1-2026-04-01T10:00:00.000Z-/);
});

test("queueEntryToTransactionRequest maps queued items into transaction cards", () => {
  const entry = createQueuedTransactionEntry({
    accountType: "deposit",
    actorId: "agent-1",
    amount: 40,
    createdAt: "2026-04-01T10:00:00.000Z",
    memberAccountId: "account-2",
    memberId: "member-2",
    memberName: "Grace Hopper",
    transactionType: "withdrawal",
  });

  const card = queueEntryToTransactionRequest(entry, {
    agentId: "agent-1",
    agentName: "Agent Name",
    branchId: "branch-1",
    branchName: "Rome Branch",
  });

  assert.deepEqual(card, {
    accountType: "deposit",
    agentId: "agent-1",
    agentName: "Agent Name",
    amount: 40,
    branchId: "branch-1",
    branchName: "Rome Branch",
    createdAt: "2026-04-01T10:00:00.000Z",
    id: entry.idempotencyKey,
    memberId: "member-2",
    memberName: "Grace Hopper",
    note: undefined,
    status: "unsynced",
    type: "withdrawal",
  });
});

test("withRetryMetadata marks queue entries as conflicts and preserves prior reason when needed", async () => {
  const entry = createQueuedTransactionEntry({
    accountType: "savings",
    actorId: "agent-1",
    amount: 20,
    createdAt: "2026-04-01T10:00:00.000Z",
    memberAccountId: "account-3",
    memberId: "member-3",
    memberName: "Mary Jackson",
    note: "Queued note",
    transactionType: "deposit",
  });

  const retried = withRetryMetadata(entry, "sync_conflict", "Branch mismatch");
  assert.equal(retried.status, "sync_conflict");
  assert.equal(retried.retryCount, 1);
  assert.equal(retried.lastError, "Branch mismatch");
  assert.ok(retried.lastTriedAt);
  assert.equal(toQueueSyncLabel(retried.status), "FAILED TO SYNC");
  assert.equal(toQueueNote(retried), "Branch mismatch");

  const retriedAgain = withRetryMetadata(retried, "sync_conflict", undefined);
  assert.equal(retriedAgain.lastError, "Branch mismatch");
  assert.equal(retriedAgain.retryCount, 2);
});
