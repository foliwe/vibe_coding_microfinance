import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyRpcError,
  isEnvelope,
  isTransactionPayload,
} from "../supabase/functions/sync-ingest/core.ts";

test("isEnvelope accepts well-formed sync envelopes", () => {
  assert.equal(
    isEnvelope({
      actorId: "agent-1",
      createdAt: "2026-04-01T10:00:00.000Z",
      deviceId: "device-1",
      idempotencyKey: "key-1",
      operationType: "transaction_request",
      payload: { amount: 50, memberAccountId: "account-1", transactionType: "deposit" },
      payloadHash: "hash-1",
    }),
    true,
  );
});

test("isEnvelope rejects missing payloads", () => {
  assert.equal(
    isEnvelope({
      actorId: "agent-1",
      createdAt: "2026-04-01T10:00:00.000Z",
      deviceId: "device-1",
      idempotencyKey: "key-1",
      operationType: "transaction_request",
      payloadHash: "hash-1",
    }),
    false,
  );
});

test("isTransactionPayload validates required fields", () => {
  assert.equal(
    isTransactionPayload({
      amount: 75,
      memberAccountId: "account-1",
      transactionType: "withdrawal",
    }),
    true,
  );

  assert.equal(
    isTransactionPayload({
      amount: "75",
      memberAccountId: "account-1",
      transactionType: "withdrawal",
    }),
    false,
  );
});

test("classifyRpcError treats assignment and branch validation failures as conflicts", () => {
  assert.equal(classifyRpcError("Member is not assigned to this agent."), "conflict");
  assert.equal(classifyRpcError("Branch mismatch for member account."), "conflict");
  assert.equal(classifyRpcError("Unexpected database timeout"), "rejected");
});
