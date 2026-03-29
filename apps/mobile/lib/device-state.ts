import * as FileSystem from "expo-file-system/legacy";

export interface DeviceUserSettings {
  pinFingerprint?: string | null;
  biometricEnabled?: boolean;
  pinUpdatedAt?: string | null;
}

type DeviceSettingsStore = Record<string, DeviceUserSettings>;
const settingsUri = `${FileSystem.documentDirectory ?? ""}credit-union-mobile-device-settings.json`;

function fingerprintPin(pin: string) {
  let hash = 2166136261;

  for (const char of pin) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

async function readSettingsStore(): Promise<DeviceSettingsStore> {
  if (!settingsUri) {
    return {};
  }

  const fileInfo = await FileSystem.getInfoAsync(settingsUri);

  if (!fileInfo.exists) {
    return {};
  }

  const raw = await FileSystem.readAsStringAsync(settingsUri);

  if (!raw.trim()) {
    return {};
  }

  const parsed = JSON.parse(raw) as DeviceSettingsStore;

  return parsed && typeof parsed === "object" ? parsed : {};
}

async function writeSettingsStore(store: DeviceSettingsStore) {
  if (!settingsUri) {
    return;
  }

  await FileSystem.writeAsStringAsync(settingsUri, JSON.stringify(store));
}

export async function loadDeviceUserSettings(userId: string) {
  const store = await readSettingsStore();
  return store[userId] ?? {};
}

export async function saveDeviceUserSettings(userId: string, settings: DeviceUserSettings) {
  const store = await readSettingsStore();
  store[userId] = {
    ...(store[userId] ?? {}),
    ...settings,
  };
  await writeSettingsStore(store);
  return store[userId];
}

export { fingerprintPin };
