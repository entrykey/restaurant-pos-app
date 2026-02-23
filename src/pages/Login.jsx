import React, { useState } from "react";
import { Utensils, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
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

      // 1. Store token and permissions (same shape as API: { moduleId: [permissionId, ...] })
      // 1. Process and Store Token
      localStorage.setItem("accessToken", data.accessToken);
      const user = data.user;

      // Extract permissions from roles if user.permissions is empty/missing
      let finalPermissions = {};
      if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach(role => {
          if (role.permissions && Array.isArray(role.permissions)) {
            role.permissions.forEach(p => {
              // p is { module: "moduleId", permissions: ["permId", ...] }
              if (!finalPermissions[p.module]) {
                finalPermissions[p.module] = [];
              }
              // Merge and deduplicate
              finalPermissions[p.module] = [...new Set([...finalPermissions[p.module], ...p.permissions])];
            });
          }
        });
      }

      // If user has direct permissions (override), merge them or use them? 
      // Usually roles are additive. Let's start with roles as the base.
      // If the backend returns empty user.permissions, we populate it now.
      user.permissions = finalPermissions;

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
      <div className="fixed inset-0 flex items-center justify-center bg-indigo-900 p-4 overflow-y-auto">
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
    <div className="fixed inset-0 flex items-center justify-center bg-indigo-900 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 mx-auto transition-all duration-300">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full">
            <Utensils size={40} className="text-indigo-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">{shopName}</h1>

        <div className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl text-center">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full p-4 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                placeholder="Enter Email or Phone"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  placeholder="Enter Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Login"}
            </button>
          </form>

          <div className="text-center">
            <span className="text-gray-400 text-sm font-medium">New here? </span>
            <button
              onClick={() => setAuthStep('register')}
              className="text-indigo-600 font-bold hover:underline"
            >
              Register Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
