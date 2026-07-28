const COLOR_MAP = {
  green: "badge-green",
  red: "badge-red",
  yellow: "badge-yellow",
  blue: "badge-blue",
  indigo: "badge-indigo",
  gray: "badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

export default function Badge({ children, color = "gray", className = "" }) {
  return (
    <span className={`${COLOR_MAP[color] || COLOR_MAP.gray} ${className}`}>
      {children}
    </span>
  );
}
