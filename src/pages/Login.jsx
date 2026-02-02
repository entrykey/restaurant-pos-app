import React, { useMemo, useState } from "react";
import { ChevronDown, Utensils } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

export default function Login({ shopName, rolesList, staffList }) {
  const auth = useAuth();

  const [authStep, setAuthStep] = useState("login"); // 'login' | 'otp'
  const [selectedRole, setSelectedRole] = useState("Staff");
  const [country, setCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");

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

    auth.addAuthLog(getNowLog(selectedRole, phone));
    auth.login(userObj);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-indigo-900 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 mx-auto">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full">
            <Utensils size={40} className="text-indigo-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">{shopName}</h1>

        {authStep === "login" ? (
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
                    className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                      selectedRole === r.name
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
        ) : (
          <div className="space-y-6">
            <p className="text-center text-gray-500">
              Enter code sent for <b>{selectedRole}</b> to {country.code} {phone}
            </p>
            <div className="flex justify-center gap-2 md:gap-4 relative">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-14 md:w-14 md:h-16 border-2 rounded-xl flex items-center justify-center text-xl md:text-2xl font-black ${
                    otpValue.length === i
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
              Verify & Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

