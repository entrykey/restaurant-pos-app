import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Key, Sun, Moon, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import ThemeLoader from "../components/ui/ThemeLoader";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";

export default function ForgotPassword() {
  const { themeName, setTheme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isDark = themeName === 'dark' || themeName === 'ocean';
  const logoSrc = isDark ? '/assets/FILEPE_WHITE.svg' : '/assets/FILEPE_BLUE.svg';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email: email.toLowerCase().trim() });
      setSuccess("OTP sent successfully to your email");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp.trim()) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/verify-otp", { email: email.toLowerCase().trim(), otp });
      setSuccess("OTP verified successfully");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        email: email.toLowerCase().trim(),
        otp,
        newPassword,
      });
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center py-6 px-4 overflow-y-auto custom-scrollbar font-sans transition-colors duration-300 ${
      isDark ? 'bg-[#090A0F] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Main Container */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className={`w-full p-6 sm:p-8 rounded-3xl shadow-2xl transition-all relative ${
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
                onClick={() => navigate('/login')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                  isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ArrowLeft size={14} />
                <span>Back to Login</span>
              </button>
            </div>
          </div>
          
          {/* Card Header */}
          <div className="space-y-1 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[11px] font-extrabold">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Account Security</span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Reset Password
            </h2>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {step === 1 && "Enter your registered email address to receive an OTP code."}
              {step === 2 && `Enter the 6-digit verification code sent to ${email}`}
              {step === 3 && "Create a secure new password for your account."}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step >= 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500')
              }`}>
                <Mail size={16} />
              </div>
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${step >= 2 ? 'bg-indigo-600' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}></div>
            </div>

            <div className="flex items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                step >= 2 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500')
              }`}>
                <Key size={16} />
              </div>
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${step >= 3 ? 'bg-indigo-600' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}></div>
            </div>

            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              step >= 3 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500')
            }`}>
              <Lock size={16} />
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3.5 mb-5 rounded-2xl text-xs font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 mb-5 rounded-2xl text-xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-center">
              {success}
            </div>
          )}

          {/* Step 1: Send OTP */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const inputEl = e.target;
                    const cursorStart = inputEl.selectionStart;
                    const cursorEnd = inputEl.selectionEnd;
                    const value = inputEl.value.toLowerCase();
                    setEmail(value);
                    requestAnimationFrame(() => {
                      if (inputEl && inputEl.setSelectionRange) {
                        inputEl.setSelectionRange(cursorStart, cursorEnd);
                      }
                    });
                  }}
                  placeholder="Fill your email address"
                  className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                  }`}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <ThemeLoader size="sm" /> : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <label className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Verification Code (OTP) *
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Fill 6-digit OTP"
                  className={`w-full px-4 py-3.5 rounded-2xl border text-center tracking-[0.3em] font-extrabold text-xl outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                  }`}
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <ThemeLoader size="sm" /> : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setSuccess("");
                }}
                className="w-full text-xs font-extrabold text-indigo-500 hover:underline text-center block pt-2"
              >
                ← Change Email Address
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^a-zA-Z0-9@#$!%&*_\-\.]/g, '');
                      setNewPassword(cleanVal);
                    }}
                    placeholder="Fill your new password"
                    className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none pr-12 transition-all ${
                      isDark 
                        ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                    }`}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^a-zA-Z0-9@#$!%&*_\-\.]/g, '');
                      setConfirmPassword(cleanVal);
                    }}
                    placeholder="Re-enter your new password"
                    className={`w-full px-4 py-3.5 rounded-2xl border text-xs sm:text-sm outline-none pr-12 transition-all ${
                      isDark 
                        ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <ThemeLoader size="sm" /> : (
                  <>
                    <span>Reset Password & Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Back to Login Link */}
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-semibold">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Remember your password? </span>
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-500 font-extrabold hover:underline ml-1"
            >
              Sign In Here
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

