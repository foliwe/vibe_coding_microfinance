import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router, usePathname, type Href } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart, type barDataItem } from "react-native-gifted-charts";

import { formatCompact, formatCurrency } from "@/lib/format";
import { getStatusTone } from "@/lib/status";
import { useAppSession } from "@/lib/app-session";
import { colors, layout, radii, shadows, spacing, typography } from "@/theme/tokens";

export function FadeInView({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: process.env.EXPO_OS !== "web",
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 420,
        useNativeDriver: process.env.EXPO_OS !== "web",
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
  const pathname = usePathname();
  const { profile } = useAppSession();
  const isAgent = pathname.startsWith("/agent");
  const isHome = title === "Home" || title === "Agent Home";
  const showBackButton = !isRootShellPath(pathname);
  const fallbackHref = getBackFallbackHref(pathname, isAgent);
  const fallbackName = isAgent ? "Agent" : "Foliwe";
  const firstName = profile?.fullName?.split(" ")[0] || fallbackName;
  const greeting = `Hi ${firstName}!`;
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  };

  const content = (
    <LinearGradient
      colors={[colors.pageTop, colors.page, colors.pageBottom]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.frame}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <View style={styles.avatarCircle}>
              <Ionicons color={colors.white} name="person" size={18} />
            </View>
            <Text numberOfLines={1} style={styles.greetingText}>
              {greeting}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {right ?? <Ionicons color={colors.ink} name="notifications-outline" size={22} />}
            <Ionicons color={colors.ink} name="analytics-outline" size={22} />
          </View>
        </View>

        {!isHome ? (
          <View style={styles.titleRow}>
            {showBackButton ? (
              <Pressable
                accessibilityLabel="Go back"
                onPress={handleBackPress}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <Ionicons color={colors.ink} name="chevron-back" size={21} />
              </Pressable>
            ) : (
              <View style={styles.titleSideSpacer} />
            )}
            <View style={styles.titlePill}>
              <Text numberOfLines={1} style={styles.titlePillText}>
                {title}
              </Text>
            </View>
            <View style={styles.titleSideSpacer} />
          </View>
        ) : null}

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    </LinearGradient>
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

function StatusIcon({ label }: { label: string }) {
  const tone = getStatusTone(label);
  const icon = label === "APPROVED"
    ? "checkmark"
    : label === "PENDING APPROVAL" || label === "PENDING SYNC"
      ? "time-outline"
      : label === "FAILED TO SYNC"
        ? "sync-outline"
        : "remove-outline";

  return (
    <View style={[styles.statusIcon, { borderColor: tone.text }]}>
      <Ionicons color={tone.text} name={icon} size={13} />
    </View>
  );
}

export function SurfaceCard({
  children,
  accent = colors.card,
  tone = "default",
}: {
  children: ReactNode;
  accent?: string;
  tone?: "default" | "hero" | "homeHero" | "soft" | "receipt";
}) {
  const toneStyle = tone === "hero"
    ? styles.heroCard
    : tone === "homeHero"
      ? styles.homeHeroCard
    : tone === "soft"
      ? styles.softCard
      : tone === "receipt"
        ? styles.receiptCard
        : styles.defaultCard;

  return <View style={[styles.card, toneStyle, { backgroundColor: accent }]}>{children}</View>;
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
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
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
        <Ionicons color={colors.white} name={icon} size={20} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.actionTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.actionCaption}>{caption}</Text>
      </View>
      <Ionicons color={colors.ink} name="chevron-forward" size={18} />
    </Pressable>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoCapitalize = "sentences",
  editable = true,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.primaryButtonPressed,
      ]}
    >
      <Text numberOfLines={1} style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.secondaryButtonPressed,
      ]}
    >
      <Text numberOfLines={1} style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function MiniBarChart({
  data,
  formatValue = false,
}: {
  data: { label: string; value: number }[];
  formatValue?: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const rawMax = useMemo(
    () => data.reduce((max, item) => Math.max(max, item.value), 0),
    [data],
  );
  const chartMax = useMemo(() => {
    if (rawMax <= 0) {
      return 4;
    }

    const magnitude = 10 ** Math.floor(Math.log10(rawMax));
    const normalized = rawMax / magnitude;
    const roundedNormalized = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

    return roundedNormalized * magnitude;
  }, [rawMax]);
  const chartData = useMemo<barDataItem[]>(
    () =>
      data.map((item) => ({
        value: item.value,
        label: item.label,
        frontColor: colors.chartBar,
        labelTextStyle: styles.chartLabel,
        barBorderTopLeftRadius: 0,
        barBorderTopRightRadius: 0,
        topLabelComponent: () => (
          <Text style={styles.chartValue}>
            {formatValue ? formatCompact(item.value) : String(item.value)}
          </Text>
        ),
      })),
    [data, formatValue],
  );
  const chartWidth = Math.max(
    Math.min(layout.maxContentWidth, screenWidth) - spacing.xl * 2,
    220,
  );

  if (data.length === 0) {
    return (
      <View style={styles.chartEmptyState}>
        <Text style={styles.chartEmptyText}>No chart data available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartWrap}>
      <BarChart
        adjustToWidth
        barWidth={24}
        data={chartData}
        disablePress
        disableScroll
        endSpacing={0}
        height={116}
        hideRules
        hideYAxisText
        initialSpacing={0}
        isAnimated
        maxValue={chartMax}
        noOfSections={4}
        parentWidth={chartWidth}
        showXAxisIndices={false}
        spacing={spacing.sm}
        stepValue={chartMax / 4}
        xAxisColor="transparent"
        xAxisLabelTextStyle={styles.chartLabel}
        xAxisThickness={0}
        yAxisColor="transparent"
        yAxisThickness={0}
      />
    </View>
  );
}

export function TransactionRow({
  typeLabel,
  dateLabel,
  amount,
  status,
  detailLabel,
  onPress,
}: {
  typeLabel: string;
  dateLabel: string;
  amount: number;
  status: string;
  detailLabel?: string;
  onPress?: () => void;
}) {
  const title = detailLabel ?? typeLabel;
  const subtitle = detailLabel ? typeLabel : dateLabel;
  const statusTone = getStatusTone(status);
  const outflow = typeLabel.toLowerCase().includes("withdrawal");
  const sign = outflow ? "-" : "+";
  const content = (
    <SurfaceCard accent={colors.cardAlt}>
      <View style={styles.transactionRow}>
        <View style={styles.transactionAvatar}>
          <Ionicons color={colors.white} name="person-outline" size={18} />
        </View>
        <View style={styles.rowTypeCell}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.rowSubtitle}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.rowAmountCell}>
          <Text numberOfLines={1} style={[styles.rowAmount, { color: statusTone.text }]}>
            {`${sign}${formatCurrency(Math.abs(amount))}`}
          </Text>
        </View>
        <StatusIcon label={status} />
      </View>
    </SurfaceCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressableRowPressed}>
      {content}
    </Pressable>
  );
}

