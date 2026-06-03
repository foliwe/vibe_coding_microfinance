import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "credit-union/seen-notifications/v1";
const MAX_SEEN_IDS = 200;

function getStorageKey(profileId: string) {
  return `${STORAGE_PREFIX}/${profileId}`;
}

function parseSeenIds(raw: string | null) {
  if (!raw) {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

export async function getSeenNotificationIds(profileId: string) {
  const raw = await AsyncStorage.getItem(getStorageKey(profileId));

  return parseSeenIds(raw);
}

export async function markNotificationsSeen(profileId: string, ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  const seenIds = await getSeenNotificationIds(profileId);

  for (const id of ids) {
    seenIds.add(id);
  }

  await AsyncStorage.setItem(
    getStorageKey(profileId),
    JSON.stringify(Array.from(seenIds).slice(-MAX_SEEN_IDS)),
  );
}
