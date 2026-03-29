import { Link } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { Screen, SurfaceCard } from "@/components/ui";
import { colors, typography } from "@/theme/tokens";

export default function NotFoundScreen() {
  return (
    <Screen subtitle="This route is not part of the new mobile shell." title="Route Not Found">
      <SurfaceCard>
        <Text style={styles.body}>The page you opened does not exist in the reset Expo app.</Text>
        <Link href="/welcome" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Return to welcome</Text>
          </Pressable>
        </Link>
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.inkMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  linkButton: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
  },
  linkText: {
    color: colors.white,
    fontFamily: typography.medium,
    fontSize: 15,
  },
});
