import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User, UserRole } from "@/types";
import api, { setToken, clearToken, getToken } from "@/lib/api";

const STORAGE_KEY = "expenseTrackerUser";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  monthly_allowance?: number;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  fields?: Record<string, string>;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  checkEmailAvailable: (email: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadUser(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as User;
  } catch {
    /* corrupted storage – treat as logged-out */
  }
  return null;
}

function persistUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep localStorage in sync when user changes
  useEffect(() => {
    persistUser(user);
  }, [user]);

  // Verify and sync user session on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setUser(res.data.data);
          }
        })
        .catch(() => {
          // Token might be invalid or expired
          clearToken();
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.data.success) {
        const { token, user: authedUser } = res.data.data;
        setToken(token);
        setUser(authedUser);
        return { success: true, user: authedUser };
      }
      return { success: false, error: res.data.message || "Invalid login credentials" };
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Login failed. Please check your network and credentials.";
      const fields = err?.response?.data?.error?.fields;
      return { success: false, error: errorMsg, fields };
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<AuthResult> => {
    try {
      const res = await api.post("/auth/register", {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        role: payload.role,
        ...(payload.monthly_allowance !== undefined
          ? { monthly_allowance: payload.monthly_allowance }
          : {}),
      });

      if (res.data.success) {
        const { token, user: authedUser } = res.data.data;
        setToken(token);
        setUser(authedUser);
        return { success: true, user: authedUser };
      }
      return { success: false, error: res.data.message || "Registration failed" };
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Registration failed. Please check your entries.";
      const fields = err?.response?.data?.error?.fields;
      return { success: false, error: errorMsg, fields };
    }
  }, []);

  const checkEmailAvailable = useCallback(async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@")) return false;
    try {
      const res = await api.get(`/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      return Boolean(res.data?.data?.available);
    } catch {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await api.get("/auth/me");
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
        return res.data.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearToken();
    persistUser(null);
    api.post("/auth/logout").catch(() => {});
  }, []);

  const value: AuthContextType = {
    user,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    checkEmailAvailable,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
