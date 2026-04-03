export type SyncEnvelope<TPayload = unknown> = {
  actorId: string;
  createdAt: string;
  deviceId: string;
  idempotencyKey: string;
  operationType: "transaction_request" | "member_draft";
  payload: TPayload;
  payloadHash: string;
};

export type TransactionRequestPayload = {
  accountType?: "savings" | "deposit";
  amount: number;
  memberAccountId: string;
  memberId?: string;
  memberName?: string;
  note?: string;
  transactionType: "deposit" | "withdrawal";
};

export type SyncResultStatus = "accepted" | "rejected" | "duplicate" | "conflict";

export function isEnvelope(input: unknown): input is SyncEnvelope {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;
  return (
    typeof candidate.idempotencyKey === "string" &&
    typeof candidate.deviceId === "string" &&
    typeof candidate.actorId === "string" &&
    typeof candidate.operationType === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.payloadHash === "string" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
}

export function isTransactionPayload(input: unknown): input is TransactionRequestPayload {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;
  return (
    typeof payload.memberAccountId === "string" &&
    typeof payload.transactionType === "string" &&
    typeof payload.amount === "number"
  );
}

export function classifyRpcError(message: string): SyncResultStatus {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("assigned to this agent") ||
    normalized.includes("branch mismatch") ||
    normalized.includes("active member account not found") ||
    normalized.includes("active member profile not found") ||
    normalized.includes("inactive") ||
    normalized.includes("required")
  ) {
    return "conflict";
  }

  return "rejected";
}
