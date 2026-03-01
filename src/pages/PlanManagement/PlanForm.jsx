import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Briefcase, Settings, List, DollarSign, Layers, CheckSquare, Square } from 'lucide-react';
import { planService } from '../../services/api/plans';
import { businessTypesService } from '../../services/api/businessTypes';
import { shopService } from '../../services/api/shops';
import { useTheme } from '../../context/ThemeContext';

const PlanForm = ({ planToEdit, onBack }) => {
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [subtypes, setSubtypes] = useState([]);
    const [shops, setShops] = useState([]);
    const [availableCapabilities, setAvailableCapabilities] = useState([]);
    const [selectedCapabilities, setSelectedCapabilities] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        businessType: '',
        subType: '',
        isCustom: false,
        shopId: '',
        durationDays: 30,
        hasTrial: false,
        trialDurationDays: 14,
        currency: 'INR',
        pricing: [{ cycle: 'monthly', price: 0 }, { cycle: 'yearly', price: 0 }],
        limits: {
            branches: 1,
            users: 5,
            products: 100,
            orders: 1000
        },
        features: '' // we will split by newline
    });

    useEffect(() => {
        fetchBusinessTypes();
        fetchShops();
        if (planToEdit) {
            setFormData(prev => ({
                ...prev,
                name: planToEdit.name || '',
                description: planToEdit.description || '',
                businessType: planToEdit.businessType || '',
                subType: planToEdit.subType || '',
                isCustom: planToEdit.isCustom || false,
                shopId: planToEdit.shopId?._id || planToEdit.shopId || '',
                durationDays: planToEdit.durationDays || 30,
                hasTrial: planToEdit.hasTrial || false,
                trialDurationDays: planToEdit.trialDurationDays || 14,
                currency: planToEdit.currency || 'INR',
                pricing: planToEdit.pricing && planToEdit.pricing.length > 0
                    ? planToEdit.pricing
                    : [{ cycle: 'monthly', price: 0 }, { cycle: 'yearly', price: 0 }],
                limits: {
                    branches: planToEdit.limits?.branches || 1,
                    users: planToEdit.limits?.users || 5,
                    products: planToEdit.limits?.products || 100,
                    orders: planToEdit.limits?.orders || 1000
                },
                features: planToEdit.features?.join('\n') || ''
            }));

            const capsMap = {};
            if (planToEdit.allowedModules) {
                planToEdit.allowedModules.forEach(m => {
                    const modId = m.module?._id || m.module;
                    capsMap[modId] = m.allowedPermissions?.map(p => p?._id || p) || [];
                });
            }
            setSelectedCapabilities(capsMap);

            if (planToEdit.businessType) {
                fetchSubtypes(planToEdit.businessType);
            }
        }
    }, [planToEdit]);

    const fetchBusinessTypes = async () => {
        try {
            const res = await businessTypesService.getBusinessTypes();
            setBusinessTypes(res.data);
        } catch (error) {
            console.error("Failed to fetch business types", error);
        }
    };

    const fetchShops = async () => {
        try {
            const res = await shopService.getAllShops();
            setShops(res.data);
        } catch (error) {
            console.error("Failed to fetch shops", error);
        }
    };

    const fetchSubtypes = async (typeId) => {
        if (!typeId) {
            setSubtypes([]);
            return;
        }
        try {
            const res = await businessTypesService.getBusinessSubTypes();
            const filtered = res.data.filter(s => s.businessTypeId === typeId || s.businessTypeId?._id === typeId);
            setSubtypes(filtered);
        } catch (error) {
            console.error("Failed to fetch subtypes", error);
        }
    };

    useEffect(() => {
        const fetchCaps = async () => {
            if (!formData.businessType || !formData.subType) {
                setAvailableCapabilities([]);
                return;
            }
            try {
                const res = await businessTypesService.getCapabilityBySubtype(formData.businessType, formData.subType);
                if (res.data && res.data.length > 0) {
                    const modules = res.data[0].modules || [];
                    setAvailableCapabilities(modules);

                    // Auto-select all fetched capabilities if it's a new plan
                    // or if the user changed the subtype from the originally edited plan's subtype
                    const isCreatingNew = !planToEdit;
                    const changedSubtype = planToEdit && planToEdit.subType !== formData.subType;

                    if (isCreatingNew || changedSubtype) {
                        const capsMap = {};
                        modules.forEach(m => {
                            const modId = m.module?._id || m.module;
                            capsMap[modId] = m.allowedPermissions?.map(p => p?._id || p) || [];
                        });
                        setSelectedCapabilities(capsMap);
                    }
                } else {
                    setAvailableCapabilities([]);
                }
            } catch (error) {
                console.error("Failed to fetch capabilities", error);
            }
        };
        fetchCaps();
    }, [formData.businessType, formData.subType, planToEdit]);

    const handleTypeChange = (e) => {
        const typeId = e.target.value;
        setFormData(prev => ({ ...prev, businessType: typeId, subType: '' }));
        fetchSubtypes(typeId);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : type === 'number' ? Number(value) : value;

        if (name.startsWith('limits.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                limits: { ...prev.limits, [field]: finalValue }
            }));
            return;
        }

        if (name.startsWith('pricing.')) {
            const [, cycle, field] = name.split('.'); // pricing.monthly.price
            setFormData(prev => {
                const newPricing = prev.pricing.map(p => {
                    if (p.cycle === cycle) {
                        return { ...p, [field]: finalValue };
                    }
                    return p;
                });
                return { ...prev, pricing: newPricing };
            });
            return;
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const allowedModules = Object.keys(selectedCapabilities)
            .map(modId => {
                const availableCap = availableCapabilities.find(c => (c.module?._id || c.module) === modId);
                const validPerms = availableCap?.allowedPermissions?.map(p => p?._id || p) || [];
                return {
                    module: modId,
                    allowedPermissions: selectedCapabilities[modId].filter(pId => validPerms.includes(pId))
                };
            })
            .filter(m => availableCapabilities.some(c => (c.module?._id || c.module) === m.module));

        const payload = {
            ...formData,
            allowedModules,
            features: formData.features.split('\n').filter(f => f.trim() !== '')
        };

        if (!payload.isCustom) {
            delete payload.shopId;
        }

        try {
            if (planToEdit) {
                await planService.updatePlan(planToEdit._id, payload);
            } else {
                await planService.createPlan(payload);
            }
            onBack();
        } catch (error) {
            console.error("Error saving plan:", error);
            alert(error.response?.data?.message || "Failed to save plan");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleModule = (moduleId) => {
        setSelectedCapabilities(prev => {
            const copy = { ...prev };
            if (copy[moduleId]) {
                delete copy[moduleId];
            } else {
                copy[moduleId] = []; // initialize permissions array if checked
            }
            return copy;
        });
    };

    const togglePermission = (moduleId, permId) => {
        setSelectedCapabilities(prev => {
            if (!prev[moduleId]) return prev;
            const copy = { ...prev };
            const hasPerm = copy[moduleId].includes(permId);
            if (hasPerm) {
                copy[moduleId] = copy[moduleId].filter(id => id !== permId);
            } else {
                copy[moduleId] = [...copy[moduleId], permId];
            }
            return copy;
        });
    };

    return (
        <div className={`p-4 md:p-8 h-full overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
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
                                Plan Management
                            </button>
                            <span className={theme.textMuted}>/</span>
                            <span className={theme.textPrimary}>
                                {planToEdit ? 'Edit Plan' : 'Add New'}
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 1. Basic Plan Info */}
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center justify-between border-b ${theme.borderLight} pb-4`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <Briefcase size={20} />
                                </div>
                                <h3 className={`text-xl font-bold ${theme.textHeading}`}>Plan Details</h3>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>Custom Plan</span>
                                <input
                                    type="checkbox"
                                    name="isCustom"
                                    checked={formData.isCustom}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Plan Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>

                            {formData.isCustom && (
                                <div className="md:col-span-2">
                                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Select Shop *</label>
                                    <select
                                        name="shopId"
                                        value={formData.shopId}
                                        onChange={handleChange}
                                        required={formData.isCustom}
                                        className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                    >
                                        <option value="">-- Select Shop --</option>
                                        {shops.map(shop => (
                                            <option key={shop._id} value={shop._id}>{shop.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                    rows="2"
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Target Business Type *</label>
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
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Target Sub Type *</label>
                                <select
                                    name="subType"
                                    value={formData.subType}
                                    onChange={handleChange}
                                    required
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

                    {/* 2. Billing & Pricing */}
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <DollarSign size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Billing configuration</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Cycle Days</label>
                                <select
                                    name="durationDays"
                                    value={formData.durationDays}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                >
                                    <option value={30}>30 Days (Monthly)</option>
                                    <option value={90}>90 Days (Quarterly)</option>
                                    <option value={180}>180 Days (Bi-Annual)</option>
                                    <option value={365}>365 Days (Yearly)</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Currency</label>
                                <input
                                    type="text"
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer mt-4">
                                    <input
                                        type="checkbox"
                                        name="hasTrial"
                                        checked={formData.hasTrial}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>Enable Free Trial</span>
                                </label>
                                {formData.hasTrial && (
                                    <input
                                        type="number"
                                        name="trialDurationDays"
                                        placeholder="Trial Days"
                                        value={formData.trialDurationDays}
                                        onChange={handleChange}
                                        min="1"
                                        className={`w-full p-2 mt-2 border-2 border-transparent ${theme.pageBg} rounded-xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all text-sm`}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed border-gray-200 dark:border-gray-800">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Monthly Price Rate</label>
                                <input
                                    type="number"
                                    name="pricing.monthly.price"
                                    value={formData.pricing.find(p => p.cycle === 'monthly')?.price || 0}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Yearly Price Rate</label>
                                <input
                                    type="number"
                                    name="pricing.yearly.price"
                                    value={formData.pricing.find(p => p.cycle === 'yearly')?.price || 0}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. System Limits & Quotas */}
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                                <Settings size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>System Limits & Quotas</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Branches Limit</label>
                                <input
                                    type="number"
                                    name="limits.branches"
                                    value={formData.limits.branches}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Users Limit</label>
                                <input
                                    type="number"
                                    name="limits.users"
                                    value={formData.limits.users}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Products/Items Limit</label>
                                <input
                                    type="number"
                                    name="limits.products"
                                    value={formData.limits.products}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Max Orders / Month</label>
                                <input
                                    type="number"
                                    name="limits.orders"
                                    value={formData.limits.orders}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Module & Permission Access */}
                    {formData.businessType && formData.subType && (
                        <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                            <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                                    <Layers size={20} />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-bold ${theme.textHeading}`}>Module Access</h3>
                                    <p className={`text-xs ${theme.textSecondary} mt-1`}>Select which modules and permissions are included in this plan.</p>
                                </div>
                            </div>

                            {availableCapabilities.length === 0 ? (
                                <p className={`text-sm py-4 italic ${theme.textMuted}`}>No capabilities have been mapped for this Business Type/SubType combination yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {availableCapabilities.map(cap => {
                                        const modObj = cap.module || {};
                                        const modId = modObj._id || modObj;
                                        const isChecked = !!selectedCapabilities[modId];
                                        const perms = cap.allowedPermissions || [];

                                        return (
                                            <div
                                                key={modId}
                                                className={`relative overflow-hidden p-[22px] border-2 rounded-2xl transition-all duration-300 shadow-sm ${isChecked
                                                    ? `border-indigo-500/60 bg-white dark:border-indigo-500/60 dark:bg-indigo-900/40 shadow-indigo-100 dark:shadow-none translate-y-[-2px]`
                                                    : `border-transparent ${theme.surfaceBg} hover:border-indigo-300 dark:hover:border-indigo-700/50 hover:shadow-md`
                                                    }`}
                                            >
                                                <div
                                                    className="flex flex-col gap-1 cursor-pointer select-none relative z-10"
                                                    onClick={() => toggleModule(modId)}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`mt-[3px] transition-all duration-300 ${isChecked ? 'text-indigo-600 dark:text-indigo-400 opacity-100 scale-100 drop-shadow-sm' : 'text-gray-400 dark:text-gray-500 opacity-60 scale-95 hover:scale-100'}`}>
                                                            {isChecked ? <CheckSquare size={22} className="stroke-[2.5]" /> : <Square size={22} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className={`font-black tracking-wide text-[15px] block transition-colors duration-300 leading-none ${isChecked ? 'text-gray-900 dark:text-white' : theme.textPrimary}`}>
                                                                {cap.customLabel || modObj.name || 'Unknown Module'}
                                                            </span>
                                                            <span className={`text-[10px] uppercase font-black tracking-widest mt-1.5 block transition-colors duration-300 ${isChecked ? 'text-indigo-600 dark:text-indigo-400' : theme.textMuted}`}>
                                                                {modObj.key || modId}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`transition-all duration-500 overflow-hidden ${isChecked ? 'max-h-[800px] opacity-100 mt-5' : 'max-h-0 opacity-0 mt-0 pointer-events-none'}`}>
                                                    <div className="relative pl-[11px]">
                                                        {/* Vertical line connector */}
                                                        <div className="absolute left-[22px] top-[-8px] bottom-[14px] w-[2px] bg-indigo-200 dark:bg-indigo-800/60 rounded-full" />

                                                        <div className="flex flex-col gap-2.5 pl-[30px]">
                                                            {perms.length > 0 ? perms.map((permObj, idx) => {
                                                                const pId = permObj._id || permObj;
                                                                const pName = permObj.name || 'Unknown Permission';
                                                                const isPermChecked = selectedCapabilities[modId]?.includes(pId);

                                                                return (
                                                                    <div
                                                                        key={pId}
                                                                        className="flex items-center gap-3 cursor-pointer select-none group relative py-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg -ml-2 pl-2 transition-colors pr-2"
                                                                        onClick={() => togglePermission(modId, pId)}
                                                                    >
                                                                        {/* Horizontal line connector */}
                                                                        <div className={`absolute -left-[20px] top-[14px] w-4 h-[2px] rounded-full transition-colors duration-300 ${isPermChecked ? 'bg-indigo-500 dark:bg-indigo-500' : 'bg-indigo-200 dark:bg-indigo-800/60'}`} />

                                                                        <div className={`flex items-center justify-center w-[16px] h-[16px] rounded-[4px] border-[2px] transition-all duration-300 relative z-10 ${isPermChecked ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500 shadow-sm shadow-indigo-200 dark:shadow-none' : `bg-white dark:bg-slate-900 border-gray-300 dark:border-gray-600 group-hover:border-indigo-400 dark:group-hover:border-indigo-600`}`}>
                                                                            <CheckSquare size={13} className={`stroke-[3.5] transition-all duration-300 absolute ${isPermChecked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                                                                        </div>

                                                                        <span className={`text-[12px] font-bold tracking-wide transition-colors duration-300 mt-0.5 ${isPermChecked ? 'text-gray-900 dark:text-gray-100' : theme.textSecondary}`}>
                                                                            {pName}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            }) : (
                                                                <div className="flex items-center gap-3 relative py-2 -ml-2 pl-2">
                                                                    <div className="absolute -left-[20px] top-[18px] w-4 h-[2px] rounded-full bg-indigo-200 dark:bg-indigo-800/60" />
                                                                    <span className="text-[11px] font-bold italic text-indigo-500 dark:text-indigo-400">Core module only (No sub-permissions)</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. Display Features List */}
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                <List size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Marketing Features</h3>
                        </div>
                        <div>
                            <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Feature Highlights (One per line)</label>
                            <textarea
                                name="features"
                                value={formData.features}
                                onChange={handleChange}
                                placeholder="E.g.&#10;Unlimited Cloud Storage&#10;24/7 Priority Support&#10;Custom Domain"
                                className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all min-h-[120px] leading-relaxed`}
                            />
                        </div>
                    </div>

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
                                    {planToEdit ? 'Save Changes' : 'Create Plan'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlanForm;
