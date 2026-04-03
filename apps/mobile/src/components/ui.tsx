import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
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
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { BarChart, type barDataItem } from "react-native-gifted-charts";

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
      <Text style={styles.primaryButtonText}>{label}</Text>
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
      <Text style={styles.secondaryButtonText}>{label}</Text>
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
      data.map((item, index) => ({
        value: item.value,
        label: item.label,
        frontColor: index % 2 === 0 ? colors.brand : colors.brandSoft,
        labelTextStyle: styles.chartLabel,
        barBorderTopLeftRadius: radii.sm,
        barBorderTopRightRadius: radii.sm,
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
        barWidth={28}
        data={chartData}
        disablePress
        disableScroll
        endSpacing={0}
        height={132}
        hideRules
        hideYAxisText
        initialSpacing={0}
        isAnimated
        maxValue={chartMax}
        noOfSections={4}
        parentWidth={chartWidth}
        roundedTop
        showXAxisIndices={false}
        spacing={spacing.md}
        stepValue={chartMax / 4}
        xAxisColor={colors.border}
        xAxisLabelTextStyle={styles.chartLabel}
        xAxisThickness={1}
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
}: {
  typeLabel: string;
  dateLabel: string;
  amount: number;
  status: string;
  detailLabel?: string;
}) {
  return (
    <SurfaceCard accent={colors.cardAlt}>
      <View style={styles.rowTop}>
        <View style={styles.rowTypeCell}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {typeLabel}
          </Text>
          {detailLabel ? (
            <Text numberOfLines={1} style={styles.rowSubtitle}>
              {detailLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowDateCell}>
          <Text numberOfLines={1} style={styles.rowDate}>
            {dateLabel}
          </Text>
        </View>
        <View style={styles.rowAmountCell}>
          <Text numberOfLines={1} style={styles.rowAmount}>
            {formatCurrency(amount)}
          </Text>
        </View>
        <View style={styles.rowStatusCell}>
          <StatusPill label={status} />
        </View>
      </View>
    </SurfaceCard>
  );
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
      <View style={styles.daySectionDivider} />
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
  buttonDisabled: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: colors.brand,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  chartWrap: {
    marginTop: spacing.sm,
  },
  chartEmptyState: {
    alignItems: "center",
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
  },
  chartEmptyText: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  chartLabel: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  chartValue: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  activityRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  rowTypeCell: {
    flex: 1,
    minWidth: 0,
  },
  rowDateCell: {
    minWidth: 64,
  },
  rowDate: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  rowAmountCell: {
    alignItems: "flex-end",
    minWidth: 86,
  },
  rowStatusCell: {
    alignItems: "flex-end",
    flexShrink: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 13,
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
    fontSize: 13,
  },
  monthTabsScroll: {
    marginBottom: spacing.md,
  },
  monthTabs: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  monthTab: {
    backgroundColor: colors.cardAlt,
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
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  daySectionLabel: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  daySectionDivider: {
    backgroundColor: colors.border,
    height: 1,
    marginTop: spacing.xs,
    width: "100%",
  },
  skeletonLine: {
    backgroundColor: "#E5ECE5",
    borderRadius: radii.pill,
    height: 14,
  },
});
