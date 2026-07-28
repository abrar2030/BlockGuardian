import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import RequireAuth from "../components/RequireAuth";
import CreatePortfolioModal from "../components/portfolio/CreatePortfolioModal";
import { useToast } from "../context/ToastContext";
import { portfolioAPI } from "../lib/api";
import { formatCurrency, formatDate, formatLabel } from "../lib/format";
import { RISK_LEVELS } from "../lib/constants";

function PortfoliosContent({ navigation }) {
  const toast = useToast();
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await portfolioAPI.list({ per_page: 100 });
      setPortfolios(data.portfolios || []);
    } catch (err) {
      toast.error(err.message || "Failed to load portfolios");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const riskLabel = (val) =>
    RISK_LEVELS.find((r) => r.value === val)?.label || formatLabel(val);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Portfolios</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {!isLoading && portfolios.length === 0 && (
        <Card>
          <EmptyState
            icon="briefcase-outline"
            title="No portfolios yet"
            description="Create your first portfolio to start tracking positions."
            action={
              <Button
                title="Create Portfolio"
                onPress={() => setShowCreate(true)}
              />
            }
          />
        </Card>
      )}

      {portfolios.map((p) => (
        <TouchableOpacity
          key={p.id}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("PortfolioDetail", { id: p.id, name: p.name })
          }
        >
          <Card>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.portfolioName}>{p.name}</Text>
                <Text style={styles.portfolioMeta}>
                  {formatLabel(p.portfolio_type)} · {p.base_currency}
                </Text>
              </View>
              <Badge color="indigo">{riskLabel(p.risk_level)}</Badge>
            </View>
            <Text style={styles.value}>
              {formatCurrency(p.total_value, p.base_currency)}
            </Text>
            <Text
              style={[
                styles.pnl,
                { color: (p.unrealized_pnl || 0) >= 0 ? "#34d399" : "#f87171" },
              ]}
            >
              {formatCurrency(p.unrealized_pnl, p.base_currency)} unrealized
            </Text>
            <View style={styles.footerRow}>
              <Text style={styles.createdAt}>
                Created {formatDate(p.created_at)}
              </Text>
              {p.risk_violations?.length > 0 && (
                <Text style={styles.alertText}>
                  {p.risk_violations.length} alert
                  {p.risk_violations.length === 1 ? "" : "s"}
                </Text>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <CreatePortfolioModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />
    </Screen>
  );
}

export default function PortfoliosScreen({ navigation }) {
  return (
    <RequireAuth navigation={navigation}>
      <PortfoliosContent navigation={navigation} />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  portfolioName: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  portfolioMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  value: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  pnl: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  createdAt: { color: "#64748b", fontSize: 11 },
  alertText: { color: "#fbbf24", fontSize: 11, fontWeight: "700" },
});
