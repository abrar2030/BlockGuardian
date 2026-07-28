import { StyleSheet, Text, View } from "react-native";

export default function StatCard({ label, value, change, subtitle, style }) {
  const isPositive = typeof change === "number" && change >= 0;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {(change !== undefined || subtitle) && (
        <View style={styles.row}>
          {typeof change === "number" && (
            <Text
              style={[
                styles.change,
                { color: isPositive ? "#34d399" : "#f87171" },
              ]}
            >
              {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </Text>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
    flex: 1,
    minWidth: "45%",
  },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  value: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  change: { fontSize: 12, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#64748b" },
});
