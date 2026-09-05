import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Sun, Moon, ArrowLeft, Mail, Lock, UserCheck } from "lucide-react";
import ThemeLoader from "../components/ui/ThemeLoader";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import MiniaturePOSSimulator from "../components/MiniaturePOSSimulator";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { shopService } from "../services/api";
import {
  getDefaultModules,
  getAllModules,
} from "../config/businessTypes";

const getNowLog = (role, identifier) => {
  const now = new Date();
  return {
    id: Date.now(),
    role,
    phone: identifier,
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
  const { themeName, setTheme } = useTheme();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isDark = themeName === 'dark' || themeName === 'ocean';
  const logoSrc = isDark ? '/assets/FILEPE_WHITE.svg' : '/assets/FILEPE_BLUE.svg';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Check if user is already logged in
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      setShowLogoutConfirm(true);
    }
  }, [auth.isAuthenticated, auth.user]);

  const validateEmail = (email) => {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    return phoneRegex.test(cleanPhone);
  };

  const validateForm = () => {
    const errors = {};

    if (!identifier.trim()) {
      errors.identifier = "Please enter your email or phone number";
    } else {
      const isEmail = identifier.includes('@');
      if (isEmail && !validateEmail(identifier)) {
        errors.identifier = "Please enter a valid email address";
      } else if (!isEmail && !validatePhone(identifier)) {
        errors.identifier = "Please enter a valid phone number";
      }
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await shopService.login({ identifier, password });

      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      const user = data.user;

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

              const moduleKey =
                typeof entry.module === "string"
                  ? entry.module
                  : entry.module.key || entry.module.name;
              if (!moduleKey) return;

              if (!finalPermissions[moduleKey]) {
                finalPermissions[moduleKey] = [];
              }

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

      if (user.shop_id) {
        try {
          const shop = await shopService.getShopById(user.shop_id);

          if (shop) {
            if (onSetBusinessType) onSetBusinessType(shop.businessType);
            if (onSetBusinessSubtype) onSetBusinessSubtype(shop.subType);

            const defaults = getDefaultModules(shop.businessType, shop.subType);
            const normalizedModules = getAllModules().reduce((acc, key) => {
              acc[key] = defaults[key] === true;
              return acc;
            }, {});

            if (onSetEnabledModules) onSetEnabledModules(normalizedModules);
          }
        } catch (shopError) {
          console.error("Failed to fetch shop details:", shopError);
        }
      }

      const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0].name : "User";

      auth.addAuthLog(getNowLog(primaryRole, identifier));
      auth.login(user);

    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative overflow-x-hidden font-sans transition-colors duration-300 flex items-center justify-center py-4 sm:py-6 px-4 ${
      isDark ? 'bg-[#090A0F] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Main Login Split View */}
      <div className="w-full max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left Side: Miniature POS Simulator (Desktop) */}
          <div className="hidden lg:block lg:col-span-7">
            <MiniaturePOSSimulator isDark={isDark} onNavigateLogin={() => {}} />
          </div>

          {/* Right Side: Login Form Card */}
          <div className="col-span-1 lg:col-span-5 w-full max-w-md mx-auto">
            <div className={`p-6 sm:p-8 rounded-3xl shadow-2xl transition-all relative ${
              isDark 
                ? 'bg-slate-900/95 shadow-indigo-950/40' 
                : 'bg-white shadow-2xl'
            }`}>
              {/* Header Bar inside card */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
                  <img src={logoSrc} alt="FILEPE Logo" className="h-8 object-contain" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    Entrykey
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    className={`p-2 rounded-xl transition-all border ${
                      isDark 
                        ? 'bg-slate-800/60 border-slate-700 text-amber-300 hover:bg-slate-800' 
                        : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
                    }`}
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                      isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Home</span>
                  </button>
                </div>
              </div>

              {/* Card Header */}
              <div className="space-y-1 mb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[11px] font-extrabold">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Secure Account Portal</span>
                </div>
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Welcome to FILEPE
                </h2>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Sign in to access your billing terminal & shop management.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-2xl text-xs font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 text-center">
                    {error}
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Email or Phone *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        let value = e.target.value;
                        const hasAtSymbol = value.includes('@');
                        if (hasAtSymbol) {
                          value = value.toLowerCase();
                          setIdentifier(value);
                          setValidationErrors(prev => ({ ...prev, identifier: '' }));
                          if (!validateEmail(value)) {
                            setValidationErrors(prev => ({ ...prev, identifier: 'Invalid email format' }));
                          }
                        } else {
                          const startsLikePhone = /^[\+0-9]/.test(value);
                          if (startsLikePhone) {
                            value = value.replace(/[^0-9\s\-\(\)\+]/g, '');
                            setIdentifier(value);
                            const cleanPhone = value.replace(/\D/g, '');
                            if (cleanPhone.length > 0 && (cleanPhone.length < 10 || cleanPhone.length > 15)) {
                              setValidationErrors(prev => ({ ...prev, identifier: 'Phone must be 10-15 digits' }));
                            } else {
                              setValidationErrors(prev => ({ ...prev, identifier: '' }));
                            }
                          } else {
                            setIdentifier(value);
                            setValidationErrors(prev => ({ ...prev, identifier: '' }));
                          }
                        }
                      }}
                      placeholder="Fill your email address or phone"
                      className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${
                        isDark 
                          ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                          : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                      } ${validationErrors.identifier ? 'border-rose-500' : ''}`}
                      autoFocus
                    />
                  </div>
                  {validationErrors.identifier && (
                    <p className="text-rose-500 text-xs font-bold mt-1.5">{validationErrors.identifier}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs font-extrabold text-indigo-500 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        const cleanVal = rawVal.replace(/[^a-zA-Z0-9@#$!%&*_\-\.]/g, '');
                        const hadInvalidChar = cleanVal !== rawVal;
                        setPassword(cleanVal);
                        if (hadInvalidChar) {
                          setValidationErrors(prev => ({ ...prev, password: 'Password contains invalid characters' }));
                        } else if (cleanVal && cleanVal.length < 6) {
                          setValidationErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
                        } else {
                          setValidationErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                      placeholder="Fill your password"
                      className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none pr-12 transition-all ${
                        isDark 
                          ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                          : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                      } ${validationErrors.password ? 'border-rose-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-rose-500 text-xs font-bold mt-1.5">{validationErrors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <ThemeLoader size="sm" /> : (
                    <>
                      <span>Login to Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Register Link */}
              <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-semibold">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Don&apos;t have a FILEPE account? </span>
                <button
                  onClick={() => navigate('/register')}
                  className="text-indigo-500 font-extrabold hover:underline ml-1"
                >
                  Register Your Shop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => {
          setShowLogoutConfirm(false);
          navigate('/dashboard');
        }}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          auth.logout();
        }}
        title="Already Logged In"
        message={`You are already logged in as ${auth.user?.email || auth.user?.phone || 'current user'}. Do you want to logout and sign in with a different account?`}
        confirmText="Logout & Switch Account"
        cancelText="Go to Dashboard"
        type="warning"
      />
    </div>
  );
}
