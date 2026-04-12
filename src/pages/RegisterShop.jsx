import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { shopService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import CommonSelect from '../components/ui/CommonSelect';

const RegisterShop = ({ onBack, onRegisterSuccess }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [availableSubTypes, setAvailableSubTypes] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        businessType: '',
        subType: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        password: ''
    });

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const canSubmit = useMemo(() => {
        return (
            Boolean(formData.name.trim()) &&
            Boolean(formData.businessType) &&
            Boolean(formData.subType) &&
            Boolean(formData.password) &&
            Boolean(formData.ownerEmail.trim() || formData.ownerPhone.trim())
        );
    }, [formData]);

    const handleBusinessTypeChange = async (typeId) => {
        handleInputChange('businessType', typeId);
        handleInputChange('subType', '');
        setAvailableSubTypes([]);

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
        setLoading(true);
        try {
            await shopService.createShop(formData);
            if (onRegisterSuccess) onRegisterSuccess();
        } catch (error) {
            alert(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`w-full max-w-2xl rounded-3xl shadow-2xl p-8 mx-auto transition-all duration-300 ${theme.cardBg}`}>
            <div className={`flex items-center mb-6 ${theme.textHeading}`}>
                <button onClick={onBack} className={`p-2 rounded-lg mr-4 ${theme.textSecondary} hover:opacity-80`}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold flex-1">Register Shop</h1>
            </div>


            <div className="space-y-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Shop Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                        placeholder="Ex. Tasty Bites"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Business Type</label>
                        <CommonSelect
                            options={businessTypes}
                            value={formData.businessType}
                            onChange={handleBusinessTypeChange}
                            placeholder="Select Business Type"
                            labelKey="displayString"
                            valueKey="_id"
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Subtype</label>
                        <CommonSelect
                            options={availableSubTypes}
                            value={formData.subType}
                            onChange={(val) => handleInputChange('subType', val)}
                            placeholder="Select Subtype"
                            labelKey="displayString"
                            valueKey="_id"
                            disabled={!formData.businessType}
                        />
                    </div>
                </div>

                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Owner Name (Optional)</label>
                    <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => handleInputChange('ownerName', e.target.value)}
                        className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                        placeholder="Ex. John Doe"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Email</label>
                        <input
                            type="email"
                            value={formData.ownerEmail}
                            onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                            className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Phone</label>
                        <input
                            type="tel"
                            value={formData.ownerPhone}
                            onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                            className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                            placeholder="+91 98765 43210"
                        />
                    </div>
                </div>

                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                        placeholder="Secure Password"
                    />
                </div>
            </div>

            <div className={`flex justify-end mt-8 pt-6 border-t ${theme.inputBorder}`}>
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                    className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all ${!canSubmit || loading
                        ? 'opacity-50 cursor-not-allowed'
                        : `${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} active:scale-95`
                        }`}
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <span>Create Shop</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default RegisterShop;
