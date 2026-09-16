import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sun, 
  Moon, 
  ArrowLeft, 
  Lock, 
  Mail, 
  Sparkles,
  Zap,
  CheckCircle2
} from "lucide-react";
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
import { validateEmail, sanitizeIdentifierInput } from '../utils/validation';

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

  const validateForm = () => {
    const errors = {};

    if (!identifier.trim()) {
      errors.identifier = "Please enter your email address or phone number";
    } else {
      const trimmed = identifier.trim();
      const hasAlphaOrAt = /[a-zA-Z@]/.test(trimmed);
      const hasDigits = /[0-9]/.test(trimmed);

      if (!hasAlphaOrAt && !hasDigits) {
        errors.identifier = "Please enter a valid email address or phone number";
      } else if (hasAlphaOrAt) {
        if (!validateEmail(trimmed)) {
          errors.identifier = "Please enter a valid email address (e.g. name@domain.com)";
        }
      } else {
        const cleanDigits = trimmed.replace(/[^0-9]/g, '');
        if (cleanDigits.length < 10 || cleanDigits.length > 15) {
          errors.identifier = "Please enter a valid 10-15 digit phone number";
        }
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
    <div className={`min-h-screen lg:h-screen lg:max-h-screen relative overflow-y-auto lg:overflow-hidden font-sans transition-colors duration-300 flex flex-col justify-between py-3 lg:py-5 px-4 sm:px-6 lg:px-10 ${
      isDark ? 'bg-[#090A0F] text-slate-100 selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-900 selection:bg-indigo-500/20'
    }`}>
      {/* Ambient Background Glow Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto flex items-center justify-center relative z-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full">
          
          {/* Left Column: POS Simulator Showcase */}
          <div className="hidden lg:block lg:col-span-7 space-y-3.5">
            <div className="flex items-center justify-between px-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-extrabold tracking-wide">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                <span>Live Interactive POS Terminal Demo</span>
              </div>
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                100% Real-Time Cloud Sync
              </span>
            </div>

            <MiniaturePOSSimulator isDark={isDark} onNavigateLogin={() => {}} />

            {/* Metrics Ribbon */}
            <div className={`p-3 rounded-2xl border grid grid-cols-3 gap-4 text-center ${
              isDark ? 'bg-slate-900/60 border-slate-800/80 backdrop-blur-md' : 'bg-white/80 border-slate-200/80 backdrop-blur-md shadow-sm'
            }`}>
              <div>
                <p className="text-lg font-black text-indigo-500">0.4s</p>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avg Bill Print</p>
              </div>
              <div>
                <p className="text-lg font-black text-emerald-400">100%</p>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>GST Compliant</p>
              </div>
              <div>
                <p className="text-lg font-black text-purple-400">24 / 7</p>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cloud Sync</p>
              </div>
            </div>
          </div>

          {/* Right Column: Modern Login Card */}
          <div className="col-span-1 lg:col-span-5 w-full max-w-md mx-auto">
            <div className={`p-6 sm:p-7 rounded-3xl transition-all relative border ${
              isDark 
                ? 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200/90 shadow-2xl shadow-slate-200/60 backdrop-blur-xl'
            }`}>

              {/* Card Top Control Bar (Actions Top Right + Bigger Centered Logo) */}
              <div className="relative pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800/80">
                {/* Actions floating top right */}
                <div className="absolute right-0 top-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    className={`p-2 rounded-xl transition-all border ${
                      isDark 
                        ? 'bg-slate-800/60 border-slate-700 text-amber-300 hover:bg-slate-800 hover:scale-105' 
                        : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200 hover:scale-105'
                    }`}
                  >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                      isDark 
                        ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white' 
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowLeft size={13} />
                    <span>Home</span>
                  </button>
                </div>

                {/* Centered Bigger Logo */}
                <div 
                  className="flex justify-center cursor-pointer transition-transform hover:scale-105 pt-1 pb-1"
                  onClick={() => navigate('/')}
                >
                  <img src={logoSrc} alt="FILEPE Logo" className="h-10 sm:h-12 object-contain" />
                </div>
              </div>

              {/* Title & Subtitle (Centered) */}
              <div className="space-y-1 mb-4 text-center">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Welcome to <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">FILEPE</span>
                </h2>
                
                <p className={`text-xs font-normal leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Sign in to access your POS billing terminal & shop management.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                {error && (
                  <div className="p-2.5 rounded-2xl text-xs font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 text-center flex items-center justify-center gap-2">
                    <Zap size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email / Phone Field */}
                <div>
                  <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email address or Phone *
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Mail size={16} />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        const sanitized = sanitizeIdentifierInput(e.target.value);
                        setIdentifier(sanitized);
                        setValidationErrors(prev => ({ ...prev, identifier: '' }));
                      }}
                      placeholder="e.g. name@domain.com or phone"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 focus:bg-slate-800 text-white placeholder-slate-500' 
                          : 'bg-slate-50/80 border-slate-300 focus:border-indigo-600 focus:bg-white text-slate-900 placeholder-slate-400'
                      } ${validationErrors.identifier ? 'border-rose-500 focus:border-rose-500' : ''}`}
                      autoFocus
                    />
                  </div>
                  {validationErrors.identifier && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">{validationErrors.identifier}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-[11px] font-extrabold text-indigo-500 hover:text-indigo-600 hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        const cleanVal = rawVal.replace(/[^a-zA-Z0-9@#$!%&*_\-.]/g, '');
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
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-11 py-2.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 focus:bg-slate-800 text-white placeholder-slate-500' 
                          : 'bg-slate-50/80 border-slate-300 focus:border-indigo-600 focus:bg-white text-slate-900 placeholder-slate-400'
                      } ${validationErrors.password ? 'border-rose-500 focus:border-rose-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">{validationErrors.password}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
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
              <div className="pt-3.5 mt-3.5 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-semibold">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Don&apos;t have a FILEPE account? </span>
                <button
                  onClick={() => navigate('/register')}
                  className="text-indigo-500 font-extrabold hover:underline ml-1 inline-flex items-center gap-1"
                >
                  <span>Register Your Shop</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer Note */}
      <footer className={`py-1.5 text-center text-[10px] font-medium border-t z-10 shrink-0 ${
        isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200/80 text-slate-400'
      }`}>
        <p>© {new Date().getFullYear()} FILEPE — Entrykey Business Solution LLP. All rights reserved.</p>
      </footer>

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
