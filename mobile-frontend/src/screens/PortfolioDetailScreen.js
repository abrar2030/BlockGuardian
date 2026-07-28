import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Tabs from "../components/Tabs";
import EmptyState from "../components/EmptyState";
import RequireAuth from "../components/RequireAuth";
import TradeModal from "../components/portfolio/TradeModal";
import { useToast } from "../context/ToastContext";
import { portfolioAPI } from "../lib/api";
import {
  formatCurrency,
  formatDateTime,
  formatLabel,
  formatNumber,
} from "../lib/format";
import { RISK_LEVELS } from "../lib/constants";
import PortfolioSettingsSheet from "../components/portfolio/PortfolioSettingsSheet";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "holdings", label: "Holdings" },
  { value: "transactions", label: "Transactions" },
  { value: "analytics", label: "Analytics" },
  { value: "settings", label: "Settings" },
];

function PortfolioDetailContent({ route, navigation }) {
  const { id } = route.params;
  const toast = useToast();

  const [portfolio, setPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [risk, setRisk] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);
  const [tradeModal, setTradeModal] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const loadCore = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([
        portfolioAPI.get(id),
        portfolioAPI.holdings(id),
      ]);
      setPortfolio(p);
      setHoldings(h);
    } catch (err) {
      toast.error(err.message || "Failed to load portfolio");
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadCore();
    }, [loadCore]),
  );

  const loadAnalytics = useCallback(async () => {
    try {
      const [perf, alloc, riskData] = await Promise.all([
        portfolioAPI.performance(id),
        portfolioAPI.allocation(id),
        portfolioAPI.risk(id),
      ]);
      setPerformance(perf);
      setAllocation(alloc);
      setRisk(riskData);
      setAnalyticsLoaded(true);
    } catch (err) {
      toast.error(err.message || "Failed to load analytics");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await portfolioAPI.transactions(id, { per_page: 50 });
      setTransactions(data.transactions || []);
      setTxLoaded(true);
    } catch (err) {
      toast.error(err.message || "Failed to load transactions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (
      (activeTab === "analytics" || activeTab === "overview") &&
      !analyticsLoaded
    )
      loadAnalytics();
    if (activeTab === "transactions" && !txLoaded) loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const refreshAll = async () => {
    await loadCore();
    setAnalyticsLoaded(false);
    setTxLoaded(false);
    if (activeTab === "analytics" || activeTab === "overview") loadAnalytics();
    if (activeTab === "transactions") loadTransactions();
  };

  const handleCancelTx = (txId) => {
    Alert.alert("Cancel transaction?", "This cannot be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel transaction",
        style: "destructive",
        onPress: async () => {
          try {
            await portfolioAPI.cancelTransaction(id, txId);
            toast.success("Transaction cancelled");
            loadTransactions();
          } catch (err) {
            toast.error(err.message || "Failed to cancel transaction");
          }
        },
      },
    ]);
  };

  if (isLoading || !portfolio) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const riskLabel =
    RISK_LEVELS.find((r) => r.value === portfolio.risk_level)?.label ||
    formatLabel(portfolio.risk_level);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refreshAll}
            tintColor="#6366f1"
          />
        }
      >
        <View style={styles.badgeRow}>
          <Badge color="indigo">{riskLabel}</Badge>
          <Badge color="gray">{formatLabel(portfolio.portfolio_type)}</Badge>
        </View>
        {portfolio.description ? (
          <Text style={styles.description}>{portfolio.description}</Text>
        ) : null}

        <View style={styles.actionsRow}>
          <Button
            title="Sell"
            variant="secondary"
            style={styles.actionBtn}
            onPress={() => setTradeModal({ mode: "sell" })}
          />
          <Button
            title="Buy Asset"
            style={styles.actionBtn}
            onPress={() => setTradeModal({ mode: "buy" })}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatBlock
            label="Total Value"
            value={formatCurrency(
              portfolio.total_value,
              portfolio.base_currency,
            )}
          />
          <StatBlock
            label="Cash Balance"
            value={formatCurrency(
              portfolio.cash_balance,
              portfolio.base_currency,
            )}
          />
          <StatBlock
            label="Unrealized P&L"
            value={formatCurrency(
              portfolio.unrealized_pnl,
              portfolio.base_currency,
            )}
            positive={(portfolio.unrealized_pnl || 0) >= 0}
          />
          <StatBlock
            label="Realized P&L"
            value={formatCurrency(
              portfolio.realized_pnl,
              portfolio.base_currency,
            )}
            positive={(portfolio.realized_pnl || 0) >= 0}
          />
        </View>

        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <OverviewTab
            portfolio={portfolio}
            holdings={holdings}
            allocation={allocation}
            onBuy={() => setTradeModal({ mode: "buy" })}
          />
        )}
        {activeTab === "holdings" && (
          <HoldingsTab
            holdings={holdings}
            baseCurrency={portfolio.base_currency}
            onBuy={() => setTradeModal({ mode: "buy" })}
            onSell={(symbol) => setTradeModal({ mode: "sell", symbol })}
          />
        )}
        {activeTab === "transactions" && (
          <TransactionsTab
            transactions={transactions}
            loaded={txLoaded}
            onCancel={handleCancelTx}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab
            loaded={analyticsLoaded}
            performance={performance}
            allocation={allocation}
            risk={risk}
            baseCurrency={portfolio.base_currency}
          />
        )}
        {activeTab === "settings" && (
          <Card>
            <Text style={styles.settingsHint}>
              Manage this portfolio&apos;s name, risk limits, or delete it
              entirely.
            </Text>
            <Button
              title="Open portfolio settings"
              onPress={() => setShowSettings(true)}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}
      </ScrollView>

      <TradeModal
        visible={Boolean(tradeModal)}
        mode={tradeModal?.mode}
        presetSymbol={tradeModal?.symbol}
        portfolioId={id}
        holdings={holdings}
        onClose={() => setTradeModal(null)}
        onSuccess={() => {
          setTradeModal(null);
          refreshAll();
        }}
      />

      <PortfolioSettingsSheet
        visible={showSettings}
        portfolio={portfolio}
        onClose={() => setShowSettings(false)}
        onUpdated={(updated) => {
          setPortfolio(updated);
          setShowSettings(false);
        }}
        onDeleted={() => navigation.goBack()}
      />
    </View>
  );
}

