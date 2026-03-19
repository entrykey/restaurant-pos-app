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

  const [customTexts, setCustomTexts] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = safeJsonParse(raw);
    return saved?.customTexts || {};
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
      if (!Array.isArray(role.permissions)) return;
      role.permissions.forEach((entry) => {
        if (!entry || !entry.module) return;

        // module can be a key string or a populated module object
        const moduleKey =
          typeof entry.module === "string"
            ? entry.module
            : entry.module.key || entry.module.name;
        if (!moduleKey) return;

        if (!finalPermissions[moduleKey]) finalPermissions[moduleKey] = [];

        // permissions can be array of keys/ids or array of populated permission objects
        const permKeys = (entry.permissions || []).map((perm) =>
          typeof perm === "string" ? perm : perm.key || perm.name
        );

        finalPermissions[moduleKey] = [
          ...new Set([
            ...finalPermissions[moduleKey],
            ...permKeys.filter(Boolean),
          ]),
        ];
      });
    });
    setUser((prev) => (prev ? { ...prev, permissions: finalPermissions } : null));
  }, [user?.id, user?.roles?.length]);

  // Persist changes to localStorage
  useEffect(() => {
    const payload = { user, sessionInfo, authLogs, customTexts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [user, sessionInfo, authLogs, customTexts]);

  const isAuthenticated = Boolean(user);

  const login = (nextUser) => {
    setUser(nextUser);
    if (nextUser.customTexts) {
      setCustomTexts(nextUser.customTexts);
    }
    setSessionInfo({ loginTime: new Date().toLocaleTimeString(), logoutTime: null });
  };

  const logout = () => {
    setSessionInfo((prev) => ({ ...prev, logoutTime: new Date().toLocaleTimeString() }));
    setUser(null);
    setCustomTexts({});
    
    // Clear all app-specific storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("permissions");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("pos_businessType");
    localStorage.removeItem("pos_businessSubtype");
    localStorage.removeItem("pos_activeBranchId");
    localStorage.removeItem("pos_enabledModules");
    localStorage.removeItem("pos_branchId");
    localStorage.removeItem("pos_organizationId");
    localStorage.removeItem("pos_shopId");
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
      customTexts,
      login,
      logout,
      addAuthLog,
      setAuthLogs, // intentionally exposed for admin tooling (e.g., clear logs)
    }),
    [user, isAuthenticated, sessionInfo, authLogs, customTexts]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

