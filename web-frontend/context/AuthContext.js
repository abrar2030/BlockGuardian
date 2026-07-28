import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/router";
import { authAPI } from "../services/api";
import { ROUTES, STORAGE_KEYS } from "../utils/constants";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const persistUser = useCallback((u) => {
    setUser(u);
    if (typeof window !== "undefined") {
      try {
        if (u) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
        else localStorage.removeItem(STORAGE_KEYS.USER);
      } catch {
        /* ignore storage errors */
      }
    }
  }, []);

  const hydrate = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const profile = await authAPI.getProfile();
      persistUser(profile);
    } catch {
      persistUser(null);
      try {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      } catch {
        /* ignore */
      }
    } finally {
      setIsLoading(false);
    }
  }, [persistUser]);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password, mfaToken) => {
      const data = await authAPI.login(email, password, mfaToken);
      if (data.mfa_required) {
        return { mfaRequired: true };
      }
      // Login response masks the email address, so refetch the full profile.
      const profile = await authAPI.getProfile();
      persistUser(profile);
      return { mfaRequired: false, user: profile };
    },
    [persistUser],
  );

  const register = useCallback(
    async (payload) => {
      const data = await authAPI.register(payload);
      persistUser(data.user);
      return data.user;
    },
    [persistUser],
  );

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      persistUser(null);
      router.push(ROUTES.HOME);
    }
  }, [persistUser, router]);

  const refreshProfile = useCallback(async () => {
    const profile = await authAPI.getProfile();
    persistUser(profile);
    return profile;
  }, [persistUser]);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
    refreshProfile,
    setUser: persistUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
