interface SyncEnvelope<TPayload = unknown> {
  idempotencyKey: string;
  deviceId: string;
  actorId: string;
  operationType: "transaction_request" | "member_draft";
  createdAt: string;
  payloadHash: string;
  payload: TPayload;
}

interface SyncResult {
  idempotencyKey: string;
  status: "accepted" | "rejected" | "duplicate" | "conflict";
  reason?: string;
}

function isEnvelope(input: unknown): input is SyncEnvelope {
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
    typeof candidate.payloadHash === "string"
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  const results: SyncResult[] = items.map((item) => {
    if (!isEnvelope(item)) {
      return {
        idempotencyKey: "invalid",
        status: "rejected",
        reason: "Malformed sync envelope",
      };
    }

    const syncAgeHours =
      (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);

    if (Number.isNaN(syncAgeHours)) {
      return {
        idempotencyKey: item.idempotencyKey,
        status: "rejected",
        reason: "Invalid timestamp",
      };
    }

    if (syncAgeHours > 72) {
      return {
        idempotencyKey: item.idempotencyKey,
        status: "conflict",
        reason: "Offline item too old for automatic acceptance",
      };
    }

    return {
      idempotencyKey: item.idempotencyKey,
      status: "accepted",
    };
  });

  return Response.json({ results });
});
