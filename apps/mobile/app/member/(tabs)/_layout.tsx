import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

import { colors, layout, radii, spacing } from "@/theme/tokens";

export default function MemberTabsLayout() {
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
            accounts: focused ? "card" : "card-outline",
            loans: focused ? "card" : "card-outline",
            more: focused ? "settings" : "settings-outline",
          } as const;

          return (
            <View style={{
              alignItems: "center",
              backgroundColor: focused ? colors.brand : colors.card,
              borderColor: focused ? colors.brand : "#AEB4AA",
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 40,
              justifyContent: "center",
              width: 40,
            }}>
              <Ionicons
                color={focused ? colors.white : color}
                name={icons[route.name as keyof typeof icons] ?? "ellipse-outline"}
                size={21}
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
          left: "10%",
          position: "absolute",
          right: "10%",
          shadowOpacity: 0,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts" }} />
      <Tabs.Screen name="accounts/deposit" options={{ href: null }} />
      <Tabs.Screen name="accounts/savings" options={{ href: null }} />
      <Tabs.Screen name="loans" options={{ title: "Loans" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
      <Tabs.Screen name="more/about" options={{ href: null }} />
      <Tabs.Screen name="more/legal" options={{ href: null }} />
      <Tabs.Screen name="transactions" options={{ href: null }} />
    </Tabs>
  );
}
