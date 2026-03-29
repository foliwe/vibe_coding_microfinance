import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors, layout } from "@/theme/tokens";

export default function AgentTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: "#FAFBF7",
          borderTopColor: "#D7E1D7",
          height: layout.tabBarHeight,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === "index"
              ? "home-outline"
              : route.name === "transactions"
                ? "swap-horizontal-outline"
                : route.name === "members"
                  ? "people-outline"
                  : "ellipsis-horizontal-circle-outline";

          return <Ionicons color={color} name={name} size={size} />;
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
