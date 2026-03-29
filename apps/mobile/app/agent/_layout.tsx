import { Stack } from "expo-router";

export default function AgentLayout() {
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