function isRootShellPath(pathname: string) {
  const rootPaths = new Set([
    "/agent",
    "/agent/members",
    "/agent/more",
    "/agent/transactions",
    "/member",
    "/member/accounts",
    "/member/loans",
    "/member/more",
  ]);

  return rootPaths.has(pathname);
}

function getBackFallbackHref(pathname: string, isAgent: boolean): Href {
  if (isAgent) {
    if (pathname.startsWith("/agent/members")) return "/agent/members" as Href;
    if (pathname.startsWith("/agent/more")) return "/agent/more" as Href;
    if (pathname.startsWith("/agent/transactions")) return "/agent/transactions" as Href;
    return "/agent" as Href;
  }

  if (pathname.startsWith("/member/accounts")) return "/member/accounts" as Href;
  if (pathname.startsWith("/member/loans")) return "/member/loans" as Href;
  if (pathname.startsWith("/member/more")) return "/member/more" as Href;
  if (pathname.startsWith("/member/transactions")) return "/member" as Href;
  return "/member" as Href;
}

export function ActivityRow({
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
      <View style={styles.activityRowTop}>
        <View style={styles.transactionAvatar}>
          <Ionicons color={colors.white} name="person-outline" size={18} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.rowAmount, { color: colors.success }]}>
          {`+${formatCurrency(amount)}`}
        </Text>
        <StatusIcon label={status} />
      </View>
    </SurfaceCard>
  );
}

