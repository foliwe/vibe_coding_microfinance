import { router, Stack, usePathname, type Href } from "expo-router";
import { useEffect } from "react";

import {
  AccessNoticeScreen,
  SessionLoadingScreen,
} from "@/features/session-status-screen";
import { useAppSession } from "@/lib/app-session";

export default function MemberLayout() {
  const { profile, ready, session } = useAppSession();
  const pathname = usePathname();
  const accessDenied = !!session && !!profile && profile.role !== "member" && profile.role !== "agent";

  let redirectHref: Href | null = null;

  if (ready && (!session || !profile)) {
    redirectHref = "/welcome";
  } else if (ready && profile?.role === "agent") {
    redirectHref = "/agent";
  } else if (ready && profile?.role === "member" && profile.mustChangePassword && pathname !== "/member/change-password") {
    redirectHref = "/member/change-password";
  }

  useEffect(() => {
    if (!redirectHref || pathname === redirectHref) {
      return;
    }

    router.replace(redirectHref);
  }, [pathname, redirectHref]);

  if (!ready) {
    return (
      <SessionLoadingScreen
        title="Member Shell"
        subtitle="Restoring your member session."
      />
    );
  }

  if (accessDenied) {
    return (
      <AccessNoticeScreen
        title="Member Shell"
        subtitle="This route is limited to signed-in members."
        message="Use a member account for self-service screens, or sign in with the matching role to continue."
      />
    );
  }

  if (redirectHref) {
    return (
      <SessionLoadingScreen
        title="Member Shell"
        subtitle="Routing to the correct member screen."
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
