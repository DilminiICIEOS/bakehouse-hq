/**
 * Updated Authentication Library
 * 
 * Replace src/lib/auth.tsx with this implementation
 * that connects to the Django backend
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import type { User, Role } from "./mock-data";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const STORAGE_KEY = import.meta.env.VITE_JWT_STORAGE_KEY || "bakery_auth_v2";

interface AuthTokens {
  access: string;
  refresh: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth from stored token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as {
            access: string;
            refresh: string;
            user: User;
            exp: number;
          };

          // Check if token is still valid
          if (parsed.exp > Date.now()) {
            setUser(parsed.user);
            setToken(parsed.access);
            // Set default auth header
            axios.defaults.headers.common["Authorization"] = `Bearer ${parsed.access}`;
          } else {
            // Try to refresh token
            try {
              const newToken = await refreshTokenFn(parsed.refresh);
              if (newToken) {
                setToken(newToken);
              } else {
                localStorage.removeItem(STORAGE_KEY);
              }
            } catch (e) {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }
      } catch (e) {
        console.error("Failed to initialize auth:", e);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const refreshTokenFn = async (refreshToken: string): Promise<string | null> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.data?.access || response.data.access;
      return newAccessToken;
    } catch (e) {
      console.error("Token refresh failed:", e);
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
        email,
        password,
      });

      const { access, refresh, user: userData } = response.data.data;

      // Convert API response to frontend User type
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role as Role,
        status: userData.status,
        avatar: userData.avatar,
        lastLogin: userData.last_login_display || "just now",
      };

      // Store tokens and user
      const exp = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          access,
          refresh,
          user,
          exp,
        })
      );

      // Set default auth header
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      setUser(user);
      setToken(access);
      return user;
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Login failed";
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Notify backend of logout
      if (token) {
        await axios.post(`${API_BASE_URL}/auth/logout/`, undefined, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.warn("Logout API call failed:", e);
    } finally {
      // Clear local state regardless
      localStorage.removeItem(STORAGE_KEY);
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  const refreshToken = async (): Promise<string> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error("No stored credentials");

    const { refresh } = JSON.parse(stored);
    const newToken = await refreshTokenFn(refresh);
    if (!newToken) throw new Error("Token refresh failed");

    setToken(newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    return newToken;
  };

  // Setup axios interceptor to handle token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (e) {
            // Refresh failed, logout user
            await logout();
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  return (
    <AuthCtx.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  salesperson: "Salesperson",
};
