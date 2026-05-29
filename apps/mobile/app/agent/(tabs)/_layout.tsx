import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "@/theme/tokens";

const tabs = {
  collect: ["add-circle-outline", "Collect"],
  history: ["time-outline", "History"],
  index: ["home", "Home"],
  members: ["people-outline", "Members"],
  more: ["person-outline", "Profile"],
} as const;

export default function AgentTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const [icon, label] = tabs[route.name as keyof typeof tabs] ?? ["ellipse-outline", route.name];

          return (
            <View style={styles.item}>
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
              <Ionicons
                color={focused ? colors.brand : colors.inkMuted}
                name={icon as keyof typeof Ionicons.glyphMap}
                size={24}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </View>
          );
        },
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 66 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="members" options={{ title: "Members" }} />
      <Tabs.Screen
        name="collect"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push("/agent/members");
          },
        }}
        options={{ title: "Collect" }}
      />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="more" options={{ title: "Profile" }} />
      <Tabs.Screen name="transactions" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: "transparent",
    borderRadius: 999,
    height: 3,
    marginBottom: 8,
    width: 56,
  },
  indicatorActive: {
    backgroundColor: colors.brand,
  },
  item: {
    alignItems: "center",
    height: 58,
    justifyContent: "flex-start",
    minWidth: 72,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  labelActive: {
    color: colors.brand,
    fontFamily: typography.medium,
  },
  tabBar: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopColor: "#E5EAF2",
    borderTopWidth: 1,
    elevation: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingTop: 0,
    position: "absolute",
    right: 0,
    boxShadow: "0 -8px 18px rgba(7, 18, 41, 0.06)",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});
