import { Redirect, Stack } from "expo-router";

import {
  AccessNoticeScreen,
  SessionLoadingScreen,
} from "@/features/session-status-screen";
import { useAppSession } from "@/lib/app-session";

export default function MemberLayout() {
  const { profile, ready, session } = useAppSession();

  if (!ready) {
    return (
      <SessionLoadingScreen
        title="Member Shell"
        subtitle="Restoring your member session."
      />
    );
  }

  if (!session || !profile) {
    return <Redirect href="/welcome" />;
  }

  if (profile.role === "agent") {
    return <Redirect href="/agent" />;
  }

  if (profile.role !== "member") {
    return (
      <AccessNoticeScreen
        title="Member Shell"
        subtitle="This route is limited to signed-in members."
        message="Use a member account for self-service screens, or sign in with the matching role to continue."
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="more/profile" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
