import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/theme/tokens";

type MobileShellRole = "agent" | "member";

export function MobileShell({
  role,
  children,
}: {
  role: MobileShellRole;
  children: ReactNode;
}) {
  void role;

  return (
    <View style={styles.shell}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.page,
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
