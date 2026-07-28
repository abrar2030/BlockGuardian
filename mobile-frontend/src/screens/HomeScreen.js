import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: "briefcase-outline",
    title: "Multi-asset portfolios",
    description: "Track stocks, ETFs, crypto, bonds, and more in one place.",
  },
  {
    icon: "stats-chart-outline",
    title: "Real-time performance",
    description: "See P&L, allocation, and returns update as you trade.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Risk monitoring",
    description: "Automatic checks flag positions that breach your limits.",
  },
  {
    icon: "lock-closed-outline",
    title: "Bank-grade security",
    description: "Encrypted data and optional two-factor authentication.",
  },
];

export default function HomeScreen({ navigation }) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
        </View>
        <Text style={styles.logoText}>BlockGuardian</Text>
      </View>

      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>Multi-asset portfolio management</Text>
      </View>

      <Text style={styles.headline}>
        Guard and grow your <Text style={styles.headlineAccent}>portfolio</Text>{" "}
        with total clarity
      </Text>
      <Text style={styles.subheadline}>
        Real-time performance tracking, allocation breakdowns, and automated
        risk monitoring — for stocks, crypto, and everything in between.
      </Text>

      <View style={styles.ctaGroup}>
        {isAuthenticated ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Main")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <Text style={styles.primaryBtnText}>Create free account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Sign in</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.featuresGrid}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={20} color="#818cf8" />
            </View>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDescription}>{f.description}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footerNote}>
        No credit card required · Set up a portfolio in minutes
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#f8fafc", fontSize: 18, fontWeight: "800" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#1e1b4b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#818cf8",
  },
  badgeText: { color: "#a5b4fc", fontSize: 12, fontWeight: "700" },
  headline: {
    color: "#f8fafc",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  },
  headlineAccent: { color: "#818cf8" },
  subheadline: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  ctaGroup: { marginTop: 28, gap: 12 },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  secondaryBtnText: { color: "#f1f5f9", fontSize: 16, fontWeight: "700" },
  featuresGrid: { marginTop: 36, gap: 12 },
  featureCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1e1b4b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  featureTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  featureDescription: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  footerNote: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
    marginTop: 28,
    marginBottom: 8,
  },
});
