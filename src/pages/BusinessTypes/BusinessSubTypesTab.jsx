import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert, ShoppingBasket, UtensilsCrossed } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from "../../context/ThemeContext";
import { businessTypesService } from "../../services/api/businessTypes";
import CommonSelect from '../../components/ui/CommonSelect';
import { getErrorMessage } from "../../utils/errorUtils";

const BusinessSubTypesTab = () => {
    const { theme } = useTheme();
    const [subTypes, setSubTypes] = useState([]);
    const [parentTypes, setParentTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({
        displayString: '',
        businessTypeId: '',
        mobileAppFoodSales: false,
        mobileAppNormalSales: true,
    });

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [stRes, ptRes] = await Promise.all([
                businessTypesService.getBusinessSubTypes(),
                businessTypesService.getBusinessTypes(),
            ]);
            setSubTypes(stRes.data || stRes || []);
            setParentTypes(ptRes.data || ptRes || []);
        } catch (error) {
            console.error("Failed to load business subtypes", error);
            toast.error(getErrorMessage(error, "Failed to load business subtypes"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        if (!formData.displayString.trim()) {
            toast.error("Name is required");
            return;
        }
        if (!formData.businessTypeId) {
            toast.error("Parent business type is required");
            return;
        }

        if (!formData.mobileAppFoodSales && !formData.mobileAppNormalSales) {
            return toast.error("Select at least one mobile app sales mode");
        }

        try {
            if (isEditing === 'new') {
                await businessTypesService.createBusinessSubType({
                    displayString: formData.displayString,
                    businessTypeId: formData.businessTypeId,
                    mobileAppFoodSales: formData.mobileAppFoodSales,
                    mobileAppNormalSales: formData.mobileAppNormalSales,
                });
            } else {
                await businessTypesService.updateBusinessSubType(isEditing, {
                    displayString: formData.displayString,
                    businessTypeId: formData.businessTypeId,
                    mobileAppFoodSales: formData.mobileAppFoodSales,
                    mobileAppNormalSales: formData.mobileAppNormalSales,
                });
            }
            toast.success("Business subtype saved successfully!");
            setIsEditing(null);
            fetchData();
        } catch (error) {
            console.error("Save failed", error);
            toast.error(getErrorMessage(error, "Failed to save"));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This may break businesses using this subtype.")) return;
        try {
            await businessTypesService.deleteBusinessSubType(id);
            toast.success("Business subtype deleted successfully!");
            fetchData();
        } catch (error) {
            console.error("Delete failed", error);
            toast.error(getErrorMessage(error, "Failed to delete"));
        }
    };

    const startEdit = (type) => {
        setIsEditing(type._id);
        setFormData({
            displayString: type.displayString,
            businessTypeId: type.businessTypeId?._id || type.businessTypeId,
            mobileAppFoodSales: !!type.mobileAppFoodSales,
            mobileAppNormalSales: type.mobileAppNormalSales !== false,
        });
    };

    const startNew = () => {
        setIsEditing('new');
        setFormData({
            displayString: '',
            businessTypeId: parentTypes[0]?._id || '',
            mobileAppFoodSales: false,
            mobileAppNormalSales: true,
        });
    };

    const getParentName = (id) => {
        const parent = parentTypes.find(p => p._id === (id?._id || id));
        return parent ? parent.displayString : 'Unknown';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-xl font-black ${theme.textHeading}`}>Sub Types</h2>
                    <p className={`text-sm ${theme.textSecondary}`}>Manage sub-categories (e.g. Fine Dining, Casual)</p>
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
                        {isEditing === 'new' ? 'New Sub Type' : 'Edit Sub Type'}
                    </h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Display Name</label>
                                <input
                                    value={formData.displayString}
                                    onChange={e => setFormData({ ...formData, displayString: e.target.value })}
                                    placeholder="e.g. Fine Dining"
                                    className={`w-full p-3 rounded-xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} outline-none focus:border-indigo-500 font-bold transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Parent Business Type</label>
                                <CommonSelect
                                    options={parentTypes.map(p => ({ label: p.displayString, value: p._id }))}
                                    value={formData.businessTypeId}
                                    onChange={(val) => setFormData({ ...formData, businessTypeId: val })}
                                    placeholder="Select Parent Type"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-3 ${theme.textMuted}`}>
                                Mobile App Sales Modes
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.mobileAppNormalSales ? 'border-indigo-500 bg-indigo-50/50' : theme.borderLight}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.mobileAppNormalSales}
                                        onChange={(e) => setFormData({ ...formData, mobileAppNormalSales: e.target.checked })}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                    <ShoppingBasket size={20} className="text-indigo-600 shrink-0" />
                                    <div>
                                        <p className={`font-bold text-sm ${theme.textPrimary}`}>Mobile App Normal Sales</p>
                                        <p className={`text-xs ${theme.textSecondary}`}>Shows in groceries mode (default)</p>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.mobileAppFoodSales ? 'border-orange-500 bg-orange-50/50' : theme.borderLight}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.mobileAppFoodSales}
                                        onChange={(e) => setFormData({ ...formData, mobileAppFoodSales: e.target.checked })}
                                        className="w-4 h-4 accent-orange-600"
                                    />
                                    <UtensilsCrossed size={20} className="text-orange-600 shrink-0" />
                                    <div>
                                        <p className={`font-bold text-sm ${theme.textPrimary}`}>Mobile App Food Sales</p>
                                        <p className={`text-xs ${theme.textSecondary}`}>Shows in dining mode</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
                            >
                                Save Sub Type
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
                            <div key={i} className={`h-24 rounded-2xl animate-pulse ${theme.surfaceBg} border ${theme.borderLight}`}></div>
                        ))
                    ) : subTypes.map(type => (
                        <div key={type._id} className={`p-5 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className={`text-lg font-black ${theme.textHeading}`}>{type.displayString}</h3>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${theme.inputBg} ${theme.textSecondary} border ${theme.borderLight}`}>
                                        {getParentName(type.businessTypeId)}
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {type.mobileAppNormalSales !== false && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
                                                <ShoppingBasket size={10} /> Normal
                                            </span>
                                        )}
                                        {type.mobileAppFoodSales && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">
                                                <UtensilsCrossed size={10} /> Food
                                            </span>
                                        )}
                                    </div>
                                </div>
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
                        </div>
                    ))}
                    {!isLoading && subTypes.length === 0 && (
                        <div className={`col-span-full py-12 text-center border-2 border-dashed ${theme.borderLight} rounded-2xl`}>
                            <ShieldAlert size={48} className={`mx-auto mb-4 ${theme.textMuted} opacity-50`} />
                            <h3 className={`text-lg font-bold ${theme.textPrimary}`}>No Sub Types Found</h3>
                            <p className={`text-sm ${theme.textSecondary} mb-4`}>You should usually have at least one subtype per business type.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BusinessSubTypesTab;
