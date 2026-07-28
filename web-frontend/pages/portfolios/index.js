import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { PageLoader } from "../../components/ui/Spinner";
import CreatePortfolioModal from "../../components/portfolio/CreatePortfolioModal";
import { useToast } from "../../context/ToastContext";
import { portfolioAPI } from "../../services/api";
import { formatCurrency, formatLabel, formatDate } from "../../lib/format";
import { ROUTES, RISK_LEVELS } from "../../utils/constants";

export default function PortfoliosPage() {
  const toast = useToast();
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await portfolioAPI.list({ per_page: 100 });
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

  const riskLabel = (val) =>
    RISK_LEVELS.find((r) => r.value === val)?.label || formatLabel(val);

  return (
    <DashboardLayout title="Portfolios">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {portfolios.length} portfolio{portfolios.length === 1 ? "" : "s"}
          </p>
          <Button onClick={() => setShowCreate(true)} icon={<PlusIcon />}>
            New Portfolio
          </Button>
        </div>

        {isLoading ? (
          <PageLoader label="Loading portfolios..." />
        ) : portfolios.length === 0 ? (
          <Card>
            <EmptyState
              title="No portfolios yet"
              description="Create your first portfolio to start tracking positions, performance, and risk."
              action={
                <Button onClick={() => setShowCreate(true)} icon={<PlusIcon />}>
                  Create Portfolio
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {portfolios.map((p) => (
              <Link key={p.id} href={ROUTES.PORTFOLIO_DETAIL(p.id)}>
                <Card hover className="h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {p.name}
                      </h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatLabel(p.portfolio_type)} · {p.base_currency}
                      </p>
                    </div>
                    <Badge color="indigo">{riskLabel(p.risk_level)}</Badge>
                  </div>
                  {p.description && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {p.description}
                    </p>
                  )}
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
                      unrealized P&amp;L
                    </span>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>Created {formatDate(p.created_at)}</span>
                    {p.risk_violations?.length > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {p.risk_violations.length} alert
                        {p.risk_violations.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

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
