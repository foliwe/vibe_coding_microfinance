import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  InputField,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
  SurfaceCard,
} from "@/components/ui";
import { useAppSession } from "@/lib/app-session";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

const logoGlow = require("../../assets/images/logo-glow.png");

export function WelcomeScreen() {
  const { authError, isSigningIn, session, signIn, signOut } = useAppSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!identifier.trim() || !password.trim()) {
      setFormError("Enter both fields to continue.");
      return;
    }

    setFormError(null);

    try {
      await signIn({
        identifier: identifier.trim(),
        password,
      });
    } catch {
      // The provider exposes the readable message through authError.
    }
  }

  const message = formError ?? authError;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <LinearGradient
        colors={[colors.pageTop, colors.page, colors.pageBottom]}
        locations={[0, 0.52, 1]}
        style={styles.page}
      >
        <View style={styles.logoWrap}>
          <Image resizeMode="contain" source={logoGlow} style={styles.logo} />
        </View>

        <SurfaceCard>
          <View style={styles.form}>
            <InputField
              autoCapitalize="none"
              label="Email or Sign-In Code"
              onChangeText={setIdentifier}
              placeholder="agent@example.com or MMBAM1A3F"
              value={identifier}
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
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.pageTop,
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  logoWrap: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.foliwe,
    borderRadius: radii.xl,
    height: 156,
    justifyContent: "center",
    marginBottom: spacing.xl,
    width: 156,
    ...shadows.card,
  },
  logo: {
    height: 126,
    width: 126,
  },
  form: {
    gap: spacing.sm,
  },
  notice: {
    backgroundColor: "#FFF4F0",
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
