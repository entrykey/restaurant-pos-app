import React, { useState } from "react";
import { Utensils, Eye, EyeOff } from "lucide-react";
import ThemeLoader from "../components/ui/ThemeLoader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { shopService } from "../services/api";
import {
  getDefaultModules,
  getAllModules,
} from "../config/businessTypes";
import RegisterShop from "./RegisterShop";

const getNowLog = (role, identifier) => {
  const now = new Date();
  return {
    id: Date.now(),
    role,
    phone: identifier, // Reusing phone field for identifier
    date: now.toISOString().split("T")[0],
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

export default function Login({
  shopName,
  onSetBusinessType,
  onSetBusinessSubtype,
  onSetEnabledModules
}) {
  const auth = useAuth();
  const { theme } = useTheme();

  const [authStep, setAuthStep] = useState("login"); // 'login' | 'register'
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please enter both identifier and password");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const data = await shopService.login({ identifier, password });

      // 1. Store token
      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      const user = data.user;

      // 2. Normalize permissions:
      //    Prefer backend-computed user.permissions (moduleKey -> [permissionKey, ...]).
      //    If missing/empty, derive from roles (supports both old and new role shapes).
      let finalPermissions =
        user.permissions && typeof user.permissions === "object"
          ? user.permissions
          : {};

      if (!finalPermissions || Object.keys(finalPermissions).length === 0) {
        if (user.roles && Array.isArray(user.roles)) {
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

              if (!finalPermissions[moduleKey]) {
                finalPermissions[moduleKey] = [];
              }

              // permissions can be array of keys/ids or array of populated permission objects
              const permKeys = (entry.permissions || []).map((perm) =>
                typeof perm === "string"
                  ? perm
                  : perm.key || perm.name
              );

              finalPermissions[moduleKey] = [
                ...new Set([
                  ...finalPermissions[moduleKey],
                  ...permKeys.filter(Boolean),
                ]),
              ];
            });
          });
        }
      }

      user.permissions = finalPermissions || {};

      if (user.permissions && typeof user.permissions === "object") {
        localStorage.setItem("permissions", JSON.stringify(user.permissions));
      }

      // 2. Fetch Shop Details to configure context
      if (user.shop_id) {
        try {
          const shop = await shopService.getShopById(user.shop_id);

          if (shop) {
            if (onSetBusinessType) onSetBusinessType(shop.businessType);
            if (onSetBusinessSubtype) onSetBusinessSubtype(shop.subType);

            // Calculate enabled modules
            const defaults = getDefaultModules(shop.businessType, shop.subType);
            const normalizedModules = getAllModules().reduce((acc, key) => {
              acc[key] = defaults[key] === true;
              return acc;
            }, {});

            if (onSetEnabledModules) onSetEnabledModules(normalizedModules);
          }
        } catch (shopError) {
          console.error("Failed to fetch shop details:", shopError);
          // Continue login even if shop details fail, but context might be incomplete
        }
      }

      // 3. Complete Login
      // Determine primary role name for logging
      const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0].name : "User";

      auth.addAuthLog(getNowLog(primaryRole, identifier));
      auth.login(user);

    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (authStep === 'register') {
    return (
      <div className={`fixed inset-0 flex items-center justify-center p-4 overflow-y-auto ${theme.background}`}>
        <RegisterShop
          onBack={() => setAuthStep('login')}
          onRegisterSuccess={() => {
            setAuthStep('login');
            alert('Shop Registered Successfully! Please login.');
          }}
        />
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${theme.background}`}>
      <div className={`w-full max-w-md rounded-3xl shadow-2xl p-8 mx-auto transition-all duration-300 ${theme.cardBg}`}>
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${theme.primaryIconBg}`}>
            <Utensils size={40} className={theme.primaryIconText} />
          </div>
        </div>
        <h1 className={`text-2xl font-bold text-center mb-6 ${theme.textHeading}`}>{shopName}</h1>

        <div className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">

            {error && (
              <div className={`p-3 text-sm font-medium rounded-xl text-center ${theme.errorBg} ${theme.errorText}`}>
                {error}
              </div>
            )}

            <div>
              <label className={`text-xs font-bold uppercase tracking-widest block mb-2 ${theme.textSecondary}`}>
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full p-4 border rounded-xl outline-none font-medium ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                placeholder="Enter Email or Phone"
                required
                autoFocus
              />
            </div>

            <div>
              <label className={`text-xs font-bold uppercase tracking-widest block mb-2 ${theme.textSecondary}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-4 border rounded-xl outline-none font-medium ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                  placeholder="Enter Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.textSecondary} hover:opacity-80`}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg}`}
            >
              {loading ? <ThemeLoader size="sm" /> : "Login"}
            </button>
          </form>

          <div className="text-center">
            <span className={`text-sm font-medium ${theme.textSecondary}`}>New here? </span>
            <button
              onClick={() => setAuthStep('register')}
              className={`font-bold hover:underline ${theme.linkText} ${theme.linkHover}`}
            >
              Register Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
