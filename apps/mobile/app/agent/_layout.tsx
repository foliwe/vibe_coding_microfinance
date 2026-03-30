import { Redirect, Stack } from "expo-router";

import {
  AccessNoticeScreen,
  SessionLoadingScreen,
} from "@/features/session-status-screen";
import { useAppSession } from "@/lib/app-session";

export default function AgentLayout() {
  const { profile, ready, session } = useAppSession();

  if (!ready) {
    return (
      <SessionLoadingScreen
        title="Agent Shell"
        subtitle="Restoring your field session."
      />
    );
  }

  if (!session || !profile) {
    return <Redirect href="/welcome" />;
  }

  if (profile.role === "member") {
    return <Redirect href="/member" />;
  }

  if (profile.role !== "agent") {
    return (
      <AccessNoticeScreen
        title="Agent Shell"
        subtitle="This route is limited to signed-in field agents."
        message="Use a member account for member screens, or sign in with an agent account to continue here."
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="members/add" />
      <Stack.Screen name="transactions/deposit" />
      <Stack.Screen name="transactions/withdrawal" />
      <Stack.Screen name="more/sync-queue" />
      <Stack.Screen name="more/reconciliation" />
      <Stack.Screen name="more/profile" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
