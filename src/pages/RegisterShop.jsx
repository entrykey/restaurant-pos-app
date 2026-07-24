import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import ThemeLoader from '../components/ui/ThemeLoader';
import { shopService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import CommonSelect from '../components/ui/CommonSelect';

const RegisterShop = ({ onBack, onRegisterSuccess }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [availableSubTypes, setAvailableSubTypes] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        businessType: '',
        subType: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        password: ''
    });

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

        // Shop Name validation
        if (!formData.name.trim()) {
            errors.name = "Shop name is required";
        } else if (formData.name.trim().length < 3) {
            errors.name = "Shop name must be at least 3 characters";
        }

        // Business Type validation
        if (!formData.businessType) {
            errors.businessType = "Business type is required";
        }

        // Subtype validation
        if (!formData.subType) {
            errors.subType = "Subtype is required";
        }

        // Owner Name validation (optional but if provided must be 3+ chars)
        if (formData.ownerName.trim() && formData.ownerName.trim().length < 3) {
            errors.ownerName = "Owner name must be at least 3 characters";
        }

        // Email validation
        if (formData.ownerEmail.trim() && !validateEmail(formData.ownerEmail.trim())) {
            errors.ownerEmail = "Invalid email format (use lowercase letters only)";
        }

        // Phone validation
        if (formData.ownerPhone.trim() && !validatePhone(formData.ownerPhone.trim())) {
            errors.ownerPhone = "Invalid phone number (10-15 digits required)";
        }

        // Either email or phone required
        if (!formData.ownerEmail.trim() && !formData.ownerPhone.trim()) {
            errors.ownerEmail = "Either email or phone is required";
            errors.ownerPhone = "Either email or phone is required";
        }

        // Password validation
        if (!formData.password) {
            errors.password = "Password is required";
        } else if (formData.password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear validation error for this field when user types
        setValidationErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleBusinessTypeChange = async (typeId) => {
        handleInputChange('businessType', typeId);
        handleInputChange('subType', '');
        setAvailableSubTypes([]);
        // Clear validation errors
        setValidationErrors(prev => ({ ...prev, businessType: '', subType: '' }));

        if (!typeId) return;

        try {
            const subTypes = await shopService.getBusinessSubTypes(typeId);
            setAvailableSubTypes(subTypes);
        } catch (error) {
            console.error('Failed to fetch subtypes:', error);
        }
    };

    useEffect(() => {
        const fetchBusinessTypes = async () => {
            try {
                const types = await shopService.getBusinessTypes();
                setBusinessTypes(types);
            } catch (error) {
                console.error('Failed to fetch business types:', error);
            }
        };
        fetchBusinessTypes();
    }, []);

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await shopService.createShop(formData);
            if (onRegisterSuccess) onRegisterSuccess();
        } catch (error) {
            // Display user-friendly error message
            const errorMessage = error.message || error.error || 'Registration failed';
            
            // Show specific field errors if available
            if (errorMessage.toLowerCase().includes('email')) {
                setValidationErrors({ ownerEmail: errorMessage });
            } else if (errorMessage.toLowerCase().includes('phone')) {
                setValidationErrors({ ownerPhone: errorMessage });
            } else {
                alert(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`w-full max-w-2xl rounded-3xl shadow-2xl p-6 mx-auto my-4 transition-all duration-300 ${theme.cardBg} max-h-[95vh] overflow-y-auto`}>
            <div className={`flex items-center mb-4 sticky top-0 ${theme.cardBg} pb-2 z-10`}>
                <button 
                    onClick={onBack} 
                    className={`p-2 rounded-lg mr-4 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${theme.textPrimary}`}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className={`text-2xl font-bold flex-1 ${theme.textHeading}`}>Register Shop</h1>
            </div>


            <div className="space-y-3">
                <div>
                    <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>Shop Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                            // Allow only letters, numbers, spaces, period, comma, apostrophe, and hyphen
                            const value = e.target.value.replace(/[^a-zA-Z0-9\s.,'\-]/g, '');
                            handleInputChange('name', value);
                        }}
                        className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText} ${validationErrors.name ? 'border-red-500' : ''}`}
                        placeholder="Ex. Tasty Bites"
                        autoComplete="off"
                    />
                    {validationErrors.name && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>Business Type</label>
                        <CommonSelect
                            options={businessTypes}
                            value={formData.businessType}
                            onChange={handleBusinessTypeChange}
                            placeholder="Select Business Type"
                            labelKey="displayString"
                            valueKey="_id"
                            className={validationErrors.businessType ? 'border-red-500' : ''}
                        />
                        {validationErrors.businessType && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.businessType}</p>
                        )}
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>Subtype</label>
                        <CommonSelect
                            options={availableSubTypes}
                            value={formData.subType}
                            onChange={(val) => handleInputChange('subType', val)}
                            placeholder="Select Subtype"
                            labelKey="displayString"
                            valueKey="_id"
                            disabled={!formData.businessType}
                            className={validationErrors.subType ? 'border-red-500' : ''}
                        />
                        {validationErrors.subType && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.subType}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>Owner Name (Optional)</label>
                    <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => {
                            // Allow only letters, spaces, period, comma, apostrophe, and hyphen
                            const value = e.target.value.replace(/[^a-zA-Z\s.,'\-]/g, '');
                            handleInputChange('ownerName', value);
                        }}
                        className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText} ${validationErrors.ownerName ? 'border-red-500' : ''}`}
                        placeholder="Ex. John Doe"
                        autoComplete="off"
                    />
                    {validationErrors.ownerName && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.ownerName}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>Email (Optional if Phone provided)</label>
                        <input
                            type="text"
                            value={formData.ownerEmail}
                            onChange={(e) => {
                                const value = e.target.value.toLowerCase();
                                handleInputChange('ownerEmail', value);
                                // Real-time email validation
                                if (value && !validateEmail(value)) {
                                    setValidationErrors(prev => ({ ...prev, ownerEmail: 'Invalid email format (use lowercase letters only)' }));
                                }
                            }}
                            onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (value && !validateEmail(value)) {
                                    setValidationErrors(prev => ({ ...prev, ownerEmail: 'Invalid email format (use lowercase letters only)' }));
                                }
                            }}
                            className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText} ${validationErrors.ownerEmail ? 'border-red-500' : ''}`}
                            placeholder="john@example.com"
                            autoComplete="off"
                        />
                        {validationErrors.ownerEmail && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.ownerEmail}</p>
                        )}
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>Phone (Either Email or Phone Required)</label>
                        <input
                            type="tel"
                            value={formData.ownerPhone}
                            onChange={(e) => {
                                // Only allow digits, spaces, hyphens, parentheses, and plus sign
                                const value = e.target.value.replace(/[^0-9\s\-\(\)\+]/g, '');
                                handleInputChange('ownerPhone', value);
                                // Real-time phone validation
                                const cleanPhone = value.replace(/\D/g, '');
                                if (value && cleanPhone.length > 0 && (cleanPhone.length < 10 || cleanPhone.length > 15)) {
                                    setValidationErrors(prev => ({ ...prev, ownerPhone: 'Phone must be 10-15 digits' }));
                                }
                            }}
                            onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (value && !validatePhone(value)) {
                                    setValidationErrors(prev => ({ ...prev, ownerPhone: 'Invalid phone number (10-15 digits required)' }));
                                }
                            }}
                            className={`w-full p-3 border rounded-xl outline-none text-sm ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText} ${validationErrors.ownerPhone ? 'border-red-500' : ''}`}
                            placeholder="+91 98765 43210"
                            autoComplete="off"
                        />
                        {validationErrors.ownerPhone && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.ownerPhone}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className={`block text-sm font-medium mb-1.5 ${theme.textPrimary}`}>Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            className={`w-full p-3 border rounded-xl outline-none text-sm pr-12 ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText} ${validationErrors.password ? 'border-red-500' : ''}`}
                            placeholder="Secure Password"
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
                        <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                    )}
                </div>
            </div>

            <div className={`flex justify-end mt-6 pt-4 border-t ${theme.inputBorder}`}>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`px-8 py-3 rounded-xl text-base font-bold shadow-lg flex items-center space-x-2 transition-all ${loading
                        ? 'opacity-50 cursor-not-allowed'
                        : `${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} active:scale-95`
                        }`}
                >
                    {loading ? <ThemeLoader size="sm" /> : 'Create Shop'}
                </button>
            </div>
        </div>
    );
};

export default RegisterShop;
