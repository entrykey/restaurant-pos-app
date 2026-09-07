import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Building2, Layers, Sun, Moon, ShieldCheck, ArrowRight } from 'lucide-react';
import ThemeLoader from '../components/ui/ThemeLoader';
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
            errors.ownerEmail = "Please enter a valid email address (e.g. name@domain.com)";
        }

        if (formData.ownerPhone.trim() && !validatePhone(formData.ownerPhone.trim())) {
            errors.ownerPhone = "Please enter a valid 10-15 digit phone number";
        }

        if (!formData.ownerEmail.trim() && !formData.ownerPhone.trim()) {
            errors.ownerEmail = "Please enter an email address or phone number";
            errors.ownerPhone = "Please enter an email address or phone number";
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

    return (
        <div className={`min-h-screen w-full flex flex-col items-center justify-center py-6 px-4 overflow-y-auto custom-scrollbar font-sans transition-colors duration-300 ${
            isDark ? 'bg-[#090A0F] text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Main Form Container */}
            <div className="w-full max-w-xl mx-auto my-auto">
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
                                onClick={() => onBack ? onBack() : navigate('/login')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                                    isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                <ArrowLeft size={14} />
                                <span>Back to Login</span>
                            </button>
                        </div>
                    </div>

                    {/* Title Header */}
                    <div className="space-y-1 mb-5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[11px] font-extrabold">
                            <ShieldCheck size={13} className="text-emerald-500" />
                            <span>Business Onboarding</span>
                        </div>
                        <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Register Your Business
                        </h2>
                        <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Create your FILEPE shop account in under 2 minutes.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        {/* Shop Name */}
                        <div>
                            <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                                    isDark 
                                        ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                        : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                } ${validationErrors.name ? 'border-rose-500' : ''}`}
                            />
                            {validationErrors.name && (
                                <p className="text-rose-500 text-[11px] font-bold mt-1">{validationErrors.name}</p>
                            )}
                        </div>

                        {/* Business Category & Sub-Category */}
                        <div className={`grid grid-cols-1 ${formData.businessType ? 'sm:grid-cols-2' : ''} gap-3 transition-all duration-300`}>
                            <div>
                                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Business Category *
                                </label>
                                <CommonSelect
                                    options={businessTypes}
                                    value={formData.businessType}
                                    onChange={handleBusinessTypeChange}
                                    placeholder="Select Business Category..."
                                    labelKey="displayString"
                                    valueKey="_id"
                                    icon={Building2}
                                    triggerClassName={isDark ? '!bg-slate-800/40 !border-slate-700 !rounded-xl !py-2.5 !px-3.5 !text-xs !font-medium' : '!bg-slate-50 !border-slate-300 !rounded-xl !py-2.5 !px-3.5 !text-xs !font-medium'}
                                />
                                {validationErrors.businessType && (
                                    <p className="text-rose-500 text-[11px] font-bold mt-1">{validationErrors.businessType}</p>
                                )}
                            </div>

                            {formData.businessType && (
                                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                    <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Business Sub-Category *
                                    </label>
                                    <CommonSelect
                                        options={availableSubTypes}
                                        value={formData.subType}
                                        onChange={(val) => handleInputChange('subType', val)}
                                        placeholder="Select Business Sub-Category..."
                                        labelKey="displayString"
                                        valueKey="_id"
                                        icon={Layers}
                                        triggerClassName={isDark ? '!bg-slate-800/40 !border-slate-700 !rounded-xl !py-2.5 !px-3.5 !text-xs !font-medium' : '!bg-slate-50 !border-slate-300 !rounded-xl !py-2.5 !px-3.5 !text-xs !font-medium'}
                                    />
                                    {validationErrors.subType && (
                                        <p className="text-rose-500 text-[11px] font-bold mt-1">{validationErrors.subType}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Owner Name */}
                        <div>
                            <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                                    isDark 
                                        ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                        : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                }`}
                            />
                        </div>

                        {/* Email & Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.ownerEmail}
                                    onChange={(e) => handleInputChange('ownerEmail', sanitizeEmailInput(e.target.value))}
                                    placeholder="Fill your email address"
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                                        isDark 
                                            ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                            : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                    }`}
                                />
                                {validationErrors.ownerEmail && (
                                    <p className="text-rose-500 text-[11px] font-bold mt-1">{validationErrors.ownerEmail}</p>
                                )}
                            </div>

                            <div>
                                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                                        isDark 
                                            ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                            : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                    }`}
                                />
                                {validationErrors.ownerPhone && (
                                    <p className="text-rose-500 text-[11px] font-bold mt-1">{validationErrors.ownerPhone}</p>
                                )}
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
                                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none pr-10 transition-all ${
                                        isDark 
                                            ? 'bg-slate-800/40 border-slate-700 focus:border-indigo-500 text-white placeholder-slate-500' 
                                            : 'bg-slate-50 border-slate-300 focus:border-indigo-600 text-slate-900 placeholder-slate-400'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
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
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <ThemeLoader size="sm" /> : (
                                <>
                                    <span>Register & Create Shop</span>
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer link */}
                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs font-semibold">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Already registered your business? </span>
                        <button
                            onClick={() => onBack ? onBack() : navigate('/login')}
                            className="text-indigo-500 font-extrabold hover:underline ml-1"
                        >
                            Sign In Here
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterShop;
