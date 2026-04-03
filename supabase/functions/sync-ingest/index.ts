import { createClient } from "npm:@supabase/supabase-js@2";
import {
  classifyRpcError,
  isEnvelope,
  isTransactionPayload,
  type SyncEnvelope,
  type TransactionRequestPayload,
} from "./core.ts";

type SyncResult = {
  idempotencyKey: string;
  reason?: string;
  status: "accepted" | "rejected" | "duplicate" | "conflict";
};

function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    return new Response("Supabase environment is not configured.", { status: 500 });
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const results: SyncResult[] = [];

  for (const item of items) {
    if (!isEnvelope(item)) {
      results.push({
        idempotencyKey: "invalid",
        reason: "Malformed sync envelope",
        status: "rejected",
      });
      continue;
    }

    const syncAgeHours =
      (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);

    if (Number.isNaN(syncAgeHours)) {
      results.push({
        idempotencyKey: item.idempotencyKey,
        reason: "Invalid timestamp",
        status: "rejected",
      });
      continue;
    }

    if (syncAgeHours > 72) {
      results.push({
        idempotencyKey: item.idempotencyKey,
        reason: "Offline item too old for automatic acceptance",
        status: "conflict",
      });
      continue;
    }

    if (item.operationType !== "transaction_request") {
      results.push({
        idempotencyKey: item.idempotencyKey,
        reason: "Unsupported sync operation",
        status: "rejected",
      });
      continue;
    }

    if (!isTransactionPayload(item.payload)) {
      results.push({
        idempotencyKey: item.idempotencyKey,
        reason: "Malformed transaction payload",
        status: "rejected",
      });
      continue;
    }

    const existing = await supabase
      .from("transaction_requests")
      .select("id")
      .eq("idempotency_key", item.idempotencyKey)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      results.push({
        idempotencyKey: item.idempotencyKey,
        reason: existing.error.message,
        status: "rejected",
      });
      continue;
    }

    if (existing.data?.id) {
      results.push({
        idempotencyKey: item.idempotencyKey,
        status: "duplicate",
      });
      continue;
    }

    const { error } = await supabase.rpc("create_transaction_request", {
      p_actor_id: item.actorId,
      p_amount: item.payload.amount,
      p_device_id: item.deviceId,
      p_idempotency_key: item.idempotencyKey,
      p_member_account_id: item.payload.memberAccountId,
      p_note: item.payload.note?.trim() || null,
      p_payload_hash: item.payloadHash,
      p_submitted_offline: true,
      p_transaction_type: item.payload.transactionType,
    });

    if (error) {
      results.push({
        idempotencyKey: item.idempotencyKey,
        reason: error.message,
        status: classifyRpcError(error.message),
      });
      continue;
    }

    results.push({
      idempotencyKey: item.idempotencyKey,
      status: "accepted",
    });
  }

  return Response.json({ results });
});
