import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { useToast } from "../context/ToastContext";
import { assetAPI } from "../services/api";
import { formatCurrency, formatPercent, formatLabel } from "../lib/format";
import { ASSET_TYPES } from "../utils/constants";

export default function MarketsPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [assetType, setAssetType] = useState("");
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDefault = async () => {
    setIsLoading(true);
    try {
      const results = await assetAPI.list({
        limit: 60,
        ...(assetType ? { asset_type: assetType } : {}),
      });
      setAssets(results || []);
    } catch (err) {
      toast.error(err.message || "Failed to load market data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDefault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType]);

  useEffect(() => {
    if (query.trim().length < 2) {
      if (query.trim().length === 0) loadDefault();
      return;
    }
    setIsLoading(true);
    const handle = setTimeout(async () => {
      try {
        const results = await assetAPI.search(query.trim(), {
          ...(assetType ? { type: assetType } : {}),
        });
        setAssets(results || []);
      } catch (err) {
        toast.error(err.message || "Search failed");
      } finally {
        setIsLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <DashboardLayout title="Markets">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              className="input pl-11"
              placeholder="Search by symbol or name (e.g. AAPL, Bitcoin, Vanguard)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            className="sm:w-56"
            options={ASSET_TYPES}
            placeholder="All asset types"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
          />
        </div>

        {isLoading ? (
          <PageLoader label="Loading market data..." />
        ) : assets.length === 0 ? (
          <Card>
            <EmptyState
              title="No assets found"
              description="Try a different search term or asset type filter."
            />
          </Card>
        ) : (
          <Card padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Symbol</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Exchange</th>
                    <th className="table-header text-right">Price</th>
                    <th className="table-header text-right">24h Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="table-cell font-semibold text-gray-900 dark:text-white">
                        {asset.symbol}
                      </td>
                      <td className="table-cell text-gray-600 dark:text-gray-300">
                        {asset.name}
                        {asset.sector && (
                          <span className="block text-xs text-gray-400">
                            {asset.sector}
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <Badge color="indigo">
                          {formatLabel(asset.asset_type)}
                        </Badge>
                      </td>
                      <td className="table-cell text-gray-500 dark:text-gray-400">
                        {asset.exchange || "-"}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(asset.current_price, asset.currency)}
                      </td>
                      <td
                        className={`table-cell text-right font-medium ${(asset.day_change_percent || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatPercent(asset.day_change_percent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
