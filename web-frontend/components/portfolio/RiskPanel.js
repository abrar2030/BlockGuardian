import { formatLabel } from "../../lib/format";

const RISK_COLOR = (score) => {
  if (score <= 20)
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    };
  if (score <= 50)
    return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
};

export default function RiskPanel({ risk }) {
  if (!risk) return null;
  const colors = RISK_COLOR(risk.risk_score || 0);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Risk Score
            </span>
            <span className={`text-sm font-bold ${colors.text}`}>
              {Math.round(risk.risk_score || 0)} / 100
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
              style={{ width: `${Math.min(risk.risk_score || 0, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Volatility
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {(risk.volatility || 0).toFixed(2)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(risk.volatility || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <LimitStat label="Max Position Size" value={risk.max_position_size} />
        <LimitStat
          label="Max Sector Allocation"
          value={risk.max_sector_allocation}
        />
        <LimitStat
          label="Stop-loss Threshold"
          value={risk.stop_loss_threshold}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Active alerts
        </p>
        {!risk.violations || risk.violations.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75l2.25 2.25 4.5-4.5m4.5.75a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            No risk limit violations detected.
          </div>
        ) : (
          <ul className="space-y-2">
            {risk.violations.map((v, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500"
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
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    {v.type === "position_size"
                      ? `${v.asset} exceeds max position size`
                      : `${formatLabel(v.sector)} sector exceeds max allocation`}
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                    Currently {(v.current * 100).toFixed(1)}% · Limit{" "}
                    {(v.limit * 100).toFixed(1)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LimitStat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
        {value !== undefined && value !== null
          ? `${(value * 100).toFixed(0)}%`
          : "-"}
      </p>
    </div>
  );
}
