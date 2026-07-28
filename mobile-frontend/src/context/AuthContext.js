import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authAPI,
  hasAccessToken,
  hydrateTokens,
  setSessionExpiredHandler,
} from "../lib/api";
import { STORAGE_KEYS } from "../lib/constants";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = useCallback(async (u) => {
    setUserState(u);
    try {
      if (u) await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
      else await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => persistUser(null));
  }, [persistUser]);

  useEffect(() => {
    (async () => {
      await hydrateTokens();
      if (!hasAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await authAPI.getProfile();
        await persistUser(profile);
      } catch {
        await persistUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password, mfaToken) => {
      const data = await authAPI.login(email, password, mfaToken);
      if (data.mfa_required) {
        return { mfaRequired: true };
      }
      const profile = await authAPI.getProfile();
      await persistUser(profile);
      return { mfaRequired: false, user: profile };
    },
    [persistUser],
  );

  const register = useCallback(
    async (payload) => {
      const data = await authAPI.register(payload);
      await persistUser(data.user);
      return data.user;
    },
    [persistUser],
  );

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      await persistUser(null);
    }
  }, [persistUser]);

  const refreshProfile = useCallback(async () => {
    const profile = await authAPI.getProfile();
    await persistUser(profile);
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