export function MonthTabStrip({
  tabs,
  selectedKey,
  onSelect,
}: {
  tabs: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.monthTabs}
      showsHorizontalScrollIndicator={false}
      style={styles.monthTabsScroll}
    >
      {tabs.map((tab) => {
        const active = tab.key === selectedKey;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              styles.monthTab,
              active && styles.monthTabActive,
              pressed && styles.monthTabPressed,
            ]}
          >
            <Text style={[styles.monthTabLabel, active && styles.monthTabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function TransactionDayHeader({ label }: { label: string }) {
  return (
    <View style={styles.daySection}>
      <Text style={styles.daySectionLabel}>{label}</Text>
    </View>
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
    backgroundColor: colors.pageTop,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 112,
  },
  container: {
    minHeight: "100%",
    overflow: "hidden",
  },
  frame: {
    alignSelf: "center",
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: 22,
    paddingTop: spacing.lg,
    width: "100%",
  },
  glowOne: {
    backgroundColor: "#FFFFFF",
    borderRadius: 280,
    height: 280,
    opacity: 0.2,
    position: "absolute",
    right: -100,
    top: 60,
    width: 280,
  },
  glowTwo: {
    backgroundColor: colors.foliwe,
    borderRadius: 240,
    bottom: -100,
    height: 240,
    left: -120,
    opacity: 0.18,
    position: "absolute",
    width: 240,
  },
  greetingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  greetingLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 7,
    minWidth: 0,
  },
  avatarCircle: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  greetingText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 14,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  titleSideSpacer: {
    width: 38,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderColor: "rgba(28,35,28,0.1)",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  backButtonPressed: {
    opacity: 0.82,
  },
  titlePill: {
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    flexShrink: 1,
    minWidth: 126,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  titlePillText: {
    color: colors.white,
    fontFamily: typography.medium,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  subtitle: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
    marginTop: -spacing.md,
    textAlign: "center",
  },
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pillDot: {
    borderRadius: 99,
    height: 7,
    width: 7,
  },
  pillText: {
    fontFamily: typography.medium,
    fontSize: 10,
  },
  statusIcon: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: radii.md,
    borderWidth: 0,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  defaultCard: {},
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  homeHeroCard: {
    borderRadius: radii.xl,
    padding: 7,
  },
  softCard: {
    backgroundColor: "rgba(255,255,255,0.56)",
  },
  receiptCard: {
    borderRadius: radii.md,
    ...shadows.receipt,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.heading,
    fontSize: 13,
  },
  sectionAction: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  heroBadge: {
    alignSelf: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: colors.white,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  statLabel: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 12,
    textAlign: "center",
  },
  statValue: {
    color: colors.ink,
    fontFamily: typography.display,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
  },
  statHint: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 11,
    textAlign: "center",
  },
  actionTile: {
    alignItems: "center",
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 70,
    padding: spacing.md,
  },
  actionTilePressed: {
    opacity: 0.82,
  },
  actionIconWrap: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  actionTitle: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  actionCaption: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 11,
    lineHeight: 16,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  infoLabel: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  infoValue: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 12,
    textAlign: "right",
  },
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.fieldStroke,
    borderRadius: 9,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.foliwe,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  secondaryButtonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  chartWrap: {
    marginTop: 0,
  },
  chartEmptyState: {
    alignItems: "center",
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
  },
  chartEmptyText: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  chartLabel: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 12,
  },
  chartValue: {
    color: "transparent",
    fontSize: 1,
    marginBottom: 0,
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  transactionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  transactionAvatar: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  pressableRowPressed: {
    opacity: 0.82,
  },
  activityRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowTypeCell: {
    flex: 1,
    minWidth: 0,
  },
  rowAmountCell: {
    alignItems: "flex-end",
    minWidth: 98,
  },
  rowTitle: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  rowSubtitle: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 11,
  },
  rowAmount: {
    fontFamily: typography.body,
    fontSize: 11,
  },
  monthTabsScroll: {
    marginBottom: spacing.md,
  },
  monthTabs: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  monthTab: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  monthTabActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  monthTabPressed: {
    opacity: 0.88,
  },
  monthTabLabel: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  monthTabLabelActive: {
    color: colors.white,
  },
  daySection: {
    alignItems: "center",
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  daySectionLabel: {
    color: colors.ink,
    fontFamily: typography.body,
    fontSize: 14,
  },
  skeletonLine: {
    backgroundColor: "#E5ECE5",
    borderRadius: radii.pill,
    height: 14,
  },
});
