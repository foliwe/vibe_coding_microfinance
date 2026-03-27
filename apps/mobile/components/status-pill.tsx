import { Text, View } from "react-native";

export function StatusPill({ label }: { label: string }) {
  return (
    <View
      style={{
        backgroundColor: "#e8dbc7",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: "#4d3d28", fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
