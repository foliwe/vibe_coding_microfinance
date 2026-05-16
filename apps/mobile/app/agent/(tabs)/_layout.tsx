import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing } from "@/theme/tokens";

export default function AgentTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing.xs);
  const tabBarHeight = 54 + bottomInset;

  const tabBubbleStyle = (focused: boolean) => ({
    alignItems: "center" as const,
    backgroundColor: focused ? colors.brand : "transparent",
    borderColor: focused ? colors.brand : "transparent",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center" as const,
    width: 42,
  });

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
            <View style={tabBubbleStyle(focused)}>
              <Ionicons
                color={focused ? colors.white : colors.ink}
                name={icons[route.name as keyof typeof icons] ?? "ellipse-outline"}
                size={27}
              />
            </View>
          );
        },
        tabBarItemStyle: {
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          paddingBottom: Math.round(bottomInset * 0.45),
          paddingTop: 4,
          paddingHorizontal: 0,
        },
        tabBarStyle: {
          alignSelf: "center",
          backgroundColor: colors.foliwe,
          borderColor: colors.foliwe,
          borderTopWidth: 0,
          bottom: spacing.sm,
          elevation: 0,
          height: tabBarHeight,
          left: 16,
          paddingHorizontal: spacing.xs,
          paddingTop: spacing.xs,
          paddingBottom: bottomInset,
          position: "absolute",
          right: 16,
          borderRadius: radii.lg,
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
