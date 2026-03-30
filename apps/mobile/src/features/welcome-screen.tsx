import { Image, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import {
  FadeInView,
  HeroBadge,
  InputField,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusPill,
  SurfaceCard,
} from "@/components/ui";
import { useAppSession } from "@/lib/app-session";
import { colors, radii, spacing, typography } from "@/theme/tokens";

const logoGlow = require("../../assets/images/logo-glow.png");

export function WelcomeScreen() {
  const { authError, envReady, isSigningIn, session, signIn, signOut } = useAppSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setFormError("Enter both email and password to continue.");
      return;
    }

    setFormError(null);

    try {
      await signIn({
        email: email.trim(),
        password,
      });
    } catch {
      // The provider exposes the readable message through authError.
    }
  }

  const message = formError ?? authError;

  return (
    <Screen
      title="Credit Union Mobile"
      subtitle="Sign in with a Supabase-backed agent or member account to load your live mobile workspace."
    >
      <FadeInView>
        <HeroBadge label={envReady ? "Secure sign-in" : "Setup required"} />
        <SurfaceCard accent="#EDF4EE">
          <View style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Role-aware mobile access now boots from the real session instead of a mock role picker.</Text>
              <Text style={styles.heroBody}>
                Agent accounts open the field shell. Member accounts open the read-only self-service shell. Branch manager and admin accounts stay on the web app.
              </Text>
              <View style={styles.heroStatusRow}>
                <StatusPill label={envReady ? "ONLINE" : "OFFLINE"} />
                <StatusPill label={session ? "SIGNED IN" : "SIGNED OUT"} />
              </View>
            </View>
            <Image source={logoGlow} style={styles.heroImage} />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Sign In</Text>
          <Text style={styles.bodyText}>
            Use the seeded mobile accounts from the Supabase bootstrap flow, or any real member/agent account already provisioned in `public.profiles`.
          </Text>

          <View style={styles.form}>
            <InputField
              autoCapitalize="none"
              label="Email"
              onChangeText={setEmail}
              placeholder="member@example.com"
              value={email}
            />
            <InputField
              autoCapitalize="none"
              label="Password"
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
              value={password}
            />
          </View>

          {message ? (
            <View style={styles.notice}>
              <StatusPill label="REJECTED" />
              <Text style={styles.noticeText}>{message}</Text>
            </View>
          ) : null}

          {!envReady ? (
            <View style={styles.notice}>
              <StatusPill label="PENDING APPROVAL" />
              <Text style={styles.noticeText}>
                Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then restart the mobile app.
              </Text>
            </View>
          ) : null}

          <PrimaryButton
            label={isSigningIn ? "Signing In..." : "Sign In"}
            onPress={() => {
              if (!isSigningIn) {
                void handleSignIn();
              }
            }}
          />
          {session ? (
            <View style={{ marginTop: spacing.sm }}>
              <SecondaryButton
                label="Sign Out"
                onPress={() => {
                  void signOut();
                }}
              />
            </View>
          ) : null}
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Mobile Scope</Text>
          <Text style={styles.bodyText}>
            This phase restores session boot, role detection, route guards, and live read-only data. Offline queue persistence and transaction submission return next.
          </Text>
        </SurfaceCard>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 24,
    lineHeight: 28,
  },
  heroBody: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  heroStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroImage: {
    height: 128,
    resizeMode: "contain",
    width: 112,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  bodyText: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  notice: {
    backgroundColor: "#F4EEE0",
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
});
