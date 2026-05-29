import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "@/theme/tokens";

const unityLogo = require("../../assets/images/unity-credit-logo.png");

export function UnityLogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <View className="items-center justify-center">
      <View className="flex-row items-center justify-center">
        <Image
          resizeMode="contain"
          source={unityLogo}
          style={compact ? styles.logoSmall : styles.logo}
        />
        <View className="ml-2">
          <Text className="text-white" style={compact ? styles.logoTitleSmall : styles.logoTitle}>
            Unity Credit
          </Text>
          <Text className="text-unity-teal" style={compact ? styles.logoTagSmall : styles.logoTag}>
            Stronger Together
          </Text>
        </View>
      </View>
    </View>
  );
}

export function NotificationBell({
  count = 0,
  onPress,
}: {
  count?: number;
  onPress?: () => void;
}) {
  const pathname = usePathname();
  const notificationsHref = (pathname.startsWith("/agent")
    ? "/agent/notifications"
    : "/member/notifications") as Href;
  const handlePress = onPress ?? (() => router.push(notificationsHref));
  const content = (
    <>
      <Ionicons color={colors.white} name="notifications-outline" size={30} />
      {count > 0 ? (
        <View className="absolute right-0 top-0 min-h-6 min-w-6 items-center justify-center rounded-full bg-unity-teal px-1">
          <Text className="text-xs text-white" style={styles.mediumText}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <Pressable
      accessibilityLabel="Open notifications"
      onPress={handlePress}
      style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function UnityPage({
  title,
  subtitle,
  children,
  contentOverlap = 30,
  contentTopInset = 18,
  showLogo = true,
  showBack = false,
  showBell = true,
  notificationCount = 0,
  onNotificationPress,
  headerContent,
  headerHeight = 330,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  contentOverlap?: number;
  contentTopInset?: number;
  showLogo?: boolean;
  showBack?: boolean;
  showBell?: boolean;
  notificationCount?: number;
  onNotificationPress?: () => void;
  headerContent?: ReactNode;
  headerHeight?: number;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top"]} style={styles.pageSafeArea}>
      <View style={styles.pageRoot}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 108 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.pageScroll}
        >
          <LinearGradient
            colors={["#0057D8", "#003586"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { minHeight: headerHeight }]}
          >
            <Image
              resizeMode="contain"
              source={unityLogo}
              style={styles.headerWatermark}
            />
            <View style={styles.headerInner}>
              <View style={styles.headerTopBar}>
                <View style={styles.headerSlot}>
                  {showBack ? (
                    <Pressable
                      accessibilityLabel="Go back"
                      onPress={() => {
                        if (router.canGoBack()) {
                          router.back();
                        }
                      }}
                      style={({ pressed }) => [styles.iconCircle, pressed && styles.pressed]}
                    >
                      <Ionicons color={colors.white} name="arrow-back" size={29} />
                    </Pressable>
                  ) : null}
                </View>
                {showLogo ? <UnityLogoLockup compact /> : <View />}
                <View style={[styles.headerSlot, styles.headerSlotEnd]}>
                  {showBell ? (
                    <NotificationBell count={notificationCount} onPress={onNotificationPress} />
                  ) : null}
                </View>
              </View>
              {title ? (
                <View style={styles.headerTitleBlock}>
                  <Text className="text-white" style={styles.pageTitle}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text className="mt-2 text-white/90" style={styles.pageSubtitle}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {headerContent}
            </View>
          </LinearGradient>
          <View
            style={[
              styles.contentPanel,
              {
                marginTop: -contentOverlap,
                paddingTop: contentTopInset,
              },
            ]}
          >
            {children}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function UnitySimplePage({
  title,
  subtitle,
  children,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
}) {
  return (
    <UnityPage
      showBack={showBack}
      subtitle={subtitle}
      title={title}
    >
      {children}
    </UnityPage>
  );
}

export function TealSummaryCard({
  eyebrow,
  title,
  amount,
  subtitle,
  footer,
  icon = "wallet",
  size = "compact",
}: {
  eyebrow?: string;
  title: string;
  amount: string;
  subtitle?: string;
  footer?: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: "compact" | "large";
}) {
  const isLarge = size === "large";

  return (
    <LinearGradient
      colors={["#10C7BE", "#00B99F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tealCard, isLarge && styles.tealCardLarge]}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {eyebrow ? (
            <Text className="mb-4 text-white" style={[styles.tealEyebrow, isLarge && styles.tealEyebrowLarge]}>
              {eyebrow}
            </Text>
          ) : null}
          <View className="flex-row items-center">
            <Text className="text-white/90" style={[styles.tealLabel, isLarge && styles.tealLabelLarge]}>
              {title}
            </Text>
            <Ionicons color={colors.white} name="eye-outline" size={20} style={{ marginLeft: 12 }} />
          </View>
          <Text adjustsFontSizeToFit numberOfLines={1} className="mt-2 text-white" style={[styles.tealAmount, isLarge && styles.tealAmountLarge]}>
            {amount}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-white/90" style={[styles.tealSub, isLarge && styles.tealSubLarge]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.tealIconCircle, isLarge && styles.tealIconCircleLarge]}>
          <Ionicons color={colors.white} name={icon} size={isLarge ? 26 : 25} />
        </View>
      </View>
      {footer ? <View className="mt-6">{footer}</View> : null}
    </LinearGradient>
  );
}

export function WhiteCard({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-unity-line bg-white ${className}`} style={styles.cardShadow}>
      {children}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="mb-3 mt-5 flex-row items-center justify-between">
      <Text className="text-unity-ink" style={styles.sectionTitle}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function StatusChip({
  label,
  tone = "success",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "muted";
}) {
  const toneClass = {
    danger: "bg-unity-red-soft text-unity-red",
    info: "bg-blue-50 text-unity-blue",
    muted: "bg-slate-100 text-unity-muted",
    success: "bg-unity-green-soft text-unity-green",
    warning: "bg-unity-orange-soft text-unity-orange",
  }[tone];

  return (
    <View className={`rounded-md px-2 py-1 ${toneClass.split(" ")[0]}`}>
      <Text className={toneClass.split(" ")[1]} style={styles.chipText}>
        {label}
      </Text>
    </View>
  );
}

export function IconBubble({
  icon,
  tone = "blue",
  size = 56,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "blue" | "green" | "orange" | "purple" | "red";
  size?: number;
}) {
  const palette = {
    blue: ["#E7F0FF", colors.brand],
    green: ["#DDF8E9", colors.success],
    orange: ["#FFF0DA", colors.warning],
    purple: ["#EEE5FF", colors.purple],
    red: ["#FFE1E5", colors.danger],
  }[tone];

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ backgroundColor: palette[0], height: size, width: size }}
    >
      <Ionicons color={palette[1]} name={icon} size={Math.round(size * 0.48)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "relative",
    width: 44,
  },
  cardShadow: {
    shadowColor: "#071229",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  chipText: {
    fontFamily: typography.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  contentPanel: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: 420,
    paddingHorizontal: 18,
    position: "relative",
    zIndex: 2,
  },
  header: {
    overflow: "hidden",
    paddingBottom: 28,
    position: "relative",
    zIndex: 1,
  },
  headerInner: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  headerSlot: {
    minWidth: 52,
  },
  headerSlotEnd: {
    alignItems: "flex-end",
  },
  headerTitleBlock: {
    marginTop: 24,
  },
  headerTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  headerWatermark: {
    bottom: -14,
    height: 178,
    opacity: 0.1,
    position: "absolute",
    right: -38,
    width: 178,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  logo: {
    height: 96,
    width: 96,
  },
  logoSmall: {
    height: 44,
    width: 44,
  },
  logoTag: {
    fontFamily: typography.medium,
    fontSize: 18,
    lineHeight: 22,
  },
  logoTagSmall: {
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 15,
  },
  logoTitle: {
    fontFamily: typography.heading,
    fontSize: 38,
    lineHeight: 44,
  },
  logoTitleSmall: {
    fontFamily: typography.heading,
    fontSize: 22,
    lineHeight: 26,
  },
  mediumText: {
    fontFamily: typography.medium,
  },
  pageSubtitle: {
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  pageRoot: {
    backgroundColor: colors.panel,
    flex: 1,
  },
  pageSafeArea: {
    backgroundColor: colors.brand,
    flex: 1,
  },
  pageScroll: {
    backgroundColor: colors.panel,
    flex: 1,
  },
  pageTitle: {
    fontFamily: typography.heading,
    fontSize: 32,
    lineHeight: 38,
  },
  pressed: {
    opacity: 0.75,
  },
  scrollContent: {
    backgroundColor: colors.panel,
    flexGrow: 1,
  },
  sectionTitle: {
    fontFamily: typography.heading,
    fontSize: 16,
    lineHeight: 21,
  },
  tealAmount: {
    fontFamily: typography.heading,
    fontSize: 23,
    lineHeight: 29,
  },
  tealAmountLarge: {
    fontSize: 26,
    lineHeight: 32,
  },
  tealCard: {
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 100,
    padding: 12,
    shadowColor: "#071229",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  tealCardLarge: {
    minHeight: 126,
    padding: 14,
  },
  tealEyebrow: {
    fontFamily: typography.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  tealEyebrowLarge: {
    fontSize: 16,
    lineHeight: 20,
  },
  tealIconCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  tealIconCircleLarge: {
    height: 50,
    width: 50,
  },
  tealLabel: {
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  tealLabelLarge: {
    fontSize: 15,
    lineHeight: 19,
  },
  tealSub: {
    fontFamily: typography.body,
    fontSize: 11,
    lineHeight: 15,
  },
  tealSubLarge: {
    fontSize: 14,
    lineHeight: 18,
  },
});

export const unityStyles = styles;
