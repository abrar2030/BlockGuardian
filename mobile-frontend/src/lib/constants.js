// Application constants - matched 1:1 to code/backend/src/routes

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";
export const API_BASE_PATH = process.env.EXPO_PUBLIC_API_BASE_PATH || "/api";

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    SETUP_MFA: "/auth/setup-mfa",
    ENABLE_MFA: "/auth/enable-mfa",
    DISABLE_MFA: "/auth/disable-mfa",
    CHANGE_PASSWORD: "/auth/change-password",
    PROFILE: "/auth/profile",
    VERIFY_TOKEN: "/auth/verify-token",
  },
  PORTFOLIO: {
    LIST: "/portfolios/",
    CREATE: "/portfolios/",
    DETAIL: (id) => `/portfolios/${id}`,
    UPDATE: (id) => `/portfolios/${id}`,
    DELETE: (id) => `/portfolios/${id}`,
    HOLDINGS: (id) => `/portfolios/${id}/holdings`,
    TRANSACTIONS: (id) => `/portfolios/${id}/transactions`,
    CANCEL_TRANSACTION: (id, txId) =>
      `/portfolios/${id}/transactions/${txId}/cancel`,
    BUY: (id) => `/portfolios/${id}/buy`,
    SELL: (id) => `/portfolios/${id}/sell`,
    PERFORMANCE: (id) => `/portfolios/${id}/performance`,
    ALLOCATION: (id) => `/portfolios/${id}/allocation`,
    RISK: (id) => `/portfolios/${id}/risk`,
  },
  ASSETS: {
    LIST: "/portfolios/assets",
    SEARCH: "/portfolios/assets/search",
  },
  HEALTH: "/health",
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "bg_access_token",
  REFRESH_TOKEN: "bg_refresh_token",
  USER: "bg_user",
};

export const PORTFOLIO_TYPES = [
  { value: "personal", label: "Personal" },
  { value: "retirement", label: "Retirement" },
  { value: "business", label: "Business" },
  { value: "trust", label: "Trust" },
  { value: "managed", label: "Managed" },
];

export const RISK_LEVELS = [
  { value: "very_low", label: "Very Low" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "very_high", label: "Very High" },
];

export const ASSET_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "bond", label: "Bond" },
  { value: "cryptocurrency", label: "Cryptocurrency" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "commodity", label: "Commodity" },
  { value: "forex", label: "Forex" },
  { value: "derivative", label: "Derivative" },
  { value: "real_estate", label: "Real Estate" },
  { value: "alternative", label: "Alternative" },
];

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];

export const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "PK", label: "Pakistan" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "OTHER", label: "Other" },
];

export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  SERVER_ERROR: "Something went wrong. Please try again later.",
};
