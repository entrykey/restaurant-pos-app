import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    Save,
    Trash2,
    Plus,
    X,
    Calendar,
    Tag,
    ShoppingBag,
    Percent,
    CheckCircle2,
    Loader2,
    Info
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
    offerService,
    itemService,
    categoryService
} from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import CommonSelect from "../../components/ui/CommonSelect";

const OfferForm = () => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId, businessTypeData } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);

    // Form State
    const [offerData, setOfferData] = useState({
        name: "",
        offerType: "PERCENT_DISCOUNT",
        priority: 1,
        startDate: "",
        endDate: "",
        businessTypes: ["RESTAURANT"],
        isActive: true
    });

    const [condition, setCondition] = useState({
        applyOn: "BILL",
        itemIds: [],
        categoryIds: [],
        minQuantity: 1,
        minBillAmount: 0
    });

    const [reward, setReward] = useState({
        rewardType: "PERCENT_DISCOUNT",
        rewardQuantity: 1,
        rewardSelectionStrategy: "CHEAPEST",
        specificItemId: null,
        discountPercent: 0,
        discountAmount: 0
    });

    useEffect(() => {
        fetchMetadata();
        if (isEdit) {
            fetchOffer();
        }
    }, [id, activeBranchId]);

    const fetchMetadata = async () => {
        try {
            const shopId = user?.shopId || user?.shop_id;
            const branchId = activeBranchId || (user?.branchIds?.length ? user.branchIds[0] : null);

            const [itemsData, catsData] = await Promise.all([
                itemService.getItems({
                    limit: 1000,
                    filters: { shopId, branchId }
                }),
                categoryService.getCategories({ shopId, branchId })
            ]);

            const allItems = itemsData.data || [];
            const sellStock = businessTypeData?.features?.sellStockItems ?? true;
            const sellManufactured = businessTypeData?.features?.sellManufacturedItems ?? true;

            const filteredItems = allItems.filter(item => {
                if (item.itemType === "STOCK") return sellStock;
                if (item.itemType === "MANUFACTURED") return sellManufactured;
                return true; // Keep others (SERVICE, etc.) for now unless specified
            });

            setItems(filteredItems);
            setCategories(catsData || []);
        } catch (error) {
            console.error("Failed to fetch metadata:", error);
        }
    };

    const fetchOffer = async () => {
        setIsLoading(true);
        try {
            const data = await offerService.getOfferById(id);
            if (data) {
                setOfferData({
                    name: data.name,
                    offerType: data.offerType,
                    priority: data.priority,
                    startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
                    endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : "",
                    businessTypes: data.businessTypes || ["RESTAURANT"],
                    isActive: data.isActive
                });
                if (data.condition) setCondition(data.condition);
                if (data.reward) setReward(data.reward);
            }
        } catch (error) {
            console.error("Failed to fetch offer:", error);
            alert("Failed to load offer details");
            navigate("/offers");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...offerData,
                condition,
                reward
            };
            if (isEdit) {
                await offerService.updateOffer(id, payload);
            } else {
                await offerService.createOffer({
                    ...payload,
                    shopId: user?.shopId || user?.shop_id,
                    branchId: activeBranchId || (user?.branchIds?.length ? user.branchIds[0] : null)
                });
            }
            navigate("/offers");
        } catch (error) {
            console.error("Failed to save offer:", error);
            alert(error.message || "Failed to save offer");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`h-full flex flex-col items-center justify-center ${theme.pageBg}`}>
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
                <p className={`font-black uppercase tracking-widest text-sm ${theme.textSecondary}`}>Loading Offer Data...</p>
            </div>
        );
    }

    const offerTypes = [
        { value: "BUY_X_GET_Y", label: "Buy X Get Y Free" },
        { value: "PERCENT_DISCOUNT", label: "Percentage Discount" },
        { value: "FLAT_DISCOUNT", label: "Flat Amount Discount" },
        { value: "BILL_VALUE_DISCOUNT", label: "Bill Value Discount" },
        { value: "CATEGORY_DISCOUNT", label: "Category Discount" },
        { value: "COMBO_PRICE", label: "Combo Price" }
    ];

    return (
        <div className={`p-4 md:p-8 h-full flex flex-col ${theme.pageBg} animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto custom-scrollbar`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/offers")}
                        className={`p-3 rounded-2xl ${theme.inputBg} ${theme.textSecondary} hover:${theme.textPrimary} transition-all shadow-md`}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className={`text-2xl md:text-3xl font-black ${theme.textHeading}`}>
                            {isEdit ? "Edit Offer" : "Create New Offer"}
                        </h2>
                        <p className={theme.textSecondary}>{offerData.name || "Untitled Offer"}</p>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl shadow-xl hover:scale-105 transition-all
                        ${theme.buttonBg} ${theme.buttonText} font-black text-sm disabled:opacity-50`}
                >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {isEdit ? "Update Offer" : "Save Offer"}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto w-full space-y-6 pb-20">

                {/* Section: General Information */}
                <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} transition-all hover:shadow-2xl`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-xl bg-indigo-100 text-indigo-600`}>
                            <Tag size={20} />
                        </div>
                        <h3 className={`text-xl font-bold ${theme.textHeading}`}>General Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Offer Name</label>
                            <input
                                required
                                value={offerData.name}
                                onChange={e => setOfferData({ ...offerData, name: e.target.value })}
                                placeholder="e.g. Summer Special Sale"
                                className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Offer Type</label>
                            <CommonSelect
                                options={offerTypes}
                                value={offerData.offerType}
                                onChange={val => setOfferData({ ...offerData, offerType: val })}
                                className="w-full h-[58px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Start Date</label>
                            <div className="relative">
                                <Calendar className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                <input
                                    type="date"
                                    value={offerData.startDate}
                                    onChange={e => setOfferData({ ...offerData, startDate: e.target.value })}
                                    className={`w-full pl-12 p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>End Date</label>
                            <div className="relative">
                                <Calendar className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                <input
                                    type="date"
                                    value={offerData.endDate}
                                    onChange={e => setOfferData({ ...offerData, endDate: e.target.value })}
                                    className={`w-full pl-12 p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Priority (1 is highest)</label>
                            <input
                                type="number"
                                min="1"
                                value={offerData.priority}
                                onChange={e => setOfferData({ ...offerData, priority: parseInt(e.target.value) })}
                                className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Status</label>
                            <div className="flex items-center gap-4 h-[58px]">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div
                                        onClick={() => setOfferData({ ...offerData, isActive: true })}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${offerData.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                                    >
                                        {offerData.isActive && <div className="w-3 h-3 rounded-full bg-green-500" />}
                                    </div>
                                    <span className={`font-bold ${offerData.isActive ? 'text-green-600' : theme.textSecondary}`}>Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div
                                        onClick={() => setOfferData({ ...offerData, isActive: false })}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${!offerData.isActive ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                                    >
                                        {!offerData.isActive && <div className="w-3 h-3 rounded-full bg-red-500" />}
                                    </div>
                                    <span className={`font-bold ${!offerData.isActive ? 'text-red-600' : theme.textSecondary}`}>Inactive</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Conditions */}
                <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-xl bg-orange-100 text-orange-600`}>
                            <ShoppingBag size={20} />
                        </div>
                        <h3 className={`text-xl font-bold ${theme.textHeading}`}>Offer Conditions</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Apply On</label>
                            <CommonSelect
                                options={[
                                    { value: "BILL", label: "Entire Bill" },
                                    { value: "ITEM", label: "Specific Items" },
                                    { value: "CATEGORY", label: "Specific Categories" }
                                ]}
                                value={condition.applyOn}
                                onChange={val => setCondition({ ...condition, applyOn: val })}
                                className="w-full h-[58px]"
                            />
                        </div>

                        {condition.applyOn === "BILL" && (
                            <div className="space-y-2">
                                <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Min Bill Amount</label>
                                <input
                                    type="number"
                                    value={condition.minBillAmount}
                                    onChange={e => setCondition({ ...condition, minBillAmount: parseFloat(e.target.value) })}
                                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                />
                            </div>
                        )}

                        {condition.applyOn === "ITEM" && (
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Select Items</label>
                                <div className="flex flex-wrap gap-2 p-4 border rounded-2xl min-h-[100px] bg-gray-50/50">
                                    {condition.itemIds.map(id => {
                                        const item = items.find(i => i._id === id);
                                        return (
                                            <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs">
                                                {item?.name || "Unknown"}
                                                <X size={14} className="cursor-pointer" onClick={() => setCondition({ ...condition, itemIds: condition.itemIds.filter(iid => iid !== id) })} />
                                            </div>
                                        );
                                    })}
                                    <div className="w-40">
                                        <CommonSelect
                                            placeholder="+ Add Item"
                                            options={items.filter(i => !condition.itemIds.includes(i._id)).map(i => ({ value: i._id, label: i.name }))}
                                            onChange={(val) => {
                                                if (val && !condition.itemIds.includes(val)) {
                                                    setCondition({ ...condition, itemIds: [...condition.itemIds, val] });
                                                }
                                            }}
                                            className="h-10 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Min Quantity per item</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={condition.minQuantity}
                                        onChange={e => setCondition({ ...condition, minQuantity: parseInt(e.target.value) })}
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                    />
                                </div>
                            </div>
                        )}

                        {condition.applyOn === "CATEGORY" && (
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Select Categories</label>
                                <div className="flex flex-wrap gap-2 p-4 border rounded-2xl min-h-[100px] bg-gray-50/50">
                                    {condition.categoryIds.map(id => {
                                        const cat = categories.find(c => c._id === id);
                                        return (
                                            <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl font-bold text-xs">
                                                {cat?.name || "Unknown"}
                                                <X size={14} className="cursor-pointer" onClick={() => setCondition({ ...condition, categoryIds: condition.categoryIds.filter(cid => cid !== id) })} />
                                            </div>
                                        );
                                    })}
                                    <div className="w-40">
                                        <CommonSelect
                                            placeholder="+ Add Category"
                                            options={categories.filter(c => !condition.categoryIds.includes(c._id)).map(c => ({ value: c._id, label: c.name }))}
                                            onChange={(val) => {
                                                if (val && !condition.categoryIds.includes(val)) {
                                                    setCondition({ ...condition, categoryIds: [...condition.categoryIds, val] });
                                                }
                                            }}
                                            className="h-10 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section: Rewards */}
                <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-xl bg-green-100 text-green-600`}>
                            <Percent size={20} />
                        </div>
                        <h3 className={`text-xl font-bold ${theme.textHeading}`}>Offer Reward</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Reward Type</label>
                            <CommonSelect
                                options={[
                                    { value: "PERCENT_DISCOUNT", label: "Percentage Discount" },
                                    { value: "FLAT_DISCOUNT", label: "Flat Amount Discount" },
                                    { value: "FREE_ITEM", label: "Free Item(s)" },
                                    { value: "SET_PRICE", label: "Fixed Set Price" }
                                ]}
                                value={reward.rewardType}
                                onChange={val => setReward({ ...reward, rewardType: val })}
                                className="w-full h-[58px]"
                            />
                        </div>

                        {reward.rewardType === "PERCENT_DISCOUNT" && (
                            <div className="space-y-2">
                                <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Discount Percentage</label>
                                <div className="relative">
                                    <Percent className={`absolute right-4 top-4 ${theme.textSecondary}`} size={20} />
                                    <input
                                        type="number"
                                        max="100"
                                        min="0"
                                        value={reward.discountPercent}
                                        onChange={e => setReward({ ...reward, discountPercent: parseFloat(e.target.value) })}
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                    />
                                </div>
                            </div>
                        )}

                        {reward.rewardType === "FLAT_DISCOUNT" && (
                            <div className="space-y-2">
                                <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Discount Amount</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={reward.discountAmount}
                                    onChange={e => setReward({ ...reward, discountAmount: parseFloat(e.target.value) })}
                                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                />
                            </div>
                        )}

                        {reward.rewardType === "FREE_ITEM" && (
                            <>
                                <div className="space-y-2">
                                    <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Reward Strategy</label>
                                    <CommonSelect
                                        options={[
                                            { value: "SAME_ITEM", label: "Same Item as ordered" },
                                            { value: "SPECIFIC_ITEM", label: "A specific item" },
                                            { value: "CHEAPEST", label: "Cheapest from applied list" },
                                            { value: "HIGHEST", label: "Highest from applied list" }
                                        ]}
                                        value={reward.rewardSelectionStrategy}
                                        onChange={val => setReward({ ...reward, rewardSelectionStrategy: val })}
                                        className="w-full h-[58px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Quantity Free</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={reward.rewardQuantity}
                                        onChange={e => setReward({ ...reward, rewardQuantity: parseInt(e.target.value) })}
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                    />
                                </div>

                                {reward.rewardSelectionStrategy === "SPECIFIC_ITEM" && (
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Select Reward Item</label>
                                        <CommonSelect
                                            options={items.map(i => ({ value: i._id, label: i.name }))}
                                            value={reward.specificItemId}
                                            onChange={val => setReward({ ...reward, specificItemId: val })}
                                            className="w-full h-[58px]"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {reward.rewardType === "SET_PRICE" && (
                            <div className="space-y-2">
                                <label className={`text-sm font-black uppercase ${theme.textSecondary}`}>Fixed Total Price</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={reward.discountAmount}
                                    onChange={e => setReward({ ...reward, discountAmount: parseFloat(e.target.value) })}
                                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                />
                                <p className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                    <Info size={12} /> The total amount for the combo will be fixed to this value.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Feedback */}
                <div className="flex justify-end pt-6">
                    <div className="flex items-center gap-4 p-4 rounded-3xl bg-indigo-50 border border-indigo-100 max-w-md">
                        <CheckCircle2 className="text-indigo-500 shrink-0" size={24} />
                        <p className="text-xs text-indigo-800 font-bold leading-relaxed">
                            Your changes will be applied to all branches within the selected business type. Make sure to double-check the validity dates.
                        </p>
                    </div>
                </div>

            </form>
        </div>
    );
};

export default OfferForm;
