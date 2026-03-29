import { Stack } from "expo-router";

export default function MemberLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="more/profile" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
