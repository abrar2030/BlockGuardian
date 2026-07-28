/**
 * API Service Layer
 * Handles all HTTP requests to the BlockGuardian Flask backend.
 * Every endpoint here was verified against a live instance of
 * code/backend/src/main.py — see README for the exact contract.
 */

import axios from "axios";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  STORAGE_KEYS,
} from "../utils/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- Token helpers -------------------------------------------------------

const getToken = (key) => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setTokens = (tokens) => {
  if (typeof window === "undefined" || !tokens) return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  } catch {
    /* storage unavailable (private mode, SSR, etc.) */
  }
};

const clearSession = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch {
    /* no-op */
  }
};

// ---- Interceptors ---------------------------------------------------------

apiClient.interceptors.request.use((config) => {
  const token = getToken(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;
      const refreshToken = getToken(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
                refresh_token: refreshToken,
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const refreshResponse = await refreshPromise;
          const tokens = refreshResponse.data.tokens;
          setTokens(tokens);
          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          clearSession();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        }
      } else {
        clearSession();
      }
    }

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (error.request && !error.response
        ? ERROR_MESSAGES.NETWORK_ERROR
        : ERROR_MESSAGES.SERVER_ERROR);

    const apiError = new Error(errorMessage);
    apiError.status = error.response?.status;
    apiError.data = error.response?.data;
    apiError.field = error.response?.data?.field;
    return Promise.reject(apiError);
  },
);

// ---- Auth ------------------------------------------------------------------

export const authAPI = {
  register: async (payload) => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, payload);
    if (data.tokens) setTokens(data.tokens);
    return data;
  },

  login: async (email, password, mfaToken) => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
      ...(mfaToken ? { mfa_token: mfaToken } : {}),
    });
    if (data.tokens) setTokens(data.tokens);
    return data;
  },

  logout: async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      clearSession();
    }
  },

  getProfile: async () => {
    const { data } = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return data.user;
  },

  updateProfile: async (payload) => {
    const { data } = await apiClient.put(API_ENDPOINTS.AUTH.PROFILE, payload);
    return data.user;
  },

  changePassword: async (currentPassword, newPassword) => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return data;
  },

  setupMfa: async () => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.SETUP_MFA);
    return data;
  },

  enableMfa: async (token) => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.ENABLE_MFA, {
      token,
    });
    return data;
  },

  disableMfa: async (password) => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH.DISABLE_MFA, {
      password,
    });
    return data;
  },
};

// ---- Portfolios --------------------------------------------------------

export const portfolioAPI = {
  list: async (params = {}) => {
    const { data } = await apiClient.get(API_ENDPOINTS.PORTFOLIO.LIST, {
      params,
    });
    return data;
  },

  get: async (id) => {
    const { data } = await apiClient.get(API_ENDPOINTS.PORTFOLIO.DETAIL(id));
    return data.portfolio;
  },

  create: async (payload) => {
    const { data } = await apiClient.post(
      API_ENDPOINTS.PORTFOLIO.CREATE,
      payload,
    );
    return data.portfolio;
  },

  update: async (id, payload) => {
    const { data } = await apiClient.put(
      API_ENDPOINTS.PORTFOLIO.UPDATE(id),
      payload,
    );
    return data.portfolio;
  },

  remove: async (id) => {
    const { data } = await apiClient.delete(API_ENDPOINTS.PORTFOLIO.DELETE(id));
    return data;
  },

  holdings: async (id) => {
    const { data } = await apiClient.get(API_ENDPOINTS.PORTFOLIO.HOLDINGS(id));
    return data.holdings;
  },

  transactions: async (id, params = {}) => {
    const { data } = await apiClient.get(
      API_ENDPOINTS.PORTFOLIO.TRANSACTIONS(id),
      { params },
    );
    return data;
  },

  cancelTransaction: async (id, txId) => {
    const { data } = await apiClient.post(
      API_ENDPOINTS.PORTFOLIO.CANCEL_TRANSACTION(id, txId),
    );
    return data;
  },

  buy: async (id, { assetSymbol, quantity, price }) => {
    const { data } = await apiClient.post(API_ENDPOINTS.PORTFOLIO.BUY(id), {
      asset_symbol: assetSymbol,
      quantity,
      price,
    });
    return data;
  },

  sell: async (id, { assetSymbol, quantity, price }) => {
    const { data } = await apiClient.post(API_ENDPOINTS.PORTFOLIO.SELL(id), {
      asset_symbol: assetSymbol,
      quantity,
      price,
    });
    return data;
  },

  performance: async (id, days) => {
    const { data } = await apiClient.get(
      API_ENDPOINTS.PORTFOLIO.PERFORMANCE(id),
      { params: days ? { days } : {} },
    );
    return data.performance;
  },

  allocation: async (id) => {
    const { data } = await apiClient.get(
      API_ENDPOINTS.PORTFOLIO.ALLOCATION(id),
    );
    return data.allocation;
  },

  risk: async (id) => {
    const { data } = await apiClient.get(API_ENDPOINTS.PORTFOLIO.RISK(id));
    return data.risk_metrics;
  },
};

// ---- Assets / Markets ---------------------------------------------------

export const assetAPI = {
  list: async (params = {}) => {
    const { data } = await apiClient.get(API_ENDPOINTS.ASSETS.LIST, {
      params,
    });
    return data.assets;
  },

  search: async (query, params = {}) => {
    const { data } = await apiClient.get(API_ENDPOINTS.ASSETS.SEARCH, {
      params: { q: query, ...params },
    });
    return data.assets;
  },
};

// ---- Health --------------------------------------------------------------

export const healthAPI = {
  check: async () => {
    const { data } = await apiClient.get(API_ENDPOINTS.HEALTH);
    return data;
  },
};

export default apiClient;
