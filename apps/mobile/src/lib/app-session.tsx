import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { buildMemberLoginEmail } from "@credit-union/shared";

import {
  getCurrentMobileProfile,
  isMobileRole,
  type MobileProfile,
} from "./mobile-auth";
import { getErrorMessage } from "./errors";
import {
  ensureMobileStaffDeviceAccess,
  type StaffDeviceAssertion,
} from "./staff-device";
import { getSupabaseClient } from "./supabase/client";
import { hasSupabaseEnv } from "./supabase/env";

type Credentials = {
  identifier: string;
  password: string;
};

function normalizeSignInIdentifier(identifier: string) {
  const trimmed = identifier.trim();

  if (!trimmed || trimmed.includes("@")) {
    return trimmed;
  }

  return buildMemberLoginEmail(trimmed);
}

interface AppSessionValue {
  authError: string | null;
  envReady: boolean;
  isSigningIn: boolean;
  profile: MobileProfile | null;
  ready: boolean;
  refreshProfile: () => Promise<MobileProfile | null>;
  session: Session | null;
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
  staffDeviceAccess: StaffDeviceAssertion | null;
}

const AppSessionContext = createContext<AppSessionValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const envReady = hasSupabaseEnv();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [ready, setReady] = useState(!envReady);
  const [session, setSession] = useState<Session | null>(null);
  const [staffDeviceAccess, setStaffDeviceAccess] = useState<StaffDeviceAssertion | null>(null);
  const hydrateRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hydrateSession = useCallback(
    async (nextSession?: Session | null) => {
      const requestId = ++hydrateRequestIdRef.current;

      if (!envReady) {
        if (!isMountedRef.current || hydrateRequestIdRef.current !== requestId) {
          return null;
        }

        setSession(null);
        setAuthError(null);
        setProfile(null);
        setStaffDeviceAccess(null);
        setReady(true);
        return null;
      }

      const supabase = getSupabaseClient();
      setReady(false);

      const sessionToUse =
        nextSession ??
        (await supabase.auth.getSession()).data.session;

      if (!isMountedRef.current || hydrateRequestIdRef.current !== requestId) {
        return null;
      }

      setSession(sessionToUse);

      if (!sessionToUse) {
        setAuthError(null);
        setProfile(null);
        setStaffDeviceAccess(null);
        setReady(true);
        return null;
      }

      try {
        const nextProfile = await getCurrentMobileProfile();

        if (!isMountedRef.current || hydrateRequestIdRef.current !== requestId) {
          return null;
        }

        let nextStaffDeviceAccess: StaffDeviceAssertion | null = null;

        if (nextProfile?.role === "agent") {
          nextStaffDeviceAccess = await ensureMobileStaffDeviceAccess({
            autoRegisterIfNeeded:
              !nextProfile.mustChangePassword && !nextProfile.requiresPinSetup,
          });

          if (!isMountedRef.current || hydrateRequestIdRef.current !== requestId) {
            return null;
          }
        }

        setProfile(nextProfile);
        setStaffDeviceAccess(nextStaffDeviceAccess);
        setAuthError(
          nextProfile && isMobileRole(nextProfile.role)
            ? null
            : "This account can sign in, but it does not have mobile access.",
        );
        return nextProfile;
      } catch (error) {
        if (!isMountedRef.current || hydrateRequestIdRef.current !== requestId) {
          return null;
        }

        setProfile(null);
        setStaffDeviceAccess(null);
        setAuthError(getErrorMessage(error, "We could not load your profile."));
        return null;
      } finally {
        if (isMountedRef.current && hydrateRequestIdRef.current === requestId) {
          setReady(true);
        }
      }
    },
    [envReady],
  );

  useEffect(() => {
    if (!envReady) {
      setReady(true);
      return;
    }

    const supabase = getSupabaseClient();
    void hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateSession(nextSession);
    });

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    supabase.auth.startAutoRefresh();

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [envReady, hydrateSession]);

  const value = useMemo<AppSessionValue>(
    () => ({
      authError,
      envReady,
      isSigningIn,
      profile,
      ready,
      refreshProfile: async () => hydrateSession(),
      session,
      signIn: async ({ identifier, password }) => {
        if (!envReady) {
          throw new Error(
            "Supabase mobile environment variables are not configured yet.",
          );
        }

        setIsSigningIn(true);
        setAuthError(null);

        try {
          const supabase = getSupabaseClient();
          const { error } = await supabase.auth.signInWithPassword({
            email: normalizeSignInIdentifier(identifier),
            password,
          });

          if (error) {
            throw error;
          }
        } catch (error) {
          const message = getErrorMessage(error, "We could not sign you in.");
          setAuthError(message);
          throw error;
        } finally {
          setIsSigningIn(false);
        }
      },
      signOut: async () => {
        if (!envReady) {
          setAuthError(null);
          setSession(null);
          setProfile(null);
          setStaffDeviceAccess(null);
          return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        setSession(null);
        setAuthError(null);
        setProfile(null);
        setStaffDeviceAccess(null);
      },
      staffDeviceAccess,
    }),
    [
      authError,
      envReady,
      hydrateSession,
      isSigningIn,
      profile,
      ready,
      session,
      staffDeviceAccess,
    ],
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const value = useContext(AppSessionContext);

  if (!value) {
    throw new Error("useAppSession must be used inside AppSessionProvider.");
  }

  return value;
}
