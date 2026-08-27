import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Key } from "lucide-react";
import ThemeLoader from "../components/ui/ThemeLoader";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";

export default function ForgotPassword() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setSuccess("Password reset successfully!");
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
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${theme.background}`}>
      <div className={`w-full max-w-md rounded-3xl shadow-2xl p-6 mx-auto transition-all duration-300 ${theme.cardBg} max-h-[95vh] overflow-y-auto`}>
        <div className={`flex items-center mb-4`}>
          <button
            onClick={() => navigate("/login")}
            className={`p-2 rounded-lg mr-4 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${theme.textPrimary}`}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className={`text-2xl font-bold flex-1 ${theme.textHeading}`}>Forgot Password</h1>
        </div>

        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                <Mail size={16} />
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
            </div>
            <div className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                <Key size={16} />
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
              <Lock size={16} />
            </div>
          </div>

          {error && (
            <div className={`p-3 text-sm font-medium rounded-xl text-center ${theme.errorBg} ${theme.errorText}`}>
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 text-sm font-medium rounded-xl text-center bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {success}
            </div>
          )}

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <p className={`text-sm ${theme.textSecondary}`}>
                Enter your email address and we'll send you an OTP to reset your password.
              </p>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>
                  Email Address
                </label>
                <input
                  type="text"
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
                  className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                  placeholder="your.email@example.com"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-2xl text-base font-bold shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg}`}
              >
                {loading ? <ThemeLoader size="sm" /> : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <p className={`text-sm ${theme.textSecondary}`}>
                We've sent a 6-digit OTP to <strong>{email}</strong>. Please enter it below.
              </p>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`w-full p-3 border rounded-xl outline-none text-sm text-center tracking-widest font-bold text-2xl ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-2xl text-base font-bold shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg}`}
              >
                {loading ? <ThemeLoader size="sm" /> : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`w-full text-sm ${theme.textSecondary} hover:underline`}
              >
                ← Back to Email
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className={`text-sm ${theme.textSecondary}`}>
                Create a new password for your account.
              </p>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    const inputEl = e.target;
                    const cursorStart = inputEl.selectionStart;
                    const rawVal = inputEl.value;

                    // Filter out disallowed special characters (e.g. {, }, ^, ~, |, <, >, \, /, ", ')
                    const cleanVal = rawVal.replace(/[^a-zA-Z0-9@#$!%&*_\-\.]/g, '');
                    const hadInvalidChar = cleanVal !== rawVal;

                    setNewPassword(cleanVal);

                    requestAnimationFrame(() => {
                      if (inputEl && inputEl.setSelectionRange) {
                        const pos = hadInvalidChar ? Math.max(0, cursorStart - 1) : cursorStart;
                        inputEl.setSelectionRange(pos, pos);
                      }
                    });
                  }}
                  className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-2xl text-base font-bold shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg}`}
              >
                {loading ? <ThemeLoader size="sm" /> : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
