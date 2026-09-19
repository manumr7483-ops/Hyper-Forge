import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "hf_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authed | anon

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setStatus("anon");
      return null;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      setStatus("authed");
      return data;
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setStatus("anon");
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.profile);
      setStatus("authed");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e, "Login failed") };
    }
  }, []);

  const signup = useCallback(async (email, password, full_name) => {
    try {
      const { data } = await api.post("/auth/signup", { email, password, full_name });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.profile);
      setStatus("authed");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e, "Signup failed") };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("anon");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
