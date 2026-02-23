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
  // Lazy initialization to avoid overwriting localStorage with null on first render
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = safeJsonParse(raw);
    return saved?.user || null;
  });

  const [sessionInfo, setSessionInfo] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = safeJsonParse(raw);
    return saved?.sessionInfo || { loginTime: null, logoutTime: null };
  });

  const [authLogs, setAuthLogs] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = safeJsonParse(raw);
    return Array.isArray(saved?.authLogs) ? saved.authLogs : [];
  });

  // When user is loaded from storage (or has roles but no permissions), derive permissions from roles
  // so sidebar and route guards work even after refresh.
  useEffect(() => {
    if (!user?.roles?.length) return;
    const hasPermissions = user.permissions && typeof user.permissions === "object" && Object.keys(user.permissions).length > 0;
    if (hasPermissions) return;

    let finalPermissions = {};
    user.roles.forEach((role) => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((p) => {
          if (!p.module) return;
          if (!finalPermissions[p.module]) finalPermissions[p.module] = [];
          finalPermissions[p.module] = [...new Set([...finalPermissions[p.module], ...(p.permissions || [])])];
        });
      }
    });
    setUser((prev) => (prev ? { ...prev, permissions: finalPermissions } : null));
  }, [user?.id, user?.roles?.length]);

  // Persist changes to localStorage
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
    localStorage.removeItem("accessToken");
    localStorage.removeItem("permissions");
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

