import { router, Stack, usePathname, type Href } from "expo-router";
import { useEffect } from "react";

import {
  AccessNoticeScreen,
  SessionLoadingScreen,
} from "@/features/session-status-screen";
import { useAppSession } from "@/lib/app-session";
import { MobileShell } from "@/components/mobile-shell";

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
      <MobileShell role="member">
        <SessionLoadingScreen
          title="Member Shell"
          subtitle="Restoring your member session."
        />
      </MobileShell>
    );
  }

  if (accessDenied) {
    return (
      <MobileShell role="member">
        <AccessNoticeScreen
          title="Member Shell"
          subtitle="This route is limited to signed-in members."
          message="Use a member account for self-service screens, or sign in with the matching role to continue."
        />
      </MobileShell>
    );
  }

  if (redirectHref) {
    return (
      <MobileShell role="member">
        <SessionLoadingScreen
          title="Member Shell"
          subtitle="Routing to the correct member screen."
        />
      </MobileShell>
    );
  }

  return (
    <MobileShell role="member">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="more/profile" />
        <Stack.Screen name="change-password" />
      </Stack>
    </MobileShell>
  );
}
