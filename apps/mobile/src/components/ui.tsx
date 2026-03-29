import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { formatCompact, formatCurrency } from "@/lib/format";
import { getStatusTone } from "@/lib/status";
import { colors, layout, radii, shadows, spacing, typography } from "@/theme/tokens";

export function FadeInView({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translate]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: translate }] }}>
      {children}
    </Animated.View>
  );
}

export function Screen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  const content = (
    <View style={styles.container}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.frame}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function StatusPill({ label }: { label: string }) {
  const tone = getStatusTone(label);

  return (
    <View style={[styles.pill, { backgroundColor: tone.background }]}>
      <View style={[styles.pillDot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.pillText, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

export function SurfaceCard({
  children,
  accent = colors.card,
}: {
  children: ReactNode;
  accent?: string;
}) {
  return <View style={[styles.card, { backgroundColor: accent }]}>{children}</View>;
}

export function SectionHeader({
  title,
  actionLabel,
  href,
}: {
  title: string;
  actionLabel?: string;
  href?: Href;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && href ? (
        <Link href={href} asChild>
          <Pressable>
            <Text style={styles.sectionAction}>{actionLabel}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

export function HeroBadge({ label }: { label: string }) {
  return (
    <View style={styles.heroBadge}>
      <Text style={styles.heroBadgeText}>{label}</Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <SurfaceCard>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </SurfaceCard>
  );
}

export function ActionTile({
  icon,
  title,
  caption,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionTile, pressed && styles.actionTilePressed]}>
      <View style={styles.actionIconWrap}>
        <Ionicons color={colors.brand} name={icon} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionCaption}>{caption}</Text>
      </View>
      <Ionicons color={colors.inkMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function MiniBarChart({
  data,
  formatValue = false,
}: {
  data: Array<{ label: string; value: number }>;
  formatValue?: boolean;
}) {
  const max = useMemo(() => Math.max(...data.map((item) => item.value), 1), [data]);

  return (
    <View style={styles.chartWrap}>
      {data.map((item) => {
        const height = Math.max((item.value / max) * 96, 14);
        return (
          <View key={item.label} style={styles.chartColumn}>
            <Text style={styles.chartValue}>{formatValue ? formatCompact(item.value) : item.value}</Text>
            <View style={styles.chartRail}>
              <View style={[styles.chartBar, { height }]} />
            </View>
            <Text style={styles.chartLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function TransactionRow({
  title,
  subtitle,
  amount,
  status,
}: {
  title: string;
  subtitle: string;
  amount: number;
  status: string;
}) {
  return (
    <SurfaceCard accent={colors.cardAlt}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.rowAmount}>{formatCurrency(amount)}</Text>
      </View>
      <StatusPill label={status} />
    </SurfaceCard>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonLine,
            index === 0 && { width: "48%" },
            index === 1 && { width: "72%" },
            index === 2 && { width: "38%" },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.page,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    backgroundColor: colors.page,
    minHeight: "100%",
  },
  frame: {
    alignSelf: "center",
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    width: "100%",
  },
  glowOne: {
    backgroundColor: "#D8E9D8",
    borderRadius: 280,
    height: 280,
    position: "absolute",
    right: -80,
    top: -70,
    width: 280,
  },
  glowTwo: {
    backgroundColor: "#E8DCC2",
    borderRadius: 220,
    height: 220,
    left: -120,
    position: "absolute",
    top: 220,
    width: 220,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  pillDot: {
    borderRadius: 99,
    height: 8,
    width: 8,
  },
  pillText: {
    fontFamily: typography.medium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.card,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  sectionAction: {
    color: colors.brandSoft,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroBadgeText: {
    color: colors.white,
    fontFamily: typography.medium,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statLabel: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  statValue: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 26,
  },
  statHint: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  actionTile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  actionTilePressed: {
    opacity: 0.82,
  },
  actionIconWrap: {
    alignItems: "center",
    backgroundColor: "#E4EFE9",
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  actionTitle: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  actionCaption: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  infoLabel: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  infoValue: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  multilineInput: {
    minHeight: 112,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.sm,
    paddingVertical: 15,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#E4EFE9",
    borderRadius: radii.sm,
    paddingVertical: 15,
  },
  secondaryButtonPressed: {
    opacity: 0.88,
  },
  secondaryButtonText: {
    color: colors.brand,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  chartWrap: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  chartColumn: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
  },
  chartValue: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  chartRail: {
    backgroundColor: "#E4ECE4",
    borderRadius: radii.pill,
    height: 96,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 24,
  },
  chartBar: {
    backgroundColor: colors.brandSoft,
    borderRadius: radii.pill,
    width: "100%",
  },
  chartLabel: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  rowTitle: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  rowSubtitle: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: 2,
  },
  rowAmount: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  skeletonLine: {
    backgroundColor: "#E5ECE5",
    borderRadius: radii.pill,
    height: 14,
  },
});
