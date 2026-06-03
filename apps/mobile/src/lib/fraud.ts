import { getErrorMessage } from "./errors";
import { getSupabaseClient } from "./supabase/client";

export async function recordMobileStaffAuthEvent(identity: {
  id: string;
  kind: "mobile";
  name: string;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("record_fraud_auth_event", {
    p_channel: "mobile_app",
    p_device_id: identity.id,
    p_device_kind: identity.kind,
    p_device_name: identity.name,
  });

  if (error) {
    console.warn("Unable to record mobile staff auth event.", error);
  }
}

export async function evaluateMobileFraudEvent(input: {
  actorId: string;
  branchId?: string | null;
  cashReconciliationId?: string | null;
  eventType:
    | "device_asserted"
    | "device_registered"
    | "transaction_created"
    | "reconciliation_submitted";
  metadata?: Record<string, unknown>;
  transactionRequestId?: string | null;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("evaluate_fraud_event", {
    p_actor_id: input.actorId,
    p_branch_id: input.branchId ?? null,
    p_cash_reconciliation_id: input.cashReconciliationId ?? null,
    p_event_type: input.eventType,
    p_metadata: input.metadata ?? {},
    p_transaction_request_id: input.transactionRequestId ?? null,
  });

  if (error) {
    console.warn(`Unable to evaluate mobile fraud event "${input.eventType}".`, error);
  }
}

export async function recordFailedTransactionPin(deviceId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("record_failed_transaction_pin", {
    p_device_id: deviceId,
  });

  if (error) {
    console.warn(getErrorMessage(error, "Unable to record failed transaction PIN attempt."));
  }
}
