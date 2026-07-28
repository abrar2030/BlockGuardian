export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-thin">
      <nav className="flex gap-1 min-w-max" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={
              active === tab.value ? "tab-button-active" : "tab-button-inactive"
            }
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
