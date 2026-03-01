import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building2, User, FileText, Settings2 } from 'lucide-react';
import { shopService } from '../../services/api/shops';
import { businessTypesService } from '../../services/api/businessTypes';
import { useTheme } from '../../context/ThemeContext';

const ShopForm = ({ shopToEdit, onBack }) => {
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [subtypes, setSubtypes] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        businessType: '',
        subType: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        password: '', // Only for creation
        address: {
            line1: '',
            line2: '',
            city: '',
            state: { name: '', code: '' },
            country: { name: '', code: '' },
            pincode: ''
        },
        taxProfile: {
            taxSystem: 'GST',
            registrationNumber: '',
            legalName: '',
            isInterStateAllowed: false
        }
    });

    useEffect(() => {
        fetchBusinessTypes();
        if (shopToEdit) {
            setFormData(prev => ({
                ...prev,
                name: shopToEdit.name || '',
                businessType: shopToEdit.businessType || '',
                subType: shopToEdit.subType || '',
                ownerName: shopToEdit.ownerName || '',
                ownerPhone: shopToEdit.ownerContact || '',
                ...shopToEdit
            }));

            if (shopToEdit.businessType) {
                fetchSubtypes(shopToEdit.businessType);
            }
        }
    }, [shopToEdit]);

    const fetchBusinessTypes = async () => {
        try {
            const res = await businessTypesService.getBusinessTypes();
            setBusinessTypes(res.data);
        } catch (error) {
            console.error("Failed to fetch business types", error);
        }
    };

    const fetchSubtypes = async (typeId) => {
        if (!typeId) {
            setSubtypes([]);
            return;
        }
        try {
            const res = await businessTypesService.getBusinessSubTypes();
            // We need to filter subtypes by typeId on the frontend if the API doesn't support query params,
            // assuming the API returns all subTypes. Let's filter them:
            const filtered = res.data.filter(s => s.businessTypeId === typeId || s.businessTypeId?._id === typeId);
            setSubtypes(filtered);
        } catch (error) {
            console.error("Failed to fetch subtypes", error);
        }
    };

    const handleTypeChange = (e) => {
        const typeId = e.target.value;
        setFormData(prev => ({ ...prev, businessType: typeId, subType: '' }));
        fetchSubtypes(typeId);
    };

    const handleChange = (e, section = null, subSection = null) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            if (section && subSection) {
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [subSection]: {
                            ...prev[section][subSection],
                            [name]: finalValue
                        }
                    }
                }
            } else if (section) {
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [name]: finalValue
                    }
                };
            }
            return {
                ...prev,
                [name]: finalValue
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (shopToEdit) {
                const updatePayload = {
                    name: formData.name,
                    businessType: formData.businessType,
                    subType: formData.subType,
                    ownerName: formData.ownerName,
                    ownerContact: formData.ownerPhone
                };
                await shopService.updateShop(shopToEdit._id, updatePayload);
            } else {
                await shopService.createShop(formData);
            }
            onBack();
        } catch (error) {
            console.error("Error saving shop:", error);
            alert(error.response?.data?.message || "Failed to save shop");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="w-full mx-auto space-y-8">

                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onBack}
                            className={`p-2 ${theme.surfaceBg} border ${theme.borderLight} rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                        >
                            <ArrowLeft className={`w-5 h-5 ${theme.textPrimary}`} />
                        </button>
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                            <button onClick={onBack} className={`${theme.textSecondary} hover:${theme.textPrimary} transition-colors`}>
                                Shop Management
                            </button>
                            <span className={theme.textMuted}>/</span>
                            <span className={theme.textPrimary}>
                                {shopToEdit ? 'Edit Shop' : 'Add New'}
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 1. Basic Shop Info */}
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Building2 size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Shop Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Shop Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Business Type *</label>
                                <select
                                    name="businessType"
                                    value={formData.businessType}
                                    onChange={handleTypeChange}
                                    required
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                >
                                    <option value="">Select Type</option>
                                    {businessTypes.map(t => (
                                        <option key={t._id} value={t._id}>{t.displayString || t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Sub Type</label>
                                <select
                                    name="subType"
                                    value={formData.subType}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                >
                                    <option value="">Select Subtype</option>
                                    {subtypes.map(s => (
                                        <option key={s._id} value={s._id}>{s.displayString || s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. Owner Credentials */}
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <User size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Owner Credentials</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Owner Name *</label>
                                <input
                                    type="text"
                                    name="ownerName"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    required
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Owner Phone *</label>
                                <input
                                    type="tel"
                                    name="ownerPhone"
                                    value={formData.ownerPhone}
                                    onChange={handleChange}
                                    required
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>

                            {!shopToEdit && (
                                <>
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Owner Email * (Login ID)</label>
                                        <input
                                            type="email"
                                            name="ownerEmail"
                                            value={formData.ownerEmail}
                                            onChange={handleChange}
                                            required
                                            className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Password *</label>
                                        <input
                                            type="text"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 3. Initial Branch/Address Info (Only for creation) */}
                    {!shopToEdit && (
                        <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                            <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                                    <Settings2 size={20} />
                                </div>
                                <h3 className={`text-xl font-bold ${theme.textHeading}`}>Main Branch / Address</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Address Line 1</label>
                                    <input
                                        type="text"
                                        name="line1"
                                        value={formData.address.line1}
                                        onChange={(e) => handleChange(e, 'address')}
                                        className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Address Line 2</label>
                                    <input
                                        type="text"
                                        name="line2"
                                        value={formData.address.line2}
                                        onChange={(e) => handleChange(e, 'address')}
                                        className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.address.city}
                                        onChange={(e) => handleChange(e, 'address')}
                                        className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>State / Province</label>
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="State Name"
                                        value={formData.address.state.name}
                                        onChange={(e) => handleChange(e, 'address', 'state')}
                                        className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}


                    <div className="flex justify-end gap-4 mt-8 pb-12">
                        <button
                            type="button"
                            onClick={onBack}
                            className={`px-8 py-4 ${theme.surfaceBg} border ${theme.borderLight} ${theme.textPrimary} rounded-2xl font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-colors uppercase tracking-widest text-xs`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save size={18} />
                                    {shopToEdit ? 'Save Changes' : 'Create Shop'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShopForm;
