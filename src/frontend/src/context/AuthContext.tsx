import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi, type ChangeEmailPayload, type ChangePasswordPayload, type LoginPayload, type RegisterPayload, type UserProfile } from "../api/auth";
import { ApiError, getAccessToken, setAccessToken } from "../api/client";

interface AuthContextValue {
  user: UserProfile | null;
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<string>;
  changeEmail: (payload: ChangeEmailPayload) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!getAccessToken()) return null;
    try {
      const profile = await authApi.me();
      setUser(profile);
      setRole(profile.role);
      return profile;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAccessToken(null);
      }
      setUser(null);
      setRole(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadProfile();
      setLoading(false);
    })();
  }, [loadProfile]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<UserProfile> => {
      const tokens = await authApi.login(payload);
      setAccessToken(tokens.access_token);
      setRole(tokens.role);
      const profile = await loadProfile();
      if (!profile) {
        throw new ApiError(500, "Failed to load profile after login");
      }
      return profile;
    },
    [loadProfile],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<string> => {
      const result = await authApi.register(payload);
      return result.message;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort: local session is cleared regardless.
    }
    setAccessToken(null);
    setUser(null);
    setRole(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      isAuthenticated: user !== null,
      isAdmin: role === "admin",
      login,
      register,
      logout,
      refreshProfile: async () => {
        await loadProfile();
      },
      changePassword: async (payload: ChangePasswordPayload) => {
        const result = await authApi.changePassword(payload);
        return result.message;
      },
      changeEmail: async (payload: ChangeEmailPayload) => {
        const result = await authApi.changeEmail(payload);
        await loadProfile();
        return result.message;
      },
    }),
    [user, role, loading, login, register, logout, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
