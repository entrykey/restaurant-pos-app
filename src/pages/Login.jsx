import React, { useMemo, useState } from "react";
import { ChevronDown, Utensils, Building2, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  BUSINESS_TYPES,
  BUSINESS_SUBTYPES,
  getDefaultModules,
  getAllModules,
} from "../config/businessTypes";

const countries = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "USA", code: "+1", flag: "🇺🇸" },
  { name: "UK", code: "+44", flag: "🇬🇧" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
];

const getNowLog = (role, phone) => {
  const now = new Date();
  return {
    id: Date.now(),
    role,
    phone,
    date: now.toISOString().split("T")[0],
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

export default function Login({
  shopName,
  rolesList,
  staffList,
  onSetBusinessType,
  onSetBusinessSubtype,
  onSetEnabledModules
}) {
  const auth = useAuth();

  const [authStep, setAuthStep] = useState("login"); // 'login' | 'otp' | 'setup'
  const [selectedRole, setSelectedRole] = useState("Staff");
  const [country, setCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");

  // Setup State
  const [pendingUser, setPendingUser] = useState(null);
  const [selectedType, setSelectedType] = useState(BUSINESS_TYPES.RESTAURANT);
  // Default to first subtype of Restaurant
  const [selectedSubtype, setSelectedSubtype] = useState(BUSINESS_SUBTYPES[BUSINESS_TYPES.RESTAURANT][0].id);

  const selectableRoles = useMemo(() => rolesList?.slice?.(0, 3) ?? [], [rolesList]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (phone.length >= 10) setAuthStep("otp");
  };

  const handleVerifyOtp = () => {
    if (otpValue.length !== 4) return;

    const roleObj = rolesList?.find?.((r) => r.name === selectedRole);
    const permissions = roleObj ? roleObj.permissions : [];
    const existingStaff = staffList?.find?.((s) => s.phone === phone);

    const userObj = {
      phone,
      role: selectedRole,
      name: existingStaff ? existingStaff.name : "Unknown",
      permissions,
    };

    setPendingUser(userObj);
    setAuthStep("setup");
  };

  const handleCompleteSetup = () => {
    if (!pendingUser) return;

    // 1. Configure App Context
    if (onSetBusinessType) onSetBusinessType(selectedType);
    if (onSetBusinessSubtype) onSetBusinessSubtype(selectedSubtype);

    // Calculate and set enabled modules
    const defaults = getDefaultModules(selectedType, selectedSubtype);
    const normalizedModules = getAllModules().reduce((acc, key) => {
      acc[key] = defaults[key] === true;
      return acc;
    }, {});

    if (onSetEnabledModules) onSetEnabledModules(normalizedModules);

    // 2. Complete Login
    auth.addAuthLog(getNowLog(selectedRole, phone));
    auth.login(pendingUser);
  };

  const availableSubtypes = BUSINESS_SUBTYPES[selectedType] || [];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-indigo-900 p-4">
      <div className={`bg-white w-full ${authStep === 'setup' ? 'max-w-3xl' : 'max-w-md'} rounded-3xl shadow-2xl p-8 mx-auto transition-all duration-300`}>
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full">
            <Utensils size={40} className="text-indigo-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">{shopName}</h1>

        {authStep === "login" && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Login Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {selectableRoles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.name)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all ${selectedRole === r.name
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                        : "bg-white border-gray-200 text-gray-500"
                      }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Country
              </label>
              <div
                className="flex items-center justify-between border rounded-xl p-4 bg-gray-50 cursor-pointer"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              >
                <div className="flex items-center">
                  <span>{country.flag}</span>
                  <span className="ml-2 font-medium">
                    {country.name} ({country.code})
                  </span>
                </div>
                <ChevronDown size={18} className="text-gray-400" />
              </div>
              {isCountryDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                  {countries.map((c) => (
                    <div
                      key={c.code}
                      className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between"
                      onClick={() => {
                        setCountry(c);
                        setIsCountryDropdownOpen(false);
                      }}
                    >
                      <span>
                        {c.flag} {c.name}
                      </span>
                      <span className="text-gray-400">{c.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Phone Number
              </label>
              <div className="flex items-center border rounded-xl p-4 bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="text-indigo-600 font-bold mr-3">{country.code}</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="bg-transparent flex-1 outline-none text-lg font-medium"
                  placeholder="Enter Mobile Number"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95"
            >
              Get OTP
            </button>
          </form>
        )}

        {authStep === "otp" && (
          <div className="space-y-6">
            <p className="text-center text-gray-500">
              Enter code sent for <b>{selectedRole}</b> to {country.code} {phone}
            </p>
            <div className="flex justify-center gap-2 md:gap-4 relative">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-14 md:w-14 md:h-16 border-2 rounded-xl flex items-center justify-center text-xl md:text-2xl font-black ${otpValue.length === i
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 bg-gray-50"
                    }`}
                >
                  {otpValue[i] || ""}
                </div>
              ))}
              <input
                type="tel"
                maxLength="4"
                autoFocus
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-default"
              />
            </div>
            <button
              onClick={handleVerifyOtp}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg"
            >
              Verify Code
            </button>
          </div>
        )}

        {authStep === "setup" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-black text-gray-800">Setup Business Type</h2>
              <p className="text-gray-500 text-sm">Select your business category to configure the app</p>
            </div>

            {/* Business Type Selection */}
            <div>
              <label className="text-xs font-black text-gray-400 uppercase block mb-3">Business Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(BUSINESS_TYPES).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedType(value);
                      const firstSubtype = BUSINESS_SUBTYPES[value]?.[0]?.id;
                      if (firstSubtype) setSelectedSubtype(firstSubtype);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedType === value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <Building2 className={`w-6 h-6 mb-2 ${selectedType === value ? "text-indigo-600" : "text-gray-400"}`} />
                    <div className="font-bold capitalize text-sm">{value}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Business Subtype Selection */}
            {availableSubtypes.length > 0 && (
              <div>
                <label className="text-xs font-black text-gray-400 uppercase block mb-3">Business Subtype</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableSubtypes.map((subtype) => (
                    <button
                      key={subtype.id}
                      type="button"
                      onClick={() => setSelectedSubtype(subtype.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${selectedSubtype === subtype.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <span className="text-sm font-bold">{subtype.name}</span>
                      {selectedSubtype === subtype.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCompleteSetup}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95 mt-6"
            >
              Enter Shop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

