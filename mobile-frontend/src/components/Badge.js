import { StyleSheet, Text, View } from "react-native";

const COLORS = {
  green: { bg: "#064e3b", text: "#6ee7b7" },
  red: { bg: "#450a0a", text: "#fca5a5" },
  yellow: { bg: "#451a03", text: "#fcd34d" },
  blue: { bg: "#1e1b4b", text: "#a5b4fc" },
  indigo: { bg: "#1e1b4b", text: "#c7d2fe" },
  gray: { bg: "#1f2937", text: "#9ca3af" },
};

export default function Badge({ children, color = "gray", style }) {
  const c = COLORS[color] || COLORS.gray;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.text, { color: c.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "700" },
});
