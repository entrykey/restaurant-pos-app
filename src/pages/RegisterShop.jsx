import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Building2, 
  Layers, 
  Sun, 
  Moon, 
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import ThemeLoader from '../components/ui/ThemeLoader';
import MiniaturePOSSimulator from '../components/MiniaturePOSSimulator';
import { shopService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import CommonSelect from '../components/ui/CommonSelect';
import { toast } from 'react-hot-toast';
import { validateEmail, validatePassword, sanitizeEmailInput } from '../utils/validation';

const RegisterShop = ({ onBack, onRegisterSuccess }) => {
    const navigate = useNavigate();
    const { themeName, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [availableSubTypes, setAvailableSubTypes] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    const isDark = themeName === 'dark' || themeName === 'ocean';
    const logoSrc = isDark ? '/assets/FILEPE_WHITE.svg' : '/assets/FILEPE_BLUE.svg';

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    const [formData, setFormData] = useState({
        name: '',
        businessType: '',
        subType: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        password: ''
    });

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const types = await shopService.getBusinessTypes();
                setBusinessTypes(types || []);
            } catch (err) {
                console.error("Failed to load business types", err);
            }
        };
        fetchTypes();
    }, []);

    const validatePhone = (phone) => {
        const phoneRegex = /^[0-9]{10,15}$/;
        const cleanPhone = phone.replace(/\D/g, '');
        return phoneRegex.test(cleanPhone);
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.name.trim()) {
            errors.name = "Shop name is required";
        } else if (formData.name.trim().length < 3) {
            errors.name = "Shop name must be at least 3 characters";
        }

        if (!formData.businessType) {
            errors.businessType = "Business category is required";
        }

        if (!formData.subType) {
            errors.subType = "Sub-category is required";
        }

        if (formData.ownerName.trim() && formData.ownerName.trim().length < 3) {
            errors.ownerName = "Owner name must be at least 3 characters";
        }

        if (formData.ownerEmail.trim() && !validateEmail(formData.ownerEmail.trim())) {
            errors.ownerEmail = "Please enter a valid email address";
        }

        if (formData.ownerPhone.trim() && !validatePhone(formData.ownerPhone.trim())) {
            errors.ownerPhone = "Please enter a valid 10-15 digit phone number";
        }

        if (!formData.ownerEmail.trim() && !formData.ownerPhone.trim()) {
            errors.ownerEmail = "Email or phone is required";
            errors.ownerPhone = "Email or phone is required";
        }

        if (!formData.password) {
            errors.password = "Password is required";
        } else {
            const pwdCheck = validatePassword(formData.password);
            if (!pwdCheck.valid) {
                errors.password = pwdCheck.message;
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setValidationErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleBusinessTypeChange = async (typeId) => {
        handleInputChange('businessType', typeId);
        handleInputChange('subType', '');
        setAvailableSubTypes([]);

        if (typeId) {
            try {
                const subTypes = await shopService.getBusinessSubTypes(typeId);
                setAvailableSubTypes(subTypes || []);
            } catch (err) {
                console.error("Failed to load sub types", err);
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const data = await shopService.registerShop(formData);
            toast.success("Shop registered successfully!");
            if (onRegisterSuccess) onRegisterSuccess(data);
            else navigate('/login');
        } catch (err) {
            console.error("Registration failed", err);
            toast.error(err.message || "Failed to register shop");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (onBack) onBack();
        else navigate('/login');
    };

    return (
        <div className={`min-h-screen lg:h-screen lg:max-h-screen relative overflow-y-auto lg:overflow-hidden font-sans transition-colors duration-300 flex flex-col justify-between py-2 lg:py-4 px-4 sm:px-6 lg:px-10 ${
            isDark ? 'bg-[#090A0F] text-slate-100 selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-900 selection:bg-indigo-500/20'
        }`}>
            {/* Ambient Background Glow Blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Main Container */}
            <main className="flex-1 w-full max-w-[1440px] mx-auto flex items-center justify-center relative z-10 my-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center w-full">
                    
                    {/* Left Column: POS Simulator Showcase */}
                    <div className="hidden lg:block lg:col-span-6 xl:col-span-7 space-y-3">
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
                        <div className={`p-2.5 rounded-2xl border grid grid-cols-3 gap-3 text-center ${
                            isDark ? 'bg-slate-900/60 border-slate-800/80 backdrop-blur-md' : 'bg-white/80 border-slate-200/80 backdrop-blur-md shadow-sm'
                        }`}>
                            <div>
                                <p className="text-base font-black text-indigo-500">0.4s</p>
                                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avg Bill Print</p>
                            </div>
                            <div>
                                <p className="text-base font-black text-emerald-400">100%</p>
                                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>GST Compliant</p>
                            </div>
                            <div>
                                <p className="text-base font-black text-purple-400">24 / 7</p>
                                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cloud Sync</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Registration Card */}
                    <div className="col-span-1 lg:col-span-6 xl:col-span-5 w-full max-w-lg lg:max-w-none mx-auto">
                        <div className={`p-5 sm:p-6 rounded-3xl transition-all relative border ${
                            isDark 
                                ? 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl' 
                                : 'bg-white border-slate-200/90 shadow-2xl shadow-slate-200/60 backdrop-blur-xl'
                        }`}>

                            {/* Card Header Bar (Actions Top Right + Bigger Centered Logo) */}
                            <div className="relative pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800/80">
                                {/* Actions floating top right */}
                                <div className="absolute right-0 top-0 flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={toggleTheme}
                                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                        className={`p-1.5 rounded-xl transition-all border ${
                                            isDark 
                                                ? 'bg-slate-800/60 border-slate-700 text-amber-300 hover:bg-slate-800 hover:scale-105' 
                                                : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200 hover:scale-105'
                                        }`}
                                    >
                                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 ${
                                            isDark 
                                                ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white' 
                                                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        <ArrowLeft size={12} />
                                        <span>Back to Login</span>
                                    </button>
                                </div>

                                {/* Centered Bigger Logo */}
                                <div 
                                    className="flex justify-center cursor-pointer transition-transform hover:scale-105 pt-0.5 pb-0.5"
                                    onClick={() => navigate('/')}
                                >
                                    <img src={logoSrc} alt="FILEPE Logo" className="h-9 sm:h-11 object-contain" />
                                </div>
                            </div>

                            {/* Title & Subtitle (Centered) */}
                            <div className="space-y-0.5 mb-3 text-center">
                                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                                    Register Your <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Business</span>
                                </h2>
                                
                                <p className={`text-[11px] font-normal leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Create your FILEPE shop account in under 2 minutes.
                                </p>
                            </div>

                            {/* Form Fields Grid */}
                            <form onSubmit={handleSubmit} className="space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* Shop Name */}
                                    <div>
                                        <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Shop Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^a-zA-Z0-9\s.,'\-]/g, '');
                                                handleInputChange('name', value);
                                            }}
                                            placeholder="Fill your shop name"
                                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                                                isDark 
                                                    ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                                    : 'bg-slate-50/80 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                            } ${validationErrors.name ? 'border-rose-500' : ''}`}
                                        />
                                        {validationErrors.name && (
                                            <p className="text-rose-500 text-[10px] font-bold mt-0.5">{validationErrors.name}</p>
                                        )}
                                    </div>

                                    {/* Business Category */}
                                    <div>
                                        <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Business Category *
                                        </label>
                                        <CommonSelect
                                            options={businessTypes}
                                            value={formData.businessType}
                                            onChange={handleBusinessTypeChange}
                                            placeholder="Select Category..."
                                            labelKey="displayString"
                                            valueKey="_id"
                                            icon={Building2}
                                            triggerClassName={isDark ? '!bg-slate-800/50 !border-slate-700 !rounded-xl !py-2 !px-3 !text-xs !font-medium' : '!bg-slate-50/80 !border-slate-300 !rounded-xl !py-2 !px-3 !text-xs !font-medium'}
                                        />
                                        {validationErrors.businessType && (
                                            <p className="text-rose-500 text-[10px] font-bold mt-0.5">{validationErrors.businessType}</p>
                                        )}
                                    </div>

                                    {/* Business Sub-Category (Conditional) */}
                                    {formData.businessType && (
                                        <div className="sm:col-span-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                Business Sub-Category *
                                            </label>
                                            <CommonSelect
                                                options={availableSubTypes}
                                                value={formData.subType}
                                                onChange={(val) => handleInputChange('subType', val)}
                                                placeholder="Select Sub-Category..."
                                                labelKey="displayString"
                                                valueKey="_id"
                                                icon={Layers}
                                                triggerClassName={isDark ? '!bg-slate-800/50 !border-slate-700 !rounded-xl !py-2 !px-3 !text-xs !font-medium' : '!bg-slate-50/80 !border-slate-300 !rounded-xl !py-2 !px-3 !text-xs !font-medium'}
                                            />
                                            {validationErrors.subType && (
                                                <p className="text-rose-500 text-[10px] font-bold mt-0.5">{validationErrors.subType}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Owner Name */}
                                    <div>
                                        <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Owner Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.ownerName}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^a-zA-Z\s.,'\-]/g, '');
                                                handleInputChange('ownerName', value);
                                            }}
                                            placeholder="Fill your name"
                                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                                                isDark 
                                                    ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                                    : 'bg-slate-50/80 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                            }`}
                                        />
                                        {validationErrors.ownerName && (
                                            <p className="text-rose-500 text-[10px] font-bold mt-0.5">{validationErrors.ownerName}</p>
                                        )}
                                    </div>

                                    {/* Phone Number */}
                                    <div>
                                        <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.ownerPhone}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9\s\-\(\)\+]/g, '');
                                                handleInputChange('ownerPhone', value);
                                            }}
                                            placeholder="Fill your phone number"
                                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                                                isDark 
                                                    ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                                    : 'bg-slate-50/80 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                            }`}
                                        />
                                        {validationErrors.ownerPhone && (
                                            <p className="text-rose-500 text-[10px] font-bold mt-0.5">{validationErrors.ownerPhone}</p>
                                        )}
                                    </div>

                                    {/* Email Address */}
                                    <div>
                                        <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.ownerEmail}
                                            onChange={(e) => handleInputChange('ownerEmail', sanitizeEmailInput(e.target.value))}
                                            placeholder="Fill your email address"
                                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                                                isDark 
                                                    ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                                    : 'bg-slate-50/80 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                            }`}
                                        />
                                        {validationErrors.ownerEmail && (
                                            <p className="text-rose-500 text-[10px] font-bold mt-0.5">{validationErrors.ownerEmail}</p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Password *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => {
                                                    const cleanVal = e.target.value.replace(/[^a-zA-Z0-9@#$!%&*_\-\.]/g, '');
                                                    handleInputChange('password', cleanVal);
                                                }}
                                                placeholder="Fill your password"
                                                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none pr-9 transition-all ${
                                                    isDark 
                                                        ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                                        : 'bg-slate-50/80 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {validationErrors.password && (
                                            <p className="text-rose-500 text-[10px] font-bold mt-0.5">{validationErrors.password}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mt-1"
                                >
                                    {loading ? <ThemeLoader size="sm" /> : (
                                        <>
                                            <span>Register & Create Shop</span>
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Card Footer Link */}
                            <div className="pt-2.5 mt-2.5 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-semibold">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Already registered your business? </span>
                                <button
                                    onClick={handleBack}
                                    className="text-indigo-500 font-extrabold hover:underline ml-1 inline-flex items-center gap-1"
                                >
                                    <span>Sign In Here</span>
                                    <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Page Footer Note */}
            <footer className={`py-1 text-center text-[10px] font-medium border-t z-10 shrink-0 ${
                isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200/80 text-slate-400'
            }`}>
                <p>© {new Date().getFullYear()} FILEPE — Entrykey Business Solution LLP. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default RegisterShop;

