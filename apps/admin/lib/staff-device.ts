import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@credit-union/shared";
import { toStaffDeviceRpcError } from "@credit-union/shared";

import {
  buildWorkstationDeviceName,
  createWorkstationDeviceId,
  normalizeText,
  STAFF_DEVICE_NAME_COOKIE,
  STAFF_DEVICE_TOKEN_COOKIE,
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

type StaffDeviceTokenPayload = {
  deviceId: string;
  deviceKind: "workstation";
  exp: number;
  v: 1;
};

const STAFF_DEVICE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365;
export const WORKSTATION_TOKEN_CONFIG_ERROR_MESSAGE =
  "Workstation security configuration is missing. Ask an administrator to set STAFF_DEVICE_TOKEN_SECRET.";

function strictCookieOptions() {
  return {
    httpOnly: true,
    maxAge: STAFF_DEVICE_TOKEN_TTL_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function getSigningSecrets() {
  const primary = normalizeText(process.env.STAFF_DEVICE_TOKEN_SECRET);
  const previous = normalizeText(process.env.STAFF_DEVICE_TOKEN_SECRET_PREVIOUS);

  if (!primary) {
    return null;
  }

  return {
    primary,
    verification: [primary, previous].filter((value): value is string => Boolean(value)),
  };
}

export function isWorkstationTokenConfigurationError(error: unknown) {
  return error instanceof Error && error.message === WORKSTATION_TOKEN_CONFIG_ERROR_MESSAGE;
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function encodeToken(payload: StaffDeviceTokenPayload) {
  const signingSecrets = getSigningSecrets();

  if (!signingSecrets) {
    throw new Error(WORKSTATION_TOKEN_CONFIG_ERROR_MESSAGE);
  }

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload, signingSecrets.primary);
  return `${encodedPayload}.${signature}`;
}

function decodeAndVerifyToken(token: string): StaffDeviceTokenPayload | null {
  const signingSecrets = getSigningSecrets();
  const [encodedPayload, signature] = token.split(".");

  if (!signingSecrets || !encodedPayload || !signature) {
    return null;
  }

  const verified = signingSecrets.verification.some((secret) => {
    const expected = signPayload(encodedPayload, secret);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  });

  if (!verified) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as StaffDeviceTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (
      payload?.v !== 1 ||
      payload?.deviceKind !== "workstation" ||
      !normalizeText(payload?.deviceId) ||
      !Number.isFinite(payload?.exp) ||
      payload.exp <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isBranchManagerSetupComplete(profile: StaffProfile) {
  return !profile.must_change_password && !profile.requires_pin_setup;
}

export async function setWorkstationIdentityCookies(input: {
  id: string;
  name?: string | null;
}) {
  const cookieStore = await cookies();
  const deviceId = normalizeText(input.id);
  const deviceName = normalizeText(input.name);

  if (deviceId) {
    const token = encodeToken({
      deviceId,
      deviceKind: "workstation",
      exp: Math.floor(Date.now() / 1000) + STAFF_DEVICE_TOKEN_TTL_SECONDS,
      v: 1,
    });
    cookieStore.set(STAFF_DEVICE_TOKEN_COOKIE, token, strictCookieOptions());
  }

  if (deviceName) {
    cookieStore.set(STAFF_DEVICE_NAME_COOKIE, deviceName, strictCookieOptions());
  }
}

export async function syncWorkstationIdentityFromFormData(formData: FormData) {
  const cookieStore = await cookies();
  const tokenFromCookie = normalizeText(cookieStore.get(STAFF_DEVICE_TOKEN_COOKIE)?.value);
  const currentPayload = tokenFromCookie ? decodeAndVerifyToken(tokenFromCookie) : null;
  const deviceName = normalizeText(formData.get("staffDeviceName"));
  const deviceId = currentPayload?.deviceId ?? createWorkstationDeviceId();

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
  const token = normalizeText(cookieStore.get(STAFF_DEVICE_TOKEN_COOKIE)?.value);
  const tokenPayload = token ? decodeAndVerifyToken(token) : null;
  const deviceNameCookie = normalizeText(cookieStore.get(STAFF_DEVICE_NAME_COOKIE)?.value);

  return {
    id: tokenPayload?.deviceId ?? null,
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
  const { data, error } = await supabase.rpc("assert_staff_device_access", {
    p_device_id: identity.id,
    p_device_kind: identity.kind,
  });

  if (error) {
    throw toStaffDeviceRpcError(error, "We could not verify workstation access.");
  }

  const assertion = toStaffDeviceAssertion(data);

  if (assertion.access !== "needs_binding" || !identity.id) {
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
