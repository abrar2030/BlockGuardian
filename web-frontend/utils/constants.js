// Application constants and configuration
// Matched 1:1 against the real Flask backend in code/backend/src/routes

// API Configuration
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH || "/api";

// API Endpoints - every path below exists as a real Flask route
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${API_BASE_PATH}/auth/register`,
    LOGIN: `${API_BASE_PATH}/auth/login`,
    LOGOUT: `${API_BASE_PATH}/auth/logout`,
    REFRESH: `${API_BASE_PATH}/auth/refresh`,
    SETUP_MFA: `${API_BASE_PATH}/auth/setup-mfa`,
    ENABLE_MFA: `${API_BASE_PATH}/auth/enable-mfa`,
    DISABLE_MFA: `${API_BASE_PATH}/auth/disable-mfa`,
    CHANGE_PASSWORD: `${API_BASE_PATH}/auth/change-password`,
    PROFILE: `${API_BASE_PATH}/auth/profile`,
    VERIFY_TOKEN: `${API_BASE_PATH}/auth/verify-token`,
  },
  PORTFOLIO: {
    LIST: `${API_BASE_PATH}/portfolios/`,
    CREATE: `${API_BASE_PATH}/portfolios/`,
    DETAIL: (id) => `${API_BASE_PATH}/portfolios/${id}`,
    UPDATE: (id) => `${API_BASE_PATH}/portfolios/${id}`,
    DELETE: (id) => `${API_BASE_PATH}/portfolios/${id}`,
    HOLDINGS: (id) => `${API_BASE_PATH}/portfolios/${id}/holdings`,
    TRANSACTIONS: (id) => `${API_BASE_PATH}/portfolios/${id}/transactions`,
    CANCEL_TRANSACTION: (id, txId) =>
      `${API_BASE_PATH}/portfolios/${id}/transactions/${txId}/cancel`,
    BUY: (id) => `${API_BASE_PATH}/portfolios/${id}/buy`,
    SELL: (id) => `${API_BASE_PATH}/portfolios/${id}/sell`,
    PERFORMANCE: (id) => `${API_BASE_PATH}/portfolios/${id}/performance`,
    ALLOCATION: (id) => `${API_BASE_PATH}/portfolios/${id}/allocation`,
    RISK: (id) => `${API_BASE_PATH}/portfolios/${id}/risk`,
  },
  ASSETS: {
    LIST: `${API_BASE_PATH}/portfolios/assets`,
    SEARCH: `${API_BASE_PATH}/portfolios/assets/search`,
  },
  BLOCKCHAIN: {
    STATUS: `${API_BASE_PATH}/blockchain/status`,
    CONTRACTS: `${API_BASE_PATH}/blockchain/contracts`,
    EXPLORER: `${API_BASE_PATH}/blockchain/explorer`,
  },
  HEALTH: "/health",
  INFO: `${API_BASE_PATH}/info`,
};

// Application Routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  PORTFOLIOS: "/portfolios",
  PORTFOLIO_DETAIL: (id) => `/portfolios/${id}`,
  MARKETS: "/markets",
  BLOCKCHAIN: "/blockchain",
  ACCOUNT: "/account",
  ABOUT: "/about",
  CONTACT: "/contact",
  PRIVACY: "/privacy",
  TERMS: "/terms",
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "bg_access_token",
  REFRESH_TOKEN: "bg_refresh_token",
  USER: "bg_user",
  DARK_MODE: "bg_dark_mode",
};

// Domain enums - kept in sync with code/backend/src/models/portfolio.py and user.py
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

export const TRANSACTION_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "dividend", label: "Dividend" },
  { value: "interest", label: "Interest" },
  { value: "fee", label: "Fee" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "transfer_out", label: "Transfer Out" },
  { value: "split", label: "Split" },
  { value: "merger", label: "Merger" },
];

// Currency / number formatting
export const DEFAULT_CURRENCY = "USD";

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  AUTH_REQUIRED: "Please sign in to continue.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  SERVER_ERROR: "Something went wrong. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
};
