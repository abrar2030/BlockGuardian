/**
 * API Service Layer (mobile)
 * Mirrors web-frontend/services/api.js - verified against the live Flask backend.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  API_BASE_URL,
  API_BASE_PATH,
  API_ENDPOINTS,
  STORAGE_KEYS,
  ERROR_MESSAGES,
} from "./constants";

let accessToken = null;
let refreshToken = null;
let hydrated = false;
let refreshPromise = null;
let onSessionExpired = null;

export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

export async function hydrateTokens() {
  if (hydrated) return;
  try {
    const [[, at], [, rt]] = await AsyncStorage.multiGet([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);
    accessToken = at || null;
    refreshToken = rt || null;
  } catch {
    accessToken = null;
    refreshToken = null;
  } finally {
    hydrated = true;
  }
}

async function persistTokens(tokens) {
  accessToken = tokens?.access_token || null;
  refreshToken = tokens?.refresh_token || null;
  try {
    if (accessToken && refreshToken) {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ]);
    }
  } catch {
    /* ignore storage errors */
  }
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  } catch {
    /* ignore */
  }
}

export function hasAccessToken() {
  return Boolean(accessToken);
}

class ApiError extends Error {
  constructor(message, status, data, field) {
    super(message);
    this.status = status;
    this.data = data;
    this.field = field;
  }
}

async function doFetch(
  path,
  { method = "GET", body, params, skipAuth = false, isRetry = false } = {},
) {
  await hydrateTokens();

  let url = `${API_BASE_URL}${API_BASE_PATH}${path}`;
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    if (query) url += `?${query}`;
  }

  const headers = { "Content-Type": "application/json" };
  if (!skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (response.status === 401 && !skipAuth && !isRetry && refreshToken) {
    try {
      if (!refreshPromise) {
        refreshPromise = doFetch(API_ENDPOINTS.AUTH.REFRESH, {
          method: "POST",
          body: { refresh_token: refreshToken },
          skipAuth: true,
        }).finally(() => {
          refreshPromise = null;
        });
      }
      const refreshData = await refreshPromise;
      await persistTokens(refreshData.tokens);
      return doFetch(path, { method, body, params, skipAuth, isRetry: true });
    } catch {
      await clearSession();
      onSessionExpired?.();
      throw new ApiError(
        "Your session has expired. Please sign in again.",
        401,
      );
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || ERROR_MESSAGES.SERVER_ERROR;
    throw new ApiError(message, response.status, data, data?.field);
  }

  return data;
}

// ---- Auth ------------------------------------------------------------------

export const authAPI = {
  register: async (payload) => {
    const data = await doFetch(API_ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      body: payload,
      skipAuth: true,
    });
    if (data.tokens) await persistTokens(data.tokens);
    return data;
  },

  login: async (email, password, mfaToken) => {
    const data = await doFetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      body: { email, password, ...(mfaToken ? { mfa_token: mfaToken } : {}) },
      skipAuth: true,
    });
    if (data.tokens) await persistTokens(data.tokens);
    return data;
  },

  logout: async () => {
    try {
      await doFetch(API_ENDPOINTS.AUTH.LOGOUT, { method: "POST" });
    } finally {
      await clearSession();
    }
  },

  getProfile: async () => {
    const data = await doFetch(API_ENDPOINTS.AUTH.PROFILE);
    return data.user;
  },

  updateProfile: async (payload) => {
    const data = await doFetch(API_ENDPOINTS.AUTH.PROFILE, {
      method: "PUT",
      body: payload,
    });
    return data.user;
  },

  changePassword: async (currentPassword, newPassword) =>
    doFetch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    }),

  setupMfa: async () =>
    doFetch(API_ENDPOINTS.AUTH.SETUP_MFA, { method: "POST" }),

  enableMfa: async (token) =>
    doFetch(API_ENDPOINTS.AUTH.ENABLE_MFA, { method: "POST", body: { token } }),

  disableMfa: async (password) =>
    doFetch(API_ENDPOINTS.AUTH.DISABLE_MFA, {
      method: "POST",
      body: { password },
    }),
};

// ---- Portfolios --------------------------------------------------------

export const portfolioAPI = {
  list: async (params = {}) =>
    doFetch(API_ENDPOINTS.PORTFOLIO.LIST, { params }),

  get: async (id) => {
    const data = await doFetch(API_ENDPOINTS.PORTFOLIO.DETAIL(id));
    return data.portfolio;
  },

  create: async (payload) => {
    const data = await doFetch(API_ENDPOINTS.PORTFOLIO.CREATE, {
      method: "POST",
      body: payload,
    });
    return data.portfolio;
  },

  update: async (id, payload) => {
    const data = await doFetch(API_ENDPOINTS.PORTFOLIO.UPDATE(id), {
      method: "PUT",
      body: payload,
    });
    return data.portfolio;
  },

  remove: async (id) =>
    doFetch(API_ENDPOINTS.PORTFOLIO.DELETE(id), { method: "DELETE" }),

  holdings: async (id) => {
    const data = await doFetch(API_ENDPOINTS.PORTFOLIO.HOLDINGS(id));
    return data.holdings;
  },

  transactions: async (id, params = {}) =>
    doFetch(API_ENDPOINTS.PORTFOLIO.TRANSACTIONS(id), { params }),

  cancelTransaction: async (id, txId) =>
    doFetch(API_ENDPOINTS.PORTFOLIO.CANCEL_TRANSACTION(id, txId), {
      method: "POST",
    }),

  buy: async (id, { assetSymbol, quantity, price }) =>
    doFetch(API_ENDPOINTS.PORTFOLIO.BUY(id), {
      method: "POST",
      body: { asset_symbol: assetSymbol, quantity, price },
    }),

  sell: async (id, { assetSymbol, quantity, price }) =>
    doFetch(API_ENDPOINTS.PORTFOLIO.SELL(id), {
      method: "POST",
      body: { asset_symbol: assetSymbol, quantity, price },
    }),

  performance: async (id, days) => {
    const data = await doFetch(API_ENDPOINTS.PORTFOLIO.PERFORMANCE(id), {
      params: days ? { days } : {},
    });
    return data.performance;
  },

  allocation: async (id) => {
    const data = await doFetch(API_ENDPOINTS.PORTFOLIO.ALLOCATION(id));
    return data.allocation;
  },

  risk: async (id) => {
    const data = await doFetch(API_ENDPOINTS.PORTFOLIO.RISK(id));
    return data.risk_metrics;
  },
};

// ---- Assets / Markets ---------------------------------------------------

export const assetAPI = {
  list: async (params = {}) => {
    const data = await doFetch(API_ENDPOINTS.ASSETS.LIST, { params });
    return data.assets;
  },
  search: async (query, params = {}) => {
    const data = await doFetch(API_ENDPOINTS.ASSETS.SEARCH, {
      params: { q: query, ...params },
    });
    return data.assets;
  },
};

export const blockchainAPI = {
  status: async () => doFetch(API_ENDPOINTS.BLOCKCHAIN.STATUS),
  contracts: async () => doFetch(API_ENDPOINTS.BLOCKCHAIN.CONTRACTS),
  explorer: async () => doFetch(API_ENDPOINTS.BLOCKCHAIN.EXPLORER),
};

export { ApiError };
