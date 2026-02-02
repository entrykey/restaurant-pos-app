import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "restaurant_pos_auth_v1";

const AuthContext = createContext(null);

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState({ loginTime: null, logoutTime: null });
  const [authLogs, setAuthLogs] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = safeJsonParse(raw);
    if (!saved) return;

    if (saved.user) setUser(saved.user);
    if (saved.sessionInfo) setSessionInfo(saved.sessionInfo);
    if (Array.isArray(saved.authLogs)) setAuthLogs(saved.authLogs);
  }, []);

  useEffect(() => {
    const payload = { user, sessionInfo, authLogs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [user, sessionInfo, authLogs]);

  const isAuthenticated = Boolean(user);

  const login = (nextUser) => {
    setUser(nextUser);
    setSessionInfo({ loginTime: new Date().toLocaleTimeString(), logoutTime: null });
  };

  const logout = () => {
    setSessionInfo((prev) => ({ ...prev, logoutTime: new Date().toLocaleTimeString() }));
    setUser(null);
  };

  const addAuthLog = (log) => {
    setAuthLogs((prev) => [log, ...prev]);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      sessionInfo,
      authLogs,
      login,
      logout,
      addAuthLog,
      setAuthLogs, // intentionally exposed for admin tooling (e.g., clear logs)
    }),
    [user, isAuthenticated, sessionInfo, authLogs]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

