import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Utensils, Eye, EyeOff } from "lucide-react";
import ThemeLoader from "../components/ui/ThemeLoader";
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
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Check if user is already logged in
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      // Show confirmation dialog before allowing different user login
      const currentUserEmail = auth.user.email || auth.user.phone || 'current user';
      const shouldLogout = window.confirm(
        `You are already logged in as ${currentUserEmail}. Do you want to logout and login with a different account?`
      );
      
      if (shouldLogout) {
        auth.logout();
      } else {
        // Redirect to dashboard
        navigate('/dashboard');
      }
    }
  }, [auth.isAuthenticated, auth.user, auth, navigate]);

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
      errors.identifier = "Email or phone is required";
    } else {
      const isEmail = identifier.includes('@');
      if (isEmail && !validateEmail(identifier)) {
        errors.identifier = "Invalid email format (use lowercase letters only)";
      } else if (!isEmail && !validatePhone(identifier)) {
        errors.identifier = "Invalid phone number (10-15 digits required)";
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

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${theme.background}`}>
      <div className={`w-full max-w-md rounded-3xl shadow-2xl p-6 mx-auto transition-all duration-300 ${theme.cardBg} max-h-[95vh] overflow-y-auto`}>
        <div className="flex justify-center mb-4">
          <div className={`p-4 rounded-full ${theme.primaryIconBg}`}>
            <Utensils size={40} className={theme.primaryIconText} />
          </div>
        </div>
        <h1 className={`text-2xl font-bold text-center mb-6 ${theme.textHeading}`}>{shopName}</h1>

        <div className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">

            {error && (
              <div className={`p-3 text-sm font-medium rounded-xl text-center ${theme.errorBg} ${theme.errorText}`}>
                {error}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  let value = e.target.value;
                  
                  // Detect if it's an email (contains @) or phone (starts with digit or +)
                  const hasAtSymbol = value.includes('@');
                  
                  // If it contains @, treat as email and convert to lowercase
                  if (hasAtSymbol) {
                    value = value.toLowerCase();
                    setIdentifier(value);
                    setValidationErrors(prev => ({ ...prev, identifier: '' }));
                    
                    // Validate email format in real-time
                    if (!validateEmail(value)) {
                      setValidationErrors(prev => ({ ...prev, identifier: 'Invalid email format' }));
                    }
                  } else {
                    // No @ symbol - could be phone OR beginning of email
                    // Only filter if it looks like a phone number (starts with + or digit)
                    const startsLikePhone = /^[\+0-9]/.test(value);
                    
                    if (startsLikePhone) {
                      // Definitely a phone number - filter to phone chars only
                      value = value.replace(/[^0-9\s\-\(\)\+]/g, '');
                      setIdentifier(value);
                      
                      // Validate phone length
                      const cleanPhone = value.replace(/\D/g, '');
                      if (cleanPhone.length > 0 && (cleanPhone.length < 10 || cleanPhone.length > 15)) {
                        setValidationErrors(prev => ({ ...prev, identifier: 'Phone must be 10-15 digits' }));
                      } else {
                        setValidationErrors(prev => ({ ...prev, identifier: '' }));
                      }
                    } else {
                      // Starts with letter - likely email, allow all chars
                      setIdentifier(value);
                      setValidationErrors(prev => ({ ...prev, identifier: '' }));
                    }
                  }
                }}
                className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText} ${validationErrors.identifier ? 'border-red-500' : ''}`}
                placeholder="Enter your email or phone number"
                autoComplete="off"
                autoFocus
              />
              {validationErrors.identifier && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.identifier}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setValidationErrors(prev => ({ ...prev, password: '' }));
                  }}
                  className={`w-full p-3 border rounded-xl outline-none text-sm pr-12 ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText} ${validationErrors.password ? 'border-red-500' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.textSecondary} hover:opacity-80 transition-opacity`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-2xl text-base font-bold shadow-xl transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg}`}
            >
              {loading ? <ThemeLoader size="sm" /> : "Login"}
            </button>
          </form>

          <div className="text-center space-y-2">
            <button
              onClick={() => navigate('/forgot-password')}
              className={`text-sm font-medium hover:underline ${theme.textSecondary}`}
            >
              Forgot Password?
            </button>
            <div>
              <span className={`text-sm font-medium ${theme.textSecondary}`}>New here? </span>
              <button
                onClick={() => navigate('/register')}
                className={`text-sm font-bold hover:underline ${theme.linkText} ${theme.linkHover}`}
              >
                Register Shop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
