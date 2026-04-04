import { cookies, headers } from "next/headers";
import type { UserRole } from "@credit-union/shared";
import { toStaffDeviceRpcError } from "@credit-union/shared";

import {
  buildWorkstationDeviceName,
  normalizeText,
  STAFF_DEVICE_COOKIE,
  STAFF_DEVICE_NAME_COOKIE,
  toStaffDeviceAssertion,
  type StaffDeviceAccess,
  type StaffDeviceAssertion,
} from "./staff-device-shared";

type StaffProfile = {
  must_change_password: boolean;
  requires_pin_setup: boolean;
  role: UserRole;
};

type RpcCapableClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

type WorkstationIdentity = {
  id: string | null;
  kind: "workstation";
  name: string;
};

function cookieOptions() {
  return {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function isBranchManagerSetupComplete(profile: StaffProfile) {
  return !profile.must_change_password && !profile.requires_pin_setup;
}

export async function setWorkstationIdentityCookies(input: {
  id?: string | null;
  name?: string | null;
}) {
  const cookieStore = await cookies();
  const deviceId = normalizeText(input.id);
  const deviceName = normalizeText(input.name);

  if (deviceId) {
    cookieStore.set(STAFF_DEVICE_COOKIE, deviceId, cookieOptions());
  }

  if (deviceName) {
    cookieStore.set(STAFF_DEVICE_NAME_COOKIE, deviceName, cookieOptions());
  }
}

export async function syncWorkstationIdentityFromFormData(formData: FormData) {
  const deviceId = normalizeText(formData.get("staffDeviceId"));
  const deviceName = normalizeText(formData.get("staffDeviceName"));

  await setWorkstationIdentityCookies({
    id: deviceId,
    name: deviceName,
  });

  return {
    id: deviceId,
    name: deviceName,
  };
}

export async function getCurrentWorkstationIdentity(): Promise<WorkstationIdentity> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const deviceId = normalizeText(cookieStore.get(STAFF_DEVICE_COOKIE)?.value);
  const deviceNameCookie = normalizeText(cookieStore.get(STAFF_DEVICE_NAME_COOKIE)?.value);

  return {
    id: deviceId,
    kind: "workstation",
    name:
      deviceNameCookie ??
      buildWorkstationDeviceName({
        platform: headerStore.get("sec-ch-ua-platform"),
        userAgent: headerStore.get("user-agent"),
      }),
  };
}

export async function assertCurrentWorkstationAccess(supabase: RpcCapableClient) {
  const identity = await getCurrentWorkstationIdentity();

  if (!identity.id) {
    return {
      access: "needs_binding",
      activeDeviceId: null,
      activeDeviceKind: null,
      activeDeviceName: null,
    } satisfies StaffDeviceAssertion;
  }

  const { data, error } = await supabase.rpc("assert_staff_device_access", {
    p_device_id: identity.id,
    p_device_kind: identity.kind,
  });

  if (error) {
    throw toStaffDeviceRpcError(error, "We could not verify workstation access.");
  }

  return toStaffDeviceAssertion(data);
}

export async function registerCurrentWorkstation(supabase: RpcCapableClient) {
  const identity = await getCurrentWorkstationIdentity();

  if (!identity.id) {
    throw new Error("This workstation/browser profile does not have a trusted identity yet.");
  }

  const { data, error } = await supabase.rpc("register_my_device", {
    p_device_id: identity.id,
    p_device_kind: identity.kind,
    p_device_name: identity.name,
  });

  if (error) {
    throw toStaffDeviceRpcError(error, "We could not trust this workstation yet.");
  }

  return data;
}

export async function ensureCurrentWorkstationAccess(
  supabase: RpcCapableClient,
): Promise<StaffDeviceAssertion> {
  const identity = await getCurrentWorkstationIdentity();

  if (!identity.id) {
    return {
      access: "blocked",
      activeDeviceId: null,
      activeDeviceKind: null,
      activeDeviceName: null,
    };
  }

  const { data, error } = await supabase.rpc("assert_staff_device_access", {
    p_device_id: identity.id,
    p_device_kind: identity.kind,
  });

  if (error) {
    throw toStaffDeviceRpcError(error, "We could not verify workstation access.");
  }

  const assertion = toStaffDeviceAssertion(data);

  if (assertion.access !== "needs_binding") {
    return assertion;
  }

  await registerCurrentWorkstation(supabase);

  return {
    access: "allowed" satisfies StaffDeviceAccess,
    activeDeviceId: null,
    activeDeviceKind: "workstation",
    activeDeviceName: null,
  };
}
