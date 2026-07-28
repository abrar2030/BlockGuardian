import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import CreatePortfolioModal from "../components/portfolio/CreatePortfolioModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { portfolioAPI } from "../services/api";
import { formatCurrency, formatLabel } from "../lib/format";
import { ROUTES, RISK_LEVELS } from "../utils/constants";

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const data = await portfolioAPI.list({ per_page: 50 });
      setPortfolios(data.portfolios || []);
    } catch (err) {
      toast.error(err.message || "Failed to load portfolios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = portfolios.reduce(
    (acc, p) => {
      acc.totalValue += p.total_value || 0;
      acc.cashBalance += p.cash_balance || 0;
      acc.invested += p.invested_amount || 0;
      acc.unrealizedPnl += p.unrealized_pnl || 0;
      acc.realizedPnl += p.realized_pnl || 0;
      return acc;
    },
    {
      totalValue: 0,
      cashBalance: 0,
      invested: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
    },
  );
  const returnPercent =
    totals.invested > 0 ? (totals.unrealizedPnl / totals.invested) * 100 : 0;

  const riskLabel = (val) =>
    RISK_LEVELS.find((r) => r.value === val)?.label || formatLabel(val);

  return (
    <DashboardLayout title="Dashboard">
      {isLoading ? (
        <PageLoader label="Loading your dashboard..." />
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.first_name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Here&apos;s what&apos;s happening across your{" "}
                {portfolios.length} portfolio
                {portfolios.length === 1 ? "" : "s"}.
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)} icon={<PlusIcon />}>
              New Portfolio
            </Button>
          </div>

          {portfolios.length === 0 ? (
            <Card>
              <EmptyState
                title="Create your first portfolio"
                description="Set a risk profile and starting cash balance, then start tracking real trades across stocks, crypto, and more."
                action={
                  <Button
                    onClick={() => setShowCreate(true)}
                    icon={<PlusIcon />}
                  >
                    Create Portfolio
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <StatCard
                  label="Total Value"
                  value={formatCurrency(totals.totalValue)}
                  change={returnPercent}
                />
                <StatCard
                  label="Cash Balance"
                  value={formatCurrency(totals.cashBalance)}
                  subtitle="Available to invest"
                />
                <StatCard
                  label="Unrealized P&L"
                  value={formatCurrency(totals.unrealizedPnl)}
                  subtitle={totals.unrealizedPnl >= 0 ? "Gain" : "Loss"}
                />
                <StatCard
                  label="Realized P&L"
                  value={formatCurrency(totals.realizedPnl)}
                  subtitle="From closed positions"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title">Your Portfolios</h3>
                  <Link
                    href={ROUTES.PORTFOLIOS}
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {portfolios.slice(0, 6).map((p) => (
                    <Link key={p.id} href={ROUTES.PORTFOLIO_DETAIL(p.id)}>
                      <Card hover className="h-full">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {p.name}
                            </h4>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {formatLabel(p.portfolio_type)}
                            </p>
                          </div>
                          <Badge color="indigo">
                            {riskLabel(p.risk_level)}
                          </Badge>
                        </div>
                        <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(p.total_value, p.base_currency)}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span
                            className={
                              (p.unrealized_pnl || 0) >= 0
                                ? "stat-change-positive"
                                : "stat-change-negative"
                            }
                          >
                            {formatCurrency(p.unrealized_pnl, p.base_currency)}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500">
                            unrealized
                          </span>
                        </div>
                        {p.risk_violations?.length > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                              />
                            </svg>
                            {p.risk_violations.length} risk alert
                            {p.risk_violations.length === 1 ? "" : "s"}
                          </div>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <CreatePortfolioModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />
    </DashboardLayout>
  );
}

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}
