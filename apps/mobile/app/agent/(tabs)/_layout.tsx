import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

import { colors, layout, radii, spacing } from "@/theme/tokens";

export default function AgentTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarShowLabel: false,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            index: focused ? "home" : "home-outline",
            transactions: focused ? "swap-horizontal" : "swap-horizontal-outline",
            members: focused ? "people" : "people-outline",
            more: focused ? "settings" : "settings-outline",
          } as const;

          return (
            <View style={{
              alignItems: "center",
              backgroundColor: focused ? colors.brand : colors.card,
              borderColor: focused ? colors.brand : "#AEB4AA",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 36,
              justifyContent: "center",
              width: 36,
            }}>
              <Ionicons
                color={focused ? colors.white : color}
                name={icons[route.name as keyof typeof icons] ?? "ellipse-outline"}
                size={20}
              />
            </View>
          );
        },
        tabBarItemStyle: { alignItems: "center", justifyContent: "center" },
        tabBarStyle: {
          alignSelf: "center",
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderTopWidth: 0,
          bottom: spacing.sm,
          elevation: 0,
          height: layout.tabBarHeight,
          left: "12%",
          position: "absolute",
          right: "12%",
          shadowOpacity: 0,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
      <Tabs.Screen name="members" options={{ title: "Members" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
