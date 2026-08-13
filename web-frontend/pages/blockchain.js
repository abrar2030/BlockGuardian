import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card, { CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/ui/StatCard";
import { PageLoader } from "../components/ui/Spinner";
import { useToast } from "../context/ToastContext";
import { blockchainAPI } from "../services/api";
import { formatNumber, formatTokenAmount } from "../lib/format";

function truncateAddress(address) {
  if (!address || address.length < 12) return address || "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function AddressBadge({ address }) {
  if (!address) return null;
  return (
    <button
      type="button"
      title="Copy full address"
      onClick={() => navigator.clipboard?.writeText(address)}
      className="font-mono text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
    >
      {truncateAddress(address)}
    </button>
  );
}

const CONTRACT_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
  />
);

export default function BlockchainExplorerPage() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await blockchainAPI.explorer();
      setSummary(data);
    } catch (err) {
      toast.error(err.message || "Failed to reach the backend");
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contracts = summary?.contracts || {};
  const contractCount = Object.keys(contracts).length;

  return (
    <DashboardLayout title="Blockchain Explorer">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Live, read-only data from the BlockGuardian smart contracts (see{" "}
            <code className="text-xs">code/blockchain</code>), reached through
            the backend&apos;s <code className="text-xs">/api/blockchain</code>{" "}
            routes.
          </p>
          {!isLoading && (
            <Badge color={summary?.connected ? "green" : "gray"}>
              {summary?.connected ? "Connected" : "Not connected"}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <PageLoader label="Reading on-chain data..." />
        ) : !summary?.connected ? (
          <Card>
            <EmptyState
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  {CONTRACT_ICON}
                </svg>
              }
              title="No local blockchain network reachable"
              description="Start the local dev chain and deploy the contracts, then refresh this page: docker compose --profile blockchain up -d hardhat-node blockchain-deploy"
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Network"
                value={summary.network}
                subtitle={
                  summary.chain_id ? `Chain ID ${summary.chain_id}` : undefined
                }
              />
              <StatCard
                label="Latest block"
                value={
                  summary.latest_block !== undefined
                    ? formatNumber(summary.latest_block, 0)
                    : "-"
                }
              />
              <StatCard label="Contracts deployed" value={contractCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {contracts.testToken && (
                <Card>
                  <CardHeader
                    title="TestToken"
                    subtitle={
                      <AddressBadge address={contracts.testToken.address} />
                    }
                  />
                  <dl className="space-y-2 text-sm">
                    <Row
                      label="Name / Symbol"
                      value={`${contracts.testToken.name || "-"} (${contracts.testToken.symbol || "-"})`}
                    />
                    <Row
                      label="Total supply"
                      value={formatTokenAmount(contracts.testToken.totalSupply)}
                    />
                  </dl>
                </Card>
              )}

              {contracts.tokenizedAsset && (
                <Card>
                  <CardHeader
                    title="TokenizedAsset"
                    subtitle={
                      <AddressBadge
                        address={contracts.tokenizedAsset.address}
                      />
                    }
                    action={
                      <Badge
                        color={
                          contracts.tokenizedAsset.tradingEnabled
                            ? "green"
                            : "gray"
                        }
                      >
                        {contracts.tokenizedAsset.tradingEnabled
                          ? "Trading enabled"
                          : "Trading disabled"}
                      </Badge>
                    }
                  />
                  <dl className="space-y-2 text-sm">
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
                      value={formatTokenAmount(
                        contracts.tokenizedAsset.totalSupply,
                      )}
                    />
                  </dl>
                </Card>
              )}

              {contracts.portfolioManager && (
                <Card>
                  <CardHeader
                    title="PortfolioManager"
                    subtitle={
                      <AddressBadge
                        address={contracts.portfolioManager.address}
                      />
                    }
                  />
                  <dl className="space-y-2 text-sm">
                    <Row
                      label="Total portfolios created"
                      value={formatNumber(
                        contracts.portfolioManager.totalPortfolios,
                        0,
                      )}
                    />
                  </dl>
                </Card>
              )}

              {contracts.tradingPlatform && (
                <Card>
                  <CardHeader
                    title="TradingPlatform"
                    subtitle={
                      <AddressBadge
                        address={contracts.tradingPlatform.address}
                      />
                    }
                    action={
                      <Badge
                        color={
                          contracts.tradingPlatform.tradingEnabled
                            ? "green"
                            : "gray"
                        }
                      >
                        {contracts.tradingPlatform.tradingEnabled
                          ? "Trading enabled"
                          : "Trading disabled"}
                      </Badge>
                    }
                  />
                  <dl className="space-y-2 text-sm">
                    <Row
                      label="Total orders"
                      value={formatNumber(
                        contracts.tradingPlatform.totalOrders,
                        0,
                      )}
                    />
                    <Row
                      label="Total trades"
                      value={formatNumber(
                        contracts.tradingPlatform.totalTrades,
                        0,
                      )}
                    />
                  </dl>
                </Card>
              )}

              {contracts.defiIntegration && (
                <Card>
                  <CardHeader
                    title="DeFiIntegration"
                    subtitle={
                      <AddressBadge
                        address={contracts.defiIntegration.address}
                      />
                    }
                  />
                  <dl className="space-y-2 text-sm">
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
                  </dl>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-white text-right">
        {value}
      </dd>
    </div>
  );
}
