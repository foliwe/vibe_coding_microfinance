import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";

const STORAGE_KEY = "credit-union/mobile-device-id/v1";

let cachedDeviceId: string | null = null;

function sanitizeSegment(value: string | null | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildFallbackDeviceId() {
  const platform = sanitizeSegment(Device.osName) ?? "mobile";
  const model = sanitizeSegment(Device.modelName) ?? "device";
  const random = Math.random().toString(36).slice(2, 10);

  return `mobile-${platform}-${model}-${Date.now().toString(36)}-${random}`;
}

export async function getMobileDeviceId() {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const constantsInstallationId = (Constants as typeof Constants & {
    installationId?: string | null;
  }).installationId;
  const nextId =
    typeof constantsInstallationId === "string" && constantsInstallationId.trim()
      ? `mobile-${constantsInstallationId.trim()}`
      : buildFallbackDeviceId();

  await AsyncStorage.setItem(STORAGE_KEY, nextId);
  cachedDeviceId = nextId;
  return nextId;
}
