export const STAFF_DEVICE_TOKEN_COOKIE = "staff_device_token";
export const STAFF_DEVICE_NAME_COOKIE = "staff_device_name";
export const WORKSTATION_DEVICE_ID_STORAGE_KEY = "credit-union/workstation-device-id/v1";

export type StaffDeviceKind = "mobile" | "workstation";
export type StaffDeviceAccess = "allowed" | "needs_binding" | "blocked";

export type StaffDeviceAssertion = {
  access: StaffDeviceAccess;
  activeDeviceId: string | null;
  activeDeviceKind: StaffDeviceKind | null;
  activeDeviceName: string | null;
};

type AssertionRow = {
  access?: string | null;
  active_device_id?: string | null;
  active_device_kind?: string | null;
  active_device_name?: string | null;
};

export function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function createWorkstationDeviceId() {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `workstation-${randomId}`;
}

export function parseBrowserName(userAgent: string) {
  const normalized = userAgent.toLowerCase();

  if (normalized.includes("edg/")) {
    return "Edge";
  }

  if (normalized.includes("chrome/") && !normalized.includes("edg/")) {
    return "Chrome";
  }

  if (normalized.includes("safari/") && !normalized.includes("chrome/")) {
    return "Safari";
  }

  if (normalized.includes("firefox/")) {
    return "Firefox";
  }

  return "Browser";
}

export function buildWorkstationDeviceName(input: {
  platform?: string | null;
  userAgent?: string | null;
}) {
  const platform = normalizeText(input.platform) ?? "Office workstation";
  const browser = input.userAgent ? parseBrowserName(input.userAgent) : "Browser";

  return `${platform} • ${browser}`;
}

export function toStaffDeviceAssertion(data: unknown): StaffDeviceAssertion {
  const row = Array.isArray(data) ? ((data[0] as AssertionRow | undefined) ?? null) : null;
  const access = row?.access;

  return {
    access:
      access === "allowed" || access === "needs_binding" || access === "blocked"
        ? access
        : "blocked",
    activeDeviceId: normalizeText(row?.active_device_id),
    activeDeviceKind:
      row?.active_device_kind === "mobile" || row?.active_device_kind === "workstation"
        ? row.active_device_kind
        : null,
    activeDeviceName: normalizeText(row?.active_device_name),
  };
}
