import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import RequireAuth from "../components/RequireAuth";
import { useToast } from "../context/ToastContext";
import { blockchainAPI } from "../lib/api";
import { formatNumber, formatTokenAmount } from "../lib/format";

function truncateAddress(address) {
  if (!address || address.length < 12) return address || "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ContractCard({ title, address, badge, children }) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardAddress}>{truncateAddress(address)}</Text>
        </View>
        {badge}
      </View>
      {children}
    </Card>
  );
}

function BlockchainContent() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await blockchainAPI.explorer();
      setSummary(data);
    } catch (err) {
      toast.error(err.message || "Failed to reach the backend");
      setSummary(null);
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

  const contracts = summary?.contracts || {};

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
          <Text style={styles.title}>Blockchain Explorer</Text>
          <Text style={styles.subtitle}>
            Live reads from the deployed BlockGuardian smart contracts
          </Text>
        </View>
        {!isLoading && (
          <Badge color={summary?.connected ? "green" : "gray"}>
            {summary?.connected ? "Connected" : "Offline"}
          </Badge>
        )}
      </View>

      {isLoading ? null : !summary?.connected ? (
        <Card>
          <EmptyState
            icon="cube-outline"
            title="No local blockchain network reachable"
            description="Start the local dev chain and deploy the contracts on your backend host, then pull to refresh."
          />
        </Card>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatCard label="Network" value={summary.network} />
            <StatCard
              label="Latest block"
              value={
                summary.latest_block !== undefined
                  ? formatNumber(summary.latest_block, 0)
                  : "-"
              }
            />
          </View>

          {contracts.testToken && (
            <ContractCard
              title="TestToken"
              address={contracts.testToken.address}
            >
              <Row
                label="Name / Symbol"
                value={`${contracts.testToken.name || "-"} (${contracts.testToken.symbol || "-"})`}
              />
              <Row
                label="Total supply"
                value={formatTokenAmount(contracts.testToken.totalSupply)}
              />
            </ContractCard>
          )}

          {contracts.tokenizedAsset && (
            <ContractCard
              title="TokenizedAsset"
              address={contracts.tokenizedAsset.address}
              badge={
                <Badge
                  color={
                    contracts.tokenizedAsset.tradingEnabled ? "green" : "gray"
                  }
                >
                  {contracts.tokenizedAsset.tradingEnabled
                    ? "Trading on"
                    : "Trading off"}
                </Badge>
              }
            >
              <Row
                label="Asset"
                value={`${contracts.tokenizedAsset.assetName || "-"} (${contracts.tokenizedAsset.assetSymbol || "-"})`}
              />
              <Row
                label="Asset value"
                value={
                  contracts.tokenizedAsset.assetValueCents != null
                    ? `$${formatNumber(contracts.tokenizedAsset.assetValueCents / 100, 2)}`
                    : "-"
                }
              />
              <Row
                label="Total supply"
                value={formatTokenAmount(contracts.tokenizedAsset.totalSupply)}
              />
            </ContractCard>
          )}

          {contracts.portfolioManager && (
            <ContractCard
              title="PortfolioManager"
              address={contracts.portfolioManager.address}
            >
              <Row
                label="Total portfolios created"
                value={formatNumber(
                  contracts.portfolioManager.totalPortfolios,
                  0,
                )}
              />
            </ContractCard>
          )}

          {contracts.tradingPlatform && (
            <ContractCard
              title="TradingPlatform"
              address={contracts.tradingPlatform.address}
              badge={
                <Badge
                  color={
                    contracts.tradingPlatform.tradingEnabled ? "green" : "gray"
                  }
                >
                  {contracts.tradingPlatform.tradingEnabled
                    ? "Trading on"
                    : "Trading off"}
                </Badge>
              }
            >
              <Row
                label="Total orders"
                value={formatNumber(contracts.tradingPlatform.totalOrders, 0)}
              />
              <Row
                label="Total trades"
                value={formatNumber(contracts.tradingPlatform.totalTrades, 0)}
              />
            </ContractCard>
          )}

          {contracts.defiIntegration && (
            <ContractCard
              title="DeFiIntegration"
              address={contracts.defiIntegration.address}
            >
              <Row
                label="Total strategies"
                value={formatNumber(
                  contracts.defiIntegration.totalStrategies,
                  0,
                )}
              />
              <Row
                label="Total investments"
                value={formatNumber(
                  contracts.defiIntegration.totalInvestments,
                  0,
                )}
              />
            </ContractCard>
          )}
        </>
      )}
    </Screen>
  );
}

export default function BlockchainScreen({ navigation }) {
  return (
    <RequireAuth navigation={navigation}>
      <BlockchainContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  title: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  cardAddress: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  rowLabel: { color: "#94a3b8", fontSize: 13 },
  rowValue: { color: "#f1f5f9", fontSize: 13, fontWeight: "600" },
});
