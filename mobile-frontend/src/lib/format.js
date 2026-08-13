export function formatCurrency(value, currency = "USD") {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Math.abs(num) < 1 ? 4 : 2,
    }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

export function formatNumber(value, decimals = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return num.toFixed(decimals);
  }
}

export function formatPercent(value, decimals = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `${num >= 0 ? "+" : ""}${num.toFixed(decimals)}%`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toString();
  }
}

export function formatLabel(value) {
  if (!value) return "—";
  return String(value)
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatTokenAmount(value, decimals = 18, displayDecimals = 2) {
  // Contract balances/supplies come back from the backend as decimal-string
  // integers (e.g. "1000000000000000000000000") to avoid precision loss on
  // values that exceed JS's safe integer range - this converts one back to
  // a human-readable token amount (e.g. "1,000,000.00").
  if (value === null || value === undefined) return "—";
  const str = String(value);
  if (!/^\d+$/.test(str)) return "—";

  const padded = str.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals) || "0";
  const fraction = padded.slice(padded.length - decimals);

  const combined = Number(whole) + Number(`0.${fraction || "0"}`);
  if (!Number.isFinite(combined)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: displayDecimals,
      maximumFractionDigits: displayDecimals,
    }).format(combined);
  } catch {
    return combined.toFixed(displayDecimals);
  }
}

export function initials(firstName = "", lastName = "") {
  return (
    `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase() ||
    "U"
  );
}
