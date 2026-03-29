import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import type { StatusTone } from "../lib/status";

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <View style={[styles.pill, stylesByTone[tone].container]}>
      <Text style={[styles.label, stylesByTone[tone].label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

const stylesByTone: Record<StatusTone, { container: ViewStyle; label: TextStyle }> = {
  offline: {
    container: {
      backgroundColor: "#fbe4db",
      borderColor: "#ecb6a3",
    },
    label: {
      color: "#9a3d23",
    },
  },
  online: {
    container: {
      backgroundColor: "#e0f1e8",
      borderColor: "#a4cfb6",
    },
    label: {
      color: "#155239",
    },
  },
  pendingSync: {
    container: {
      backgroundColor: "#fff1d3",
      borderColor: "#e8cb80",
    },
    label: {
      color: "#8e6512",
    },
  },
  syncing: {
    container: {
      backgroundColor: "#e3effd",
      borderColor: "#aac7ec",
    },
    label: {
      color: "#1b4f85",
    },
  },
  failedSync: {
    container: {
      backgroundColor: "#fde2e5",
      borderColor: "#efb2b9",
    },
    label: {
      color: "#8d2435",
    },
  },
  pendingApproval: {
    container: {
      backgroundColor: "#fff2dd",
      borderColor: "#e8c78b",
    },
    label: {
      color: "#8c5e07",
    },
  },
  approved: {
    container: {
      backgroundColor: "#e1f4e6",
      borderColor: "#add5b6",
    },
    label: {
      color: "#195632",
    },
  },
  rejected: {
    container: {
      backgroundColor: "#fde8e4",
      borderColor: "#efbbb0",
    },
    label: {
      color: "#8a2d1d",
    },
  },
  flagged: {
    container: {
      backgroundColor: "#ffe9cc",
      borderColor: "#efc281",
    },
    label: {
      color: "#8f5600",
    },
  },
  reconciliationRequired: {
    container: {
      backgroundColor: "#fde6d8",
      borderColor: "#efb996",
    },
    label: {
      color: "#8a3d12",
    },
  },
  neutral: {
    container: {
      backgroundColor: "#ebe8e2",
      borderColor: "#d1cbc2",
    },
    label: {
      color: "#564d42",
    },
  },
};
