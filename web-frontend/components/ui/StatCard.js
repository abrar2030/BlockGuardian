export default function StatCard({ label, value, change, icon, subtitle }) {
  const isPositive = typeof change === "number" && change >= 0;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
        )}
      </div>
      <span className="stat-value">{value}</span>
      {(change !== undefined || subtitle) && (
        <div className="flex items-center gap-1.5">
          {typeof change === "number" && (
            <span
              className={
                isPositive ? "stat-change-positive" : "stat-change-negative"
              }
            >
              {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
