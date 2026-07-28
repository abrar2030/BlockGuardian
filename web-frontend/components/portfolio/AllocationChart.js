import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatLabel } from "../../lib/format";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#22d3ee",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
];

export default function AllocationChart({ byAssetType = {}, byAsset = {} }) {
  const typeData = Object.entries(byAssetType).map(([key, pct]) => ({
    name: formatLabel(key),
    value: Number(pct.toFixed(2)),
  }));

  const assetRows = Object.entries(byAsset)
    .map(([symbol, info]) => ({ symbol, ...info }))
    .sort((a, b) => b.value - a.value);

  if (typeData.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">
        No positions yet — buy an asset to see your allocation breakdown.
      </p>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={typeData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {typeData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `${value}%`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgb(229 231 235)",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            By asset type
          </p>
          <ul className="space-y-2">
            {typeData.map((d, i) => (
              <li
                key={d.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {d.name}
                  </span>
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {d.value}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        {assetRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              By position
            </p>
            <ul className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
              {assetRows.map((row) => (
                <li
                  key={row.symbol}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {row.symbol}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatCurrency(row.value)} ({row.percentage.toFixed(1)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
