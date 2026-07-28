import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Tabs from "../../components/ui/Tabs";
import EmptyState from "../../components/ui/EmptyState";
import { PageLoader } from "../../components/ui/Spinner";
import TradeModal from "../../components/portfolio/TradeModal";
import AllocationChart from "../../components/portfolio/AllocationChart";
import RiskPanel from "../../components/portfolio/RiskPanel";
import PortfolioSettingsForm from "../../components/portfolio/PortfolioSettingsForm";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI } from "../../services/api";
import {
  formatCurrency,
  formatDateTime,
  formatLabel,
  formatNumber,
} from "../../lib/format";
import { ROUTES, RISK_LEVELS } from "../../utils/constants";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "holdings", label: "Holdings" },
  { value: "transactions", label: "Transactions" },
  { value: "analytics", label: "Analytics" },
  { value: "settings", label: "Settings" },
];

export default function PortfolioDetailPage() {
  const router = useRouter();
  const { id } = router.query;
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
  const [tradeModal, setTradeModal] = useState(null); // { mode, symbol }

  const loadCore = useCallback(async (portfolioId) => {
    setIsLoading(true);
    try {
      const [p, h] = await Promise.all([
        portfolioAPI.get(portfolioId),
        portfolioAPI.holdings(portfolioId),
      ]);
      setPortfolio(p);
      setHoldings(h);
    } catch (err) {
      toast.error(err.message || "Failed to load portfolio");
      router.push(ROUTES.PORTFOLIOS);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (id) loadCore(id);
  }, [id, loadCore]);

  const loadAnalytics = useCallback(async () => {
    if (!id) return;
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
    if (!id) return;
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
    if (activeTab === "analytics" && !analyticsLoaded) loadAnalytics();
    if (activeTab === "overview" && !analyticsLoaded) loadAnalytics();
    if (activeTab === "transactions" && !txLoaded) loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const refreshAll = async () => {
    await loadCore(id);
    setAnalyticsLoaded(false);
    setTxLoaded(false);
    if (activeTab === "analytics" || activeTab === "overview") loadAnalytics();
    if (activeTab === "transactions") loadTransactions();
  };

  const handleCancelTransaction = async (txId) => {
    try {
      await portfolioAPI.cancelTransaction(id, txId);
      toast.success("Transaction cancelled");
      loadTransactions();
    } catch (err) {
      toast.error(err.message || "Failed to cancel transaction");
    }
  };

  if (isLoading || !portfolio) {
    return (
      <DashboardLayout title="Portfolio">
        <PageLoader label="Loading portfolio..." />
      </DashboardLayout>
    );
  }

  const riskLabel =
    RISK_LEVELS.find((r) => r.value === portfolio.risk_level)?.label ||
    formatLabel(portfolio.risk_level);

  return (
    <DashboardLayout title={portfolio.name}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {portfolio.name}
              </h2>
              <Badge color="indigo">{riskLabel}</Badge>
              <Badge color="gray">
                {formatLabel(portfolio.portfolio_type)}
              </Badge>
            </div>
            {portfolio.description && (
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                {portfolio.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              variant="secondary"
              onClick={() => setTradeModal({ mode: "sell" })}
            >
              Sell
            </Button>
            <Button onClick={() => setTradeModal({ mode: "buy" })}>
              Buy Asset
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="stat-card">
            <span className="stat-label">Total Value</span>
            <span className="stat-value">
              {formatCurrency(portfolio.total_value, portfolio.base_currency)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Cash Balance</span>
            <span className="stat-value">
              {formatCurrency(portfolio.cash_balance, portfolio.base_currency)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Unrealized P&amp;L</span>
            <span
              className={`stat-value ${(portfolio.unrealized_pnl || 0) >= 0 ? "!text-emerald-600 dark:!text-emerald-400" : "!text-red-600 dark:!text-red-400"}`}
            >
              {formatCurrency(
                portfolio.unrealized_pnl,
                portfolio.base_currency,
              )}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Realized P&amp;L</span>
            <span
              className={`stat-value ${(portfolio.realized_pnl || 0) >= 0 ? "!text-emerald-600 dark:!text-emerald-400" : "!text-red-600 dark:!text-red-400"}`}
            >
              {formatCurrency(portfolio.realized_pnl, portfolio.base_currency)}
            </span>
          </div>
        </div>

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
            onCancel={handleCancelTransaction}
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
          <PortfolioSettingsForm
            portfolio={portfolio}
            onUpdated={(updated) => setPortfolio(updated)}
          />
        )}
      </div>

      <TradeModal
        isOpen={Boolean(tradeModal)}
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
    </DashboardLayout>
  );
}

function OverviewTab({ portfolio, holdings, allocation, onBuy }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader title="Top holdings" />
        {holdings.length === 0 ? (
          <EmptyState
            title="No positions yet"
            description="Buy your first asset to start building this portfolio."
            action={<Button onClick={onBuy}>Buy Asset</Button>}
          />
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Asset</th>
                  <th className="table-header text-right">Qty</th>
                  <th className="table-header text-right">Value</th>
                  <th className="table-header text-right">P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...holdings]
                  .sort(
                    (a, b) => (b.current_value || 0) - (a.current_value || 0),
                  )
                  .slice(0, 5)
                  .map((h) => (
                    <tr key={h.id}>
                      <td className="table-cell font-medium text-gray-900 dark:text-white">
                        {h.asset?.symbol}
                      </td>
                      <td className="table-cell text-right">
                        {formatNumber(h.quantity, 4)}
                      </td>
                      <td className="table-cell text-right">
                        {formatCurrency(
                          h.current_value,
                          portfolio.base_currency,
                        )}
                      </td>
                      <td
                        className={`table-cell text-right font-medium ${(h.unrealized_pnl || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatCurrency(
                          h.unrealized_pnl,
                          portfolio.base_currency,
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Allocation" />
        {allocation ? (
          <MiniAllocation byAssetType={allocation.by_asset_type} />
        ) : (
          <p className="text-sm text-gray-400 py-8 text-center">
            Loading allocation…
          </p>
        )}
      </Card>
    </div>
  );
}

function MiniAllocation({ byAssetType = {} }) {
  const entries = Object.entries(byAssetType).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        No positions yet.
      </p>
    );
  }
  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-red-500",
  ];
  return (
    <div className="space-y-3">
      {entries.map(([type, pct], i) => (
        <div key={type}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 dark:text-gray-300">
              {formatLabel(type)}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${colors[i % colors.length]}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HoldingsTab({ holdings, baseCurrency, onBuy, onSell }) {
  return (
    <Card padding="p-0">
      {holdings.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No positions yet"
            description="Buy your first asset to start building this portfolio."
            action={<Button onClick={onBuy}>Buy Asset</Button>}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Asset</th>
                <th className="table-header text-right">Quantity</th>
                <th className="table-header text-right">Avg Cost</th>
                <th className="table-header text-right">Current Price</th>
                <th className="table-header text-right">Value</th>
                <th className="table-header text-right">P&amp;L</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {holdings.map((h) => (
                <tr key={h.id}>
                  <td className="table-cell">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {h.asset?.symbol}
                    </p>
                    <p className="text-xs text-gray-400">{h.asset?.name}</p>
                  </td>
                  <td className="table-cell text-right">
                    {formatNumber(h.quantity, 4)}
                  </td>
                  <td className="table-cell text-right">
                    {formatCurrency(h.average_cost, baseCurrency)}
                  </td>
                  <td className="table-cell text-right">
                    {formatCurrency(h.current_price, baseCurrency)}
                  </td>
                  <td className="table-cell text-right font-medium">
                    {formatCurrency(h.current_value, baseCurrency)}
                  </td>
                  <td
                    className={`table-cell text-right font-medium ${(h.unrealized_pnl || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {formatCurrency(h.unrealized_pnl, baseCurrency)}
                    <span className="block text-xs opacity-75">
                      {h.unrealized_pnl_percent !== undefined &&
                      h.unrealized_pnl_percent !== null
                        ? `${h.unrealized_pnl_percent >= 0 ? "+" : ""}${h.unrealized_pnl_percent.toFixed(2)}%`
                        : ""}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <button
                      onClick={() => onSell(h.asset?.symbol)}
                      className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TransactionsTab({ transactions, loaded, onCancel }) {
  if (!loaded) {
    return <PageLoader label="Loading transactions..." />;
  }
  return (
    <Card padding="p-0">
      {transactions.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No transactions yet"
            description="Your buy and sell activity will show up here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Type</th>
                <th className="table-header">Date</th>
                <th className="table-header text-right">Quantity</th>
                <th className="table-header text-right">Price</th>
                <th className="table-header text-right">Net Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="table-cell">
                    <span
                      className={
                        tx.transaction_type === "buy"
                          ? "badge-green"
                          : tx.transaction_type === "sell"
                            ? "badge-red"
                            : "badge-blue"
                      }
                    >
                      {formatLabel(tx.transaction_type)}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {formatDateTime(tx.executed_at || tx.created_at)}
                  </td>
                  <td className="table-cell text-right">
                    {formatNumber(tx.quantity, 4)}
                  </td>
                  <td className="table-cell text-right">
                    {formatCurrency(tx.price, tx.currency)}
                  </td>
                  <td className="table-cell text-right font-medium">
                    {formatCurrency(tx.net_amount, tx.currency)}
                  </td>
                  <td className="table-cell">
                    <span
                      className={
                        tx.status === "completed"
                          ? "badge-green"
                          : tx.status === "cancelled" || tx.status === "failed"
                            ? "badge-red"
                            : "badge-yellow"
                      }
                    >
                      {formatLabel(tx.status)}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    {["pending", "processing"].includes(tx.status) && (
                      <button
                        onClick={() => onCancel(tx.id)}
                        className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AnalyticsTab({ loaded, performance, allocation, risk, baseCurrency }) {
  if (!loaded) {
    return <PageLoader label="Crunching analytics..." />;
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Performance summary"
          subtitle="Point-in-time snapshot of this portfolio"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <MetricBlock
            label="Total Return"
            value={formatCurrency(performance?.total_return, baseCurrency)}
            positive={(performance?.total_return || 0) >= 0}
          />
          <MetricBlock
            label="Total Return %"
            value={`${(performance?.total_return_percent || 0) >= 0 ? "+" : ""}${(performance?.total_return_percent || 0).toFixed(2)}%`}
            positive={(performance?.total_return_percent || 0) >= 0}
          />
          <MetricBlock
            label="Invested Amount"
            value={formatCurrency(performance?.invested_amount, baseCurrency)}
          />
          <MetricBlock
            label="Cash Balance"
            value={formatCurrency(performance?.cash_balance, baseCurrency)}
          />
          <MetricBlock
            label="Unrealized P&L"
            value={formatCurrency(performance?.unrealized_pnl, baseCurrency)}
            positive={(performance?.unrealized_pnl || 0) >= 0}
          />
          <MetricBlock
            label="Realized P&L"
            value={formatCurrency(performance?.realized_pnl, baseCurrency)}
            positive={(performance?.realized_pnl || 0) >= 0}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Allocation breakdown" />
        <AllocationChart
          byAssetType={allocation?.by_asset_type || {}}
          byAsset={allocation?.by_asset || {}}
        />
      </Card>

      <Card>
        <CardHeader
          title="Risk metrics"
          subtitle="Automated checks against your configured limits"
        />
        <RiskPanel risk={risk} />
      </Card>
    </div>
  );
}

function MetricBlock({ label, value, positive }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p
        className={`text-lg font-bold mt-0.5 ${positive === undefined ? "text-gray-900 dark:text-white" : positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
      >
        {value}
      </p>
    </div>
  );
}
