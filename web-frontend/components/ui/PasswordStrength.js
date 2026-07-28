import { PASSWORD_RULES } from "../../lib/validators";

export default function PasswordStrength({ password }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password || "")).length;
  const pct = (passed / PASSWORD_RULES.length) * 100;
  const color =
    passed <= 2
      ? "bg-red-500"
      : passed <= 4
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password || "");
          return (
            <li
              key={rule.key}
              className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                {ok ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                ) : (
                  <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                )}
              </svg>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