function StatBlock({ label, value, positive }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          positive !== undefined && { color: positive ? "#34d399" : "#f87171" },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function OverviewTab({ holdings, allocation, onBuy }) {
  return (
    <View>
      <Card title="Top Holdings">
        {holdings.length === 0 ? (
          <EmptyState
            icon="pie-chart-outline"
            title="No positions yet"
            description="Buy your first asset to start building this portfolio."
            action={<Button title="Buy Asset" onPress={onBuy} />}
          />
        ) : (
          [...holdings]
            .sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
            .slice(0, 5)
            .map((h) => (
              <View key={h.id} style={styles.holdingRow}>
                <Text style={styles.holdingSymbol}>{h.asset?.symbol}</Text>
                <Text style={styles.holdingValue}>
                  {formatCurrency(h.current_value)}
                </Text>
                <Text
                  style={[
                    styles.holdingPnl,
                    {
                      color:
                        (h.unrealized_pnl || 0) >= 0 ? "#34d399" : "#f87171",
                    },
                  ]}
                >
                  {formatCurrency(h.unrealized_pnl)}
                </Text>
              </View>
            ))
        )}
      </Card>

      <Card title="Allocation">
        <AllocationBars byAssetType={allocation?.by_asset_type} />
      </Card>
    </View>
  );
}

function AllocationBars({ byAssetType }) {
  if (!byAssetType) {
    return <Text style={styles.mutedCenter}>Loading allocation…</Text>;
  }
  const entries = Object.entries(byAssetType).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <Text style={styles.mutedCenter}>No positions yet.</Text>;
  }
  const palette = [
    "#6366f1",
    "#8b5cf6",
    "#22d3ee",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];
  return (
    <View style={{ gap: 12 }}>
      {entries.map(([type, pct], i) => (
        <View key={type}>
          <View style={styles.allocRow}>
            <Text style={styles.allocLabel}>{formatLabel(type)}</Text>
            <Text style={styles.allocPct}>{pct.toFixed(1)}%</Text>
          </View>
          <View style={styles.allocTrack}>
            <View
              style={[
                styles.allocFill,
                {
                  width: `${pct}%`,
                  backgroundColor: palette[i % palette.length],
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function HoldingsTab({ holdings, onBuy, onSell }) {
  if (holdings.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="pie-chart-outline"
          title="No positions yet"
          description="Buy your first asset to start building this portfolio."
          action={<Button title="Buy Asset" onPress={onBuy} />}
        />
      </Card>
    );
  }
  return (
    <View>
      {holdings.map((h) => (
        <Card key={h.id}>
          <View style={styles.holdingHeader}>
            <View>
              <Text style={styles.holdingSymbolLg}>{h.asset?.symbol}</Text>
              <Text style={styles.holdingName}>{h.asset?.name}</Text>
            </View>
            <TouchableOpacity onPress={() => onSell(h.asset?.symbol)}>
              <Text style={styles.sellLink}>Sell</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.holdingStatsGrid}>
            <MiniStat label="Quantity" value={formatNumber(h.quantity, 4)} />
            <MiniStat label="Avg Cost" value={formatCurrency(h.average_cost)} />
            <MiniStat
              label="Current Price"
              value={formatCurrency(h.current_price)}
            />
            <MiniStat label="Value" value={formatCurrency(h.current_value)} />
          </View>
          <Text
            style={[
              styles.holdingPnlLg,
              { color: (h.unrealized_pnl || 0) >= 0 ? "#34d399" : "#f87171" },
            ]}
          >
            {formatCurrency(h.unrealized_pnl)}{" "}
            {h.unrealized_pnl_percent !== undefined &&
            h.unrealized_pnl_percent !== null
              ? `(${h.unrealized_pnl_percent >= 0 ? "+" : ""}${h.unrealized_pnl_percent.toFixed(2)}%)`
              : ""}
          </Text>
        </Card>
      ))}
    </View>
  );
}

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function TransactionsTab({ transactions, loaded, onCancel }) {
  if (!loaded) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }
  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="receipt-outline"
          title="No transactions yet"
          description="Your buy and sell activity will show up here."
        />
      </Card>
    );
  }
  return (
    <View>
      {transactions.map((tx) => (
        <Card key={tx.id}>
          <View style={styles.txHeader}>
            <Badge
              color={
                tx.transaction_type === "buy"
                  ? "green"
                  : tx.transaction_type === "sell"
                    ? "red"
                    : "blue"
              }
            >
              {formatLabel(tx.transaction_type)}
            </Badge>
            <Badge
              color={
                tx.status === "completed"
                  ? "green"
                  : tx.status === "cancelled" || tx.status === "failed"
                    ? "red"
                    : "yellow"
              }
            >
              {formatLabel(tx.status)}
            </Badge>
          </View>
          <Text style={styles.txDate}>
            {formatDateTime(tx.executed_at || tx.created_at)}
          </Text>
          <View style={styles.txStatsRow}>
            <MiniStat label="Quantity" value={formatNumber(tx.quantity, 4)} />
            <MiniStat
              label="Price"
              value={formatCurrency(tx.price, tx.currency)}
            />
            <MiniStat
              label="Net Amount"
              value={formatCurrency(tx.net_amount, tx.currency)}
            />
          </View>
          {["pending", "processing"].includes(tx.status) && (
            <TouchableOpacity
              onPress={() => onCancel(tx.id)}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.sellLink}>Cancel transaction</Text>
            </TouchableOpacity>
          )}
        </Card>
      ))}
    </View>
  );
}

function AnalyticsTab({ loaded, performance, allocation, risk, baseCurrency }) {
  if (!loaded) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }
  return (
    <View>
      <Card title="Performance summary">
        <View style={styles.metricGrid}>
          <MetricBlock
            label="Total Return"
            value={formatCurrency(performance?.total_return, baseCurrency)}
            positive={(performance?.total_return || 0) >= 0}
          />
          <MetricBlock
            label="Return %"
            value={`${(performance?.total_return_percent || 0) >= 0 ? "+" : ""}${(performance?.total_return_percent || 0).toFixed(2)}%`}
            positive={(performance?.total_return_percent || 0) >= 0}
          />
          <MetricBlock
            label="Invested"
            value={formatCurrency(performance?.invested_amount, baseCurrency)}
          />
          <MetricBlock
            label="Cash"
            value={formatCurrency(performance?.cash_balance, baseCurrency)}
          />
        </View>
      </Card>

      <Card title="Allocation breakdown">
        <AllocationBars byAssetType={allocation?.by_asset_type} />
      </Card>

      <Card title="Risk metrics">
        <RiskGauges risk={risk} />
      </Card>
    </View>
  );
}

function MetricBlock({ label, value, positive }) {
  return (
    <View style={styles.metricBlock}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          positive !== undefined && { color: positive ? "#34d399" : "#f87171" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function RiskGauges({ risk }) {
  if (!risk) return null;
  const scoreColor =
    risk.risk_score <= 20
      ? "#10b981"
      : risk.risk_score <= 50
        ? "#f59e0b"
        : "#ef4444";
  return (
    <View>
      <View style={{ marginBottom: 16 }}>
        <View style={styles.allocRow}>
          <Text style={styles.allocLabel}>Risk Score</Text>
          <Text style={[styles.allocPct, { color: scoreColor }]}>
            {Math.round(risk.risk_score || 0)} / 100
          </Text>
        </View>
        <View style={styles.allocTrack}>
          <View
            style={[
              styles.allocFill,
              {
                width: `${Math.min(risk.risk_score || 0, 100)}%`,
                backgroundColor: scoreColor,
              },
            ]}
          />
        </View>
      </View>
      <View style={{ marginBottom: 16 }}>
        <View style={styles.allocRow}>
          <Text style={styles.allocLabel}>Volatility</Text>
          <Text style={styles.allocPct}>
            {(risk.volatility || 0).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.allocTrack}>
          <View
            style={[
              styles.allocFill,
              {
                width: `${Math.min(risk.volatility || 0, 100)}%`,
                backgroundColor: "#6366f1",
              },
            ]}
          />
        </View>
      </View>

      {!risk.violations || risk.violations.length === 0 ? (
        <View style={styles.noViolationBox}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#34d399" />
          <Text style={styles.noViolationText}>
            No risk limit violations detected.
          </Text>
        </View>
      ) : (
        risk.violations.map((v, idx) => (
          <View key={idx} style={styles.violationBox}>
            <Ionicons name="warning-outline" size={16} color="#fbbf24" />
            <View style={{ flex: 1 }}>
              <Text style={styles.violationTitle}>
                {v.type === "position_size"
                  ? `${v.asset} exceeds max position size`
                  : `${formatLabel(v.sector)} sector exceeds max allocation`}
              </Text>
              <Text style={styles.violationDetail}>
                Currently {(v.current * 100).toFixed(1)}% · Limit{" "}
                {(v.limit * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export default function PortfolioDetailScreen({ route, navigation }) {
  return (
    <RequireAuth navigation={navigation}>
      <PortfolioDetailContent route={route} navigation={navigation} />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#05070d" },
  scrollContent: { padding: 20, paddingBottom: 48 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05070d",
  },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  description: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statBlock: {
    flexBasis: "47%",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  statValue: { color: "#f8fafc", fontSize: 17, fontWeight: "800" },
  settingsHint: { color: "#94a3b8", fontSize: 13, lineHeight: 18 },
  holdingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#334155",
  },
  holdingSymbol: { color: "#f8fafc", fontWeight: "700", fontSize: 13, flex: 1 },
  holdingValue: { color: "#e2e8f0", fontSize: 13, flex: 1, textAlign: "right" },
  holdingPnl: { fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  mutedCenter: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 24,
  },
  allocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  allocLabel: { color: "#cbd5e1", fontSize: 13 },
  allocPct: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
  allocTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#334155",
    overflow: "hidden",
  },
  allocFill: { height: "100%", borderRadius: 3 },
  holdingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  holdingSymbolLg: { color: "#f8fafc", fontSize: 16, fontWeight: "700" },
  holdingName: { color: "#64748b", fontSize: 12, marginTop: 2 },
  sellLink: { color: "#f87171", fontSize: 13, fontWeight: "700" },
  holdingStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  miniStat: { flexBasis: "47%" },
  miniStatLabel: { color: "#64748b", fontSize: 11, marginBottom: 2 },
  miniStatValue: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  holdingPnlLg: { fontSize: 14, fontWeight: "700" },
  txHeader: { flexDirection: "row", gap: 8, marginBottom: 10 },
  txDate: { color: "#64748b", fontSize: 12, marginBottom: 10 },
  txStatsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  metricBlock: { flexBasis: "45%" },
  metricValue: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  noViolationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#064e3b",
    borderRadius: 10,
    padding: 12,
  },
  noViolationText: { color: "#a7f3d0", fontSize: 13, flex: 1 },
  violationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#451a03",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  violationTitle: { color: "#fde68a", fontSize: 13, fontWeight: "600" },
  violationDetail: { color: "#fcd34d", fontSize: 11, marginTop: 2 },
});
