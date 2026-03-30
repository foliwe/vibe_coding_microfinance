import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  getCurrentMobileProfile,
  isMobileRole,
  type MobileProfile,
} from "./mobile-auth";
import { getSupabaseClient } from "./supabase/client";
import { hasSupabaseEnv } from "./supabase/env";

type Credentials = {
  email: string;
  password: string;
};

interface AppSessionValue {
  authError: string | null;
  envReady: boolean;
  isSigningIn: boolean;
  profile: MobileProfile | null;
  ready: boolean;
  session: Session | null;
  signIn: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppSessionContext = createContext<AppSessionValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const envReady = hasSupabaseEnv();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [ready, setReady] = useState(!envReady);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!envReady) {
      setReady(true);
      return;
    }

    const supabase = getSupabaseClient();
    let active = true;

    async function hydrate(nextSession?: Session | null) {
      setReady(false);

      const sessionToUse =
        nextSession ??
        (await supabase.auth.getSession()).data.session;

      if (!active) {
        return;
      }

      setSession(sessionToUse);

      if (!sessionToUse) {
        setAuthError(null);
        setProfile(null);
        setReady(true);
        return;
      }

      try {
        const nextProfile = await getCurrentMobileProfile();

        if (!active) {
          return;
        }

        setProfile(nextProfile);
        setAuthError(
          nextProfile && isMobileRole(nextProfile.role)
            ? null
            : "This account can sign in, but it does not have mobile access.",
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setProfile(null);
        setAuthError(
          error instanceof Error ? error.message : "We could not load your profile.",
        );
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void hydrate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession);
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
      active = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [envReady]);

  const value = useMemo<AppSessionValue>(
    () => ({
      authError,
      envReady,
      isSigningIn,
      profile,
      ready,
      session,
      signIn: async ({ email, password }) => {
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
            email,
            password,
          });

          if (error) {
            throw error;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "We could not sign you in.";
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
      },
    }),
    [authError, envReady, isSigningIn, profile, ready, session],
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
