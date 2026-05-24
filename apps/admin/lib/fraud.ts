import type { RpcCapableClient } from "./staff-device";

type FraudEventInput = {
  actorId: string;
  branchId?: string | null;
  cashReconciliationId?: string | null;
  eventType:
    | "device_asserted"
    | "device_registered"
    | "device_reset"
    | "transaction_approved"
    | "transaction_created"
    | "reconciliation_reviewed";
  metadata?: Record<string, unknown>;
  transactionRequestId?: string | null;
};

type AuthEventInput = {
  channel: "admin_web";
  deviceId?: string | null;
  deviceKind?: "workstation" | "mobile" | null;
  deviceName?: string | null;
};

export async function evaluateFraudEvent(
  supabase: RpcCapableClient,
  input: FraudEventInput,
) {
  const { error } = await supabase.rpc("evaluate_fraud_event", {
    p_actor_id: input.actorId,
    p_branch_id: input.branchId ?? null,
    p_cash_reconciliation_id: input.cashReconciliationId ?? null,
    p_event_type: input.eventType,
    p_metadata: input.metadata ?? {},
    p_transaction_request_id: input.transactionRequestId ?? null,
  });

  if (error) {
    console.warn(`Unable to evaluate fraud event "${input.eventType}".`, error);
  }
}

export async function recordStaffAuthEvent(
  supabase: RpcCapableClient,
  input: AuthEventInput,
) {
  const { error } = await supabase.rpc("record_fraud_auth_event", {
    p_channel: input.channel,
    p_device_id: input.deviceId ?? null,
    p_device_kind: input.deviceKind ?? null,
    p_device_name: input.deviceName ?? null,
  });

  if (error) {
    console.warn("Unable to record staff auth event.", error);
  }
}
