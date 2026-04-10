const STAFF_DEVICE_RPC_NAMES = [
  "assert_staff_device_access",
  "register_my_device",
  "reset_staff_device",
] as const;

export const STAFF_DEVICE_RPC_MISSING_MESSAGE =
  "Staff device verification is unavailable until the latest backend update is applied. Ask an administrator to deploy the latest Supabase migrations and try again.";

type SupabaseRpcErrorLike = {
  code?: unknown;
  details?: unknown;
  error_description?: unknown;
  hint?: unknown;
  message?: unknown;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toErrorText(error: unknown) {
  if (error instanceof Error) {
    return normalizeText(error.message);
  }

  if (typeof error === "string") {
    return normalizeText(error);
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const rpcError = error as SupabaseRpcErrorLike;
  const parts = [
    normalizeText(rpcError.message),
    normalizeText(rpcError.details),
    normalizeText(rpcError.hint),
    normalizeText(rpcError.error_description),
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return null;
  }

  return Array.from(new Set(parts)).join(" ");
}

export function isMissingStaffDeviceRpc(error: unknown) {
  const message = toErrorText(error)?.toLowerCase() ?? "";
  const code =
    error && typeof error === "object" ? normalizeText((error as SupabaseRpcErrorLike).code) : null;

  const mentionsKnownRpc = STAFF_DEVICE_RPC_NAMES.some((rpcName) =>
    message.includes(`public.${rpcName}`),
  );
  const missingFunction =
    message.includes("could not find the function") ||
    message.includes("no matches were found in the schema cache");

  return Boolean(mentionsKnownRpc && (missingFunction || code === "PGRST202"));
}

export function toStaffDeviceRpcError(error: unknown, fallbackMessage: string) {
  if (isMissingStaffDeviceRpc(error)) {
    return new Error(STAFF_DEVICE_RPC_MISSING_MESSAGE);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(toErrorText(error) ?? fallbackMessage);
}
