import { Text } from "react-native";

import { Screen, StatusPill, SurfaceCard } from "@/components/ui";

export function SessionLoadingScreen({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <Screen title={title} subtitle={subtitle}>
      <SurfaceCard accent="#EEF4ED">
        <StatusPill label="SYNCING" />
        <Text style={{ marginTop: 12, color: "#56666E" }}>
          Restoring your session and role scope.
        </Text>
      </SurfaceCard>
    </Screen>
  );
}

export function AccessNoticeScreen({
  title,
  subtitle,
  message,
}: {
  title: string;
  subtitle: string;
  message: string;
}) {
  return (
    <Screen title={title} subtitle={subtitle}>
      <SurfaceCard accent="#F7EEE0">
        <StatusPill label="REJECTED" />
        <Text style={{ marginTop: 12, color: "#56666E" }}>{message}</Text>
      </SurfaceCard>
    </Screen>
  );
}
