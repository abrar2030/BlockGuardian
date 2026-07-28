import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import RequireAuth from "../components/RequireAuth";
import CreatePortfolioModal from "../components/portfolio/CreatePortfolioModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { portfolioAPI } from "../lib/api";
import { formatCurrency, formatLabel } from "../lib/format";
import { RISK_LEVELS } from "../lib/constants";

function DashboardContent({ navigation }) {
  const { user } = useAuth();
  const toast = useToast();
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await portfolioAPI.list({ per_page: 50 });
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

  const totals = portfolios.reduce(
    (acc, p) => {
      acc.totalValue += p.total_value || 0;
      acc.cashBalance += p.cash_balance || 0;
      acc.invested += p.invested_amount || 0;
      acc.unrealizedPnl += p.unrealized_pnl || 0;
      return acc;
    },
    { totalValue: 0, cashBalance: 0, invested: 0, unrealizedPnl: 0 },
  );
  const returnPercent =
    totals.invested > 0 ? (totals.unrealizedPnl / totals.invested) * 100 : 0;

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
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back, {user?.first_name}</Text>
          <Text style={styles.subGreeting}>
            {portfolios.length} portfolio{portfolios.length === 1 ? "" : "s"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? null : portfolios.length === 0 ? (
        <Card>
          <EmptyState
            icon="briefcase-outline"
            title="Create your first portfolio"
            description="Set a risk profile and starting cash, then start tracking real trades."
            action={
              <Button
                title="Create Portfolio"
                onPress={() => setShowCreate(true)}
              />
            }
          />
        </Card>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatCard
              label="Total Value"
              value={formatCurrency(totals.totalValue)}
              change={returnPercent}
            />
            <StatCard
              label="Cash Balance"
              value={formatCurrency(totals.cashBalance)}
              subtitle="Available"
            />
            <StatCard
              label="Unrealized P&L"
              value={formatCurrency(totals.unrealizedPnl)}
            />
            <StatCard
              label="Portfolios"
              value={String(portfolios.length)}
              subtitle={portfolios.length === 1 ? "portfolio" : "portfolios"}
            />
          </View>

          <Text style={styles.sectionTitle}>Your Portfolios</Text>
          {portfolios.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("PortfolioDetail", {
                  id: p.id,
                  name: p.name,
                })
              }
            >
              <Card style={styles.portfolioCard}>
                <View style={styles.portfolioHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.portfolioName}>{p.name}</Text>
                    <Text style={styles.portfolioType}>
                      {formatLabel(p.portfolio_type)}
                    </Text>
                  </View>
                  <Badge color="indigo">{riskLabel(p.risk_level)}</Badge>
                </View>
                <Text style={styles.portfolioValue}>
                  {formatCurrency(p.total_value, p.base_currency)}
                </Text>
                <Text
                  style={[
                    styles.portfolioPnl,
                    {
                      color:
                        (p.unrealized_pnl || 0) >= 0 ? "#34d399" : "#f87171",
                    },
                  ]}
                >
                  {formatCurrency(p.unrealized_pnl, p.base_currency)} unrealized
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

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

export default function DashboardScreen({ navigation }) {
  return (
    <RequireAuth navigation={navigation}>
      <DashboardContent navigation={navigation} />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  greeting: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  subGreeting: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  portfolioCard: { marginBottom: 12 },
  portfolioHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  portfolioName: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  portfolioType: { color: "#64748b", fontSize: 12, marginTop: 2 },
  portfolioValue: { color: "#f8fafc", fontSize: 22, fontWeight: "800" },
  portfolioPnl: { fontSize: 13, fontWeight: "600", marginTop: 4 },
});
