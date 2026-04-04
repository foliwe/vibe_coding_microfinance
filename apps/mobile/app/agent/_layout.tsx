import { router, Stack, usePathname, type Href } from "expo-router";
import { useEffect } from "react";

import {
  AccessNoticeScreen,
  SessionLoadingScreen,
} from "@/features/session-status-screen";
import { useAppSession } from "@/lib/app-session";
import { registerMobileStaffDevice } from "@/lib/staff-device";

export default function AgentLayout() {
  const {
    profile,
    ready,
    refreshProfile,
    session,
    signOut,
    staffDeviceAccess,
  } = useAppSession();
  const pathname = usePathname();
  const accessDenied = !!session && !!profile && profile.role !== "agent" && profile.role !== "member";
  const deviceBlocked =
    ready &&
    profile?.role === "agent" &&
    staffDeviceAccess?.access === "blocked";
  const resetNeedsRebind = deviceBlocked && !staffDeviceAccess?.activeDeviceId;

  let redirectHref: Href | null = null;

  if (ready && (!session || !profile)) {
    redirectHref = "/welcome";
  } else if (ready && profile?.role === "member") {
    redirectHref = "/member";
  } else if (
    ready &&
    profile?.role === "agent" &&
    (profile.mustChangePassword || profile.requiresPinSetup) &&
    pathname !== "/agent/change-password"
  ) {
    redirectHref = "/agent/change-password";
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
        title="Agent Shell"
        subtitle="Restoring your field session."
      />
    );
  }

  if (accessDenied) {
    return (
      <AccessNoticeScreen
        title="Agent Shell"
        subtitle="This route is limited to signed-in field agents."
        message="Use a member account for member screens, or sign in with an agent account to continue here."
      />
    );
  }

  if (deviceBlocked) {
    return (
      <AccessNoticeScreen
        title="Agent Shell"
        subtitle={
          resetNeedsRebind
            ? "Device trust was reset for this account."
            : "This agent account is blocked on the current phone."
        }
        message={
          resetNeedsRebind
            ? "Trust this phone again to restore field access for this account."
            : "This account is locked to a different phone"
        }
        actionLabel={resetNeedsRebind ? "Trust This Phone" : "Sign Out"}
        onAction={() => {
          if (resetNeedsRebind) {
            void registerMobileStaffDevice().then(() => refreshProfile());
            return;
          }

          void signOut();
        }}
      />
    );
  }

  if (redirectHref) {
    return (
      <SessionLoadingScreen
        title="Agent Shell"
        subtitle="Routing to the correct field screen."
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="members/add" />
      <Stack.Screen name="members/[memberId]" />
      <Stack.Screen name="transactions/deposit" />
      <Stack.Screen name="transactions/withdrawal" />
      <Stack.Screen name="more/sync-queue" />
      <Stack.Screen name="more/reconciliation" />
      <Stack.Screen name="more/profile" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
