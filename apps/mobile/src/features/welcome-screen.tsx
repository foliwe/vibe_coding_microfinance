import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { FadeInView, HeroBadge, Screen, StatusPill, SurfaceCard } from "@/components/ui";
import { colors, radii, spacing, typography } from "@/theme/tokens";

const logoGlow = require("../../assets/images/logo-glow.png");

export function WelcomeScreen() {
  return (
    <Screen
      title="Credit Union Mobile"
      subtitle="A fresh Expo SDK 55 shell built for UI-first agent and member previews. No auth gate, no backend dependency, and every route is ready for phase 2 wiring."
    >
      <FadeInView>
        <HeroBadge label="Demo mode" />
        <SurfaceCard accent="#EDF4EE">
          <View style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Field-ready finance flows with cleaner navigation and stronger state visibility.</Text>
              <Text style={styles.heroBody}>
                Explore the agent dashboard, queue, reconciliation, and member self-service views before any Supabase integration is added.
              </Text>
              <View style={styles.heroStatusRow}>
                <StatusPill label="OFFLINE" />
                <StatusPill label="PENDING SYNC" />
              </View>
            </View>
            <Image source={logoGlow} style={styles.heroImage} />
          </View>
        </SurfaceCard>

        <View style={styles.roleGrid}>
          <Pressable onPress={() => router.push("/agent")} style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}>
            <Text style={styles.roleEyebrow}>Agent flow</Text>
            <Text style={styles.roleTitle}>Capture cash activity, add members, and manage the queue.</Text>
            <Text style={styles.roleCaption}>Home, Transactions, Members, and More are all live in preview mode.</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/member")} style={({ pressed }) => [styles.roleCard, styles.memberCard, pressed && styles.roleCardPressed]}>
            <Text style={styles.roleEyebrow}>Member flow</Text>
            <Text style={styles.roleTitle}>Review balances, loans, and statements in a read-only shell.</Text>
            <Text style={styles.roleCaption}>The member experience stays simple, calm, and trust-oriented.</Text>
          </Pressable>
        </View>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>What this reset changes</Text>
          <Text style={styles.bodyText}>Expo now lives only inside the mobile workspace, the route tree is stable, and the next backend phase can attach to a single app-local data layer instead of rebuilding screens again.</Text>
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
  roleGrid: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  roleCard: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  memberCard: {
    backgroundColor: "#36526C",
  },
  roleCardPressed: {
    opacity: 0.88,
  },
  roleEyebrow: {
    color: "#D9ECE7",
    fontFamily: typography.medium,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  roleTitle: {
    color: colors.white,
    fontFamily: typography.display,
    fontSize: 21,
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  roleCaption: {
    color: "#D9ECE7",
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
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
});
