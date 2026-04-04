import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";

import { getSupabaseClient } from "./supabase/client";

const MOBILE_DEVICE_ID_STORAGE_KEY = "credit-union/staff-device-id/v1";

export type StaffDeviceKind = "mobile" | "workstation";
export type StaffDeviceAccess = "allowed" | "needs_binding" | "blocked";

export type StaffDeviceAssertion = {
  access: StaffDeviceAccess;
  activeDeviceId: string | null;
  activeDeviceKind: StaffDeviceKind | null;
  activeDeviceName: string | null;
};

export type MobileStaffDeviceIdentity = {
  id: string;
  kind: "mobile";
  name: string;
};

type AssertionRow = {
  access?: string | null;
  active_device_id?: string | null;
  active_device_kind?: string | null;
  active_device_name?: string | null;
};

let identityPromise: Promise<MobileStaffDeviceIdentity> | null = null;

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function createInstallScopedDeviceId() {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `mobile-${randomId}`;
}

function buildMobileDeviceName() {
  const preferredName = normalizeText(Device.deviceName);

  if (preferredName) {
    return preferredName;
  }

  const brand = normalizeText(Device.brand);
  const modelName = normalizeText(Device.modelName);
  const parts = [brand, modelName].filter((value): value is string => !!value);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return "Trusted mobile phone";
}

function toAssertion(data: unknown): StaffDeviceAssertion {
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

export async function getMobileStaffDeviceIdentity(): Promise<MobileStaffDeviceIdentity> {
  if (!identityPromise) {
    identityPromise = (async () => {
      let deviceId = normalizeText(await AsyncStorage.getItem(MOBILE_DEVICE_ID_STORAGE_KEY));

      if (!deviceId) {
        deviceId = createInstallScopedDeviceId();
        await AsyncStorage.setItem(MOBILE_DEVICE_ID_STORAGE_KEY, deviceId);
      }

      return {
        id: deviceId,
        kind: "mobile",
        name: buildMobileDeviceName(),
      } satisfies MobileStaffDeviceIdentity;
    })().catch((error) => {
      identityPromise = null;
      throw error;
    });
  }

  return identityPromise;
}

export async function assertMobileStaffDeviceAccess() {
  const supabase = getSupabaseClient();
  const identity = await getMobileStaffDeviceIdentity();
  const { data, error } = await supabase.rpc("assert_staff_device_access", {
    p_device_id: identity.id,
    p_device_kind: identity.kind,
  });

  if (error) {
    throw error;
  }

  return toAssertion(data);
}

export async function registerMobileStaffDevice() {
  const supabase = getSupabaseClient();
  const identity = await getMobileStaffDeviceIdentity();
  const { data, error } = await supabase.rpc("register_my_device", {
    p_device_id: identity.id,
    p_device_kind: identity.kind,
    p_device_name: identity.name,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function ensureMobileStaffDeviceAccess(options?: {
  autoRegisterIfNeeded?: boolean;
}) {
  const assertion = await assertMobileStaffDeviceAccess();

  if (assertion.access !== "needs_binding" || !options?.autoRegisterIfNeeded) {
    return assertion;
  }

  await registerMobileStaffDevice();

  return {
    access: "allowed",
    activeDeviceId: null,
    activeDeviceKind: "mobile",
    activeDeviceName: null,
  } satisfies StaffDeviceAssertion;
}

export async function requireAllowedMobileStaffDevice(options?: {
  autoRegisterIfNeeded?: boolean;
}) {
  const assertion = await ensureMobileStaffDeviceAccess(options);

  if (assertion.access !== "allowed") {
    throw new Error("This account is locked to a different phone");
  }

  return {
    assertion,
    device: await getMobileStaffDeviceIdentity(),
  };
}
