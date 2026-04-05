import { Ionicons } from "@expo/vector-icons";
import { router, usePathname, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";

import { colors, layout, typography } from "@/theme/tokens";

type MobileShellRole = "agent" | "member";

type MobileNavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  isActive: (pathname: string) => boolean;
};

const agentNavItems: MobileNavItem[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    href: "/agent",
    isActive: (pathname) => pathname === "/agent",
  },
  {
    key: "transactions",
    label: "Transactions",
    icon: "swap-horizontal-outline",
    href: "/agent/transactions",
    isActive: (pathname) => pathname.startsWith("/agent/transactions"),
  },
  {
    key: "members",
    label: "Members",
    icon: "people-outline",
    href: "/agent/members",
    isActive: (pathname) => pathname.startsWith("/agent/members"),
  },
  {
    key: "more",
    label: "More",
    icon: "ellipsis-horizontal-circle-outline",
    href: "/agent/more",
    isActive: (pathname) =>
      pathname.startsWith("/agent/more") || pathname === "/agent/change-password",
  },
];

const memberNavItems: MobileNavItem[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    href: "/member",
    isActive: (pathname) => pathname === "/member",
  },
  {
    key: "transactions",
    label: "Transactions",
    icon: "receipt-outline",
    href: "/member/transactions",
    isActive: (pathname) => pathname.startsWith("/member/transactions"),
  },
  {
    key: "loans",
    label: "Loans",
    icon: "card-outline",
    href: "/member/loans",
    isActive: (pathname) => pathname.startsWith("/member/loans"),
  },
  {
    key: "more",
    label: "More",
    icon: "person-circle-outline",
    href: "/member/more",
    isActive: (pathname) =>
      pathname.startsWith("/member/more") || pathname === "/member/change-password",
  },
];

function MobileBottomMenu({ role }: { role: MobileShellRole }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const navItems = role === "agent" ? agentNavItems : memberNavItems;
  const paddingBottom = Math.max(insets.bottom, 10);
  const height = layout.tabBarHeight + Math.max(insets.bottom - 10, 0);

  return (
    <View style={styles.safeArea}>
      <View style={[styles.tabBar, { height, paddingBottom }]}>
        {navItems.map((item) => {
          const active = item.isActive(pathname);

          return (
            <Pressable
              key={item.key}
              onPress={() => {
                if (!active) {
                  router.replace(item.href);
                }
              }}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
            >
              <Ionicons
                color={active ? colors.brand : colors.inkMuted}
                name={item.icon}
                size={22}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MobileShell({
  role,
  children,
}: {
  role: MobileShellRole;
  children: ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <View style={styles.content}>{children}</View>
      <MobileBottomMenu role={role} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FAFBF7",
  },
  shell: {
    backgroundColor: colors.page,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    alignItems: "center",
    backgroundColor: "#FAFBF7",
    borderTopColor: "#D7E1D7",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 10,
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  tabItemPressed: {
    opacity: 0.84,
  },
  tabLabel: {
    color: colors.inkMuted,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  tabLabelActive: {
    color: colors.brand,
  },
});
