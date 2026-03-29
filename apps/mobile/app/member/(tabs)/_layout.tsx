import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors, layout } from "@/theme/tokens";

export default function MemberTabsLayout() {
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
                ? "receipt-outline"
                : route.name === "loans"
                  ? "card-outline"
                  : "person-circle-outline";

          return <Ionicons color={color} name={name} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
      <Tabs.Screen name="loans" options={{ title: "Loans" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
