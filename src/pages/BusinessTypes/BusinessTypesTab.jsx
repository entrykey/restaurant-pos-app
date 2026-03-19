import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";
import { businessTypesService } from "../../services/api/businessTypes";

const BusinessTypesTab = () => {
    const { theme } = useTheme();
    const [businessTypes, setBusinessTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({ displayString: '', features: {} });

    // Initial default features per backend
    const defaultFeatures = {
        inventory: true,
        purchase: true,
        sales: true,
        dining: false,
        production: false,
        reservation: false,
        serialTracking: false,
        serviceManagement: false,
        sellStockItems: true,
        sellManufacturedItems: true,
        sellTradeItems: true
    };

    const fetchBusinessTypes = async () => {
        setIsLoading(true);
        try {
            const res = await businessTypesService.getBusinessTypes();
            setBusinessTypes(res.data || []);
        } catch (error) {
            console.error("Failed to fetch business types", error);
            alert("Error loading business types");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBusinessTypes();
    }, []);

    const handleFeatureChange = (featureKey) => {
        setFormData(prev => ({
            ...prev,
            features: {
                ...prev.features,
                [featureKey]: !prev.features[featureKey]
            }
        }));
    };

    const handleSave = async () => {
        if (!formData.displayString.trim()) {
            return alert("Name is required");
        }

        try {
            if (isEditing === 'new') {
                await businessTypesService.createBusinessType({
                    displayString: formData.displayString,
                    features: formData.features
                });
            } else {
                await businessTypesService.updateBusinessType(isEditing, {
                    displayString: formData.displayString,
                    features: formData.features
                });
            }
            setIsEditing(null);
            fetchBusinessTypes();
        } catch (error) {
            console.error("Save failed", error);
            alert(error.response?.data?.message || "Failed to save");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This may break existing businesses linked to this type!")) return;
        try {
            await businessTypesService.deleteBusinessType(id);
            fetchBusinessTypes();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete");
        }
    };

    const startEdit = (type) => {
        setIsEditing(type._id);
        setFormData({
            displayString: type.displayString,
            features: { ...defaultFeatures, ...type.features }
        });
    };

    const startNew = () => {
        setIsEditing('new');
        setFormData({
            displayString: '',
            features: { ...defaultFeatures }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-xl font-black ${theme.textHeading}`}>Root Business Types</h2>
                    <p className={`text-sm ${theme.textSecondary}`}>Manage the core business categories (e.g. RESTAURANT, RETAIL)</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={startNew}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <Plus size={18} /> Add New
                    </button>
                )}
            </div>

            {isEditing && (
                <div className={`p-6 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-lg transition-all animate-in slide-in-from-top-4`}>
                    <h3 className={`text-lg font-bold mb-4 ${theme.textPrimary}`}>
                        {isEditing === 'new' ? 'New Business Type' : 'Edit Business Type'}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Display Name</label>
                            <input
                                value={formData.displayString}
                                onChange={e => setFormData({ ...formData, displayString: e.target.value })}
                                placeholder="e.g. Restaurant"
                                className={`w-full p-3 rounded-xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} outline-none focus:border-indigo-500 font-bold transition-all`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Global Features</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.keys(defaultFeatures).map(key => (
                                    <label key={key}
                                        onClick={() => handleFeatureChange(key)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border ${theme.borderLight} ${theme.inputBg} cursor-pointer hover:border-indigo-300 transition-colors`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${formData.features[key] ? 'bg-indigo-600 border-indigo-600 text-white' : `${theme.inputBorder} ${theme.inputBg}`}`}>
                                            {formData.features[key] && <Check size={14} strokeWidth={3} />}
                                        </div>
                                        <span className={`text-sm font-bold capitalize ${theme.textPrimary}`}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
                            >
                                Save Business Type
                            </button>
                            <button
                                onClick={() => setIsEditing(null)}
                                className={`px-6 py-3 font-bold rounded-xl border-2 ${theme.borderLight} ${theme.textSecondary} hover:${theme.textPrimary} hover:opacity-80 transition-opacity`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className={`h-40 rounded-2xl animate-pulse ${theme.surfaceBg} border ${theme.borderLight}`}></div>
                        ))
                    ) : businessTypes.map(type => (
                        <div key={type._id} className={`p-5 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className={`text-lg font-black ${theme.textHeading}`}>{type.displayString}</h3>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => startEdit(type)}
                                        className={`p-2 rounded-lg text-gray-400 hover:text-indigo-500 hover:opacity-80 transition-opacity`}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(type._id)}
                                        className={`p-2 rounded-lg text-gray-400 hover:text-red-500 hover:opacity-80 transition-opacity`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {Object.entries(type.features || {}).filter(([_, val]) => val).map(([key]) => (
                                    <span key={key} className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded ${theme.primaryIconBg} ${theme.primaryIconText}`}>
                                        {key}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {!isLoading && businessTypes.length === 0 && (
                        <div className={`col-span-full py-12 text-center border-2 border-dashed ${theme.borderLight} rounded-2xl`}>
                            <ShieldAlert size={48} className={`mx-auto mb-4 ${theme.textMuted} opacity-50`} />
                            <h3 className={`text-lg font-bold ${theme.textPrimary}`}>No Business Types Found</h3>
                            <p className={`text-sm ${theme.textSecondary} mb-4`}>Start by creating your first business type category.</p>
                            <button
                                onClick={startNew}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={18} /> Create First Type
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BusinessTypesTab;
