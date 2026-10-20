import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try { setUser(await api.me()); } catch { setToken(""); setUser(null); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const register = async (email, password, name) => {
    const { token, user: u } = await api.register(email, password, name);
    setToken(token);
    setUser(u);
  };

  const login = async (email, password) => {
    const { token, user: u } = await api.login(email, password);
    setToken(token);
    setUser(u);
  };

  const logout = () => { setToken(""); setUser(null); };

  return <Ctx.Provider value={{ user, loading, register, login, logout, refresh }}>{children}</Ctx.Provider>;
}
