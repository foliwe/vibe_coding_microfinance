import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StatusChip } from "@/components/unity-ui";
import { useAppSession } from "@/lib/app-session";
import { colors, typography } from "@/theme/tokens";

const unityLogo = require("../../assets/images/unity-credit-logo.png");

export function WelcomeScreen() {
  const { authError, isSigningIn, session, signIn, signOut } = useAppSession();
  const { height } = useWindowDimensions();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
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
  const headerHeight = Math.max(304, Math.min(336, height * 0.38));

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.page}>
        <LinearGradient
          colors={["#0057D8", "#003586"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBackground, { height: headerHeight }]}
        >
          <Image resizeMode="contain" source={unityLogo} style={styles.watermark} />
        </LinearGradient>
        <View style={[styles.lowerBackground, { top: headerHeight - 36 }]} />
        <View style={styles.content}>
          <View style={styles.brandLockup}>
            <Image resizeMode="contain" source={unityLogo} style={styles.logo} />
            <Text style={styles.logoTitle}>Unity Credit</Text>
            <Text style={styles.logoTag}>Stronger Together</Text>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Sign in to access your account securely.</Text>
          </View>

          <View style={styles.card}>
            <LoginInput
              icon="call-outline"
              label="Login ID"
              onChangeText={setIdentifier}
              placeholder="Enter your login"
              value={identifier}
            />
            <LoginInput
              icon="lock-closed-outline"
              label="PIN"
              onChangeText={setPassword}
              placeholder="Enter your 4-digit PIN"
              secureTextEntry
              value={password}
            />

            <View style={styles.formMetaRow}>
              <Pressable style={styles.rememberRow} onPress={() => setRememberMe((next) => !next)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]} >
                  {rememberMe ? <Ionicons color={colors.white} name="checkmark" size={18} /> : null}
                </View>
                <Text style={styles.bodyText}>Remember me</Text>
              </Pressable>
              <Text style={styles.linkText}>Forgot PIN?</Text>
            </View>

            {message ? (
              <View style={styles.errorBox}>
                <StatusChip label="Rejected" tone="danger" />
                <Text style={styles.errorText}>{message}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={isSigningIn}
              onPress={() => {
                if (!isSigningIn) {
                  void handleSignIn();
                }
              }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={["#0057D8", "#08BFA9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                <Ionicons color={colors.white} name="lock-closed-outline" size={24} />
                <Text style={styles.primaryText}>{isSigningIn ? "Signing In..." : "Sign In"}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.bioButton, pressed && styles.pressed]}>
              <Ionicons color={colors.brand} name="finger-print-outline" size={34} />
              <Text style={styles.bioText}>Sign in with Biometrics</Text>
            </Pressable>

            <View style={styles.helpRow}>
              <View style={styles.helpIcon}>
                <Ionicons color={colors.ink} name="headset-outline" size={24} />
              </View>
              <Text style={styles.helpText}>
                Need help? Contact your branch or <Text style={styles.linkText}>support center.</Text>
              </Text>
            </View>

            <View style={styles.securityRow}>
              <SecurityPill icon="shield-checkmark-outline" label="Secure Login" />
              <SecurityPill icon="finger-print-outline" label="Biometric Enabled" />
              <SecurityPill icon="shield-checkmark-outline" label="Fraud Protected" />
            </View>

            {session ? (
              <Pressable
                onPress={() => {
                  void signOut();
                }}
                style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function LoginInput({
  icon,
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputIcon}>
        <Ionicons color={colors.ink} name={icon} size={20} />
      </View>
      <View style={styles.inputCopy}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
        />
      </View>
      {secureTextEntry ? <Ionicons color={colors.inkMuted} name="eye-outline" size={30} /> : null}
    </View>
  );
}

function SecurityPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.securityPill}>
      <View style={styles.securityIcon}>
        <Ionicons color={colors.success} name={icon} size={27} />
      </View>
      <Text style={styles.securityText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bioButton: {
    alignItems: "center",
    borderColor: colors.brand,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 50,
  },
  bioText: {
    color: colors.brand,
    fontFamily: typography.heading,
    fontSize: 15,
  },
  bodyText: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 19,
  },
  brandLockup: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 42,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    shadowColor: "#071229",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  cardIntro: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  cardIntroIcon: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  cardIntroText: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    color: colors.brand,
    fontFamily: typography.heading,
    fontSize: 17,
    lineHeight: 21,
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  content: {
    flex: 1,
    paddingBottom: 14,
    paddingTop: 4,
  },
  checkboxChecked: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  errorBox: {
    backgroundColor: "#FFE1E5",
    borderRadius: 12,
    marginBottom: 14,
    padding: 14,
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },
  formMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 2,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 27,
    lineHeight: 32,
  },
  helpIcon: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    marginRight: 10,
    width: 38,
  },
  helpRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  helpText: {
    color: colors.inkMuted,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  heroCopy: {
    marginTop: 34,
    paddingHorizontal: 24,
  },
  headerBackground: {
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  input: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 15,
    minHeight: 24,
    padding: 0,
  },
  inputCopy: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 8,
  },
  inputIcon: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 11,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  inputLabel: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 14,
    lineHeight: 18,
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    minHeight: 62,
    paddingHorizontal: 12,
  },
  linkText: {
    color: colors.brand,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  logo: {
    height: 56,
    width: 56,
  },
  logoTag: {
    color: colors.teal,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 16,
  },
  logoTitle: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 24,
    lineHeight: 29,
    marginTop: 4,
  },
  lowerBackground: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  page: {
    backgroundColor: colors.panel,
    flex: 1,
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  primaryGradient: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 50,
  },
  primaryText: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 17,
  },
  rememberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  safeArea: {
    backgroundColor: colors.brand,
    flex: 1,
  },
  securityIcon: {
    alignItems: "center",
    backgroundColor: "#DDF8E9",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  securityPill: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  securityRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  securityText: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4,
    textAlign: "center",
  },
  signOut: {
    alignItems: "center",
    marginTop: 18,
    padding: 10,
  },
  signOutText: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  subheading: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  watermark: {
    height: 178,
    opacity: 0.08,
    position: "absolute",
    right: -36,
    top: 190,
    width: 178,
  },
});
