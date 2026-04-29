import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Check, Search } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import CommonSelect from "../../components/ui/CommonSelect";

import { attributeService, shopService, unitService, categoryService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

const AttributeSettings = () => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { currentShopId, organization } = useApp();
    const isSuperAdmin = user?.isSuperAdmin;

    const [attributes, setAttributes] = useState([]);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [businessSubTypes, setBusinessSubTypes] = useState({});
    const [units, setUnits] = useState([]);
    const [categories, setCategories] = useState([]);

    const [shops, setShops] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        dataType: "TEXT",
        options: "",
        businessType: "", // Single selection for hierarchy
        businessSubType: "", // Optional single selection
        requiresUnit: false,
        unitId: "",
        categoryDependent: false,
        categoryId: "",
        shopDependent: false,
        shopId: ""
    });

    const dataTypes = ["TEXT", "NUMBER", "BOOLEAN", "SELECT", "DATE"];

    useEffect(() => {
        fetchData();
        fetchBusinessTypes();
        fetchUnits();
        if (isSuperAdmin) {
            fetchShops();
        }
    }, [currentShopId, isSuperAdmin]);

    useEffect(() => {
        if (formData.shopId) {
            fetchCategories(formData.shopId);
        } else {
            setCategories([]);
        }
    }, [formData.shopId]);

    const fetchShops = async () => {
        try {
            const data = await shopService.getShops();
            setShops(data);
        } catch (error) {
            toast.error("Failed to fetch shops");
        }
    };

    const fetchCategories = async (shopId = null) => {
        try {
            const params = shopId ? { shopId } : {};
            const data = await categoryService.getCategories(params);
            // Filter only active categories for selection
            setCategories(data.filter(cat => cat.isActive !== false));
        } catch (error) {
            toast.error("Failed to fetch categories");
        }
    };

    const fetchUnits = async () => {
        try {
            const data = await unitService.getUnits();
            setUnits(data);
        } catch (error) {
            toast.error("Failed to fetch units");
        }
    };

    const fetchData = async () => {
        try {
            const params = isSuperAdmin ? {} : { shopId: currentShopId };
            const data = await attributeService.getAttributes(params);
            setAttributes(data);
        } catch (error) {
            toast.error("Failed to fetch attributes");
        }
    };

    const fetchBusinessTypes = async () => {
        try {
            const data = await shopService.getBusinessTypes();
            setBusinessTypes(data);
        } catch (error) {
            toast.error("Failed to fetch business types");
        }
    };

    const handleBusinessTypeChange = async (typeId) => {
        setFormData({ ...formData, businessType: typeId, businessSubType: "", shopId: "", categoryId: "" });

        if (typeId && !businessSubTypes[typeId]) {
            try {
                const subTypes = await shopService.getBusinessSubTypes(typeId);
                setBusinessSubTypes(prev => ({ ...prev, [typeId]: subTypes }));
            } catch (error) {
                toast.error("Failed to fetch sub types");
            }
        }
    };

    const handleSubtypeChange = (subTypeId) => {
        const subTypes = formData.businessSubTypes.includes(subTypeId)
            ? formData.businessSubTypes.filter(id => id !== subTypeId)
            : [...formData.businessSubTypes, subTypeId];
        setFormData({ ...formData, businessSubTypes: subTypes });
    };

    const handleOpenDialog = (attribute = null) => {
        if (attribute) {
            setEditingAttribute(attribute);
            const btId = attribute.businessTypes?.[0]?._id || attribute.businessTypes?.[0] || "";
            const bstId = attribute.businessSubTypes?.[0]?._id || attribute.businessSubTypes?.[0] || "";
            
            setFormData({
                name: attribute.name,
                code: attribute.code,
                dataType: attribute.dataType,
                options: attribute.options?.join(", ") || "",
                businessType: btId,
                businessSubType: bstId,
                requiresUnit: attribute.requiresUnit || false,
                unitId: attribute.unitId?._id || attribute.unitId || "",
                categoryDependent: attribute.categoryDependent || false,
                categoryId: attribute.categoryId?._id || attribute.categoryId || "",
                shopDependent: attribute.shopDependent || false,
                shopId: attribute.shopId?._id || attribute.shopId || ""
            });

            if (btId && !businessSubTypes[btId]) {
                shopService.getBusinessSubTypes(btId).then(subTypes => {
                    setBusinessSubTypes(prev => ({ ...prev, [btId]: subTypes }));
                });
            }
        } else {
            setEditingAttribute(null);
            
            // If shop owner, pre-fill context
            const defaultBT = isSuperAdmin ? "" : (organization?.businessType?._id || organization?.businessType || "");
            const defaultBST = isSuperAdmin ? "" : (organization?.subType?._id || organization?.subType || "");
            const defaultShop = isSuperAdmin ? "" : currentShopId;

            setFormData({
                name: "",
                code: "",
                dataType: "TEXT",
                options: "",
                businessType: defaultBT,
                businessSubType: defaultBST,
                requiresUnit: false,
                unitId: "",
                categoryDependent: false,
                categoryId: "",
                shopDependent: !isSuperAdmin,
                shopId: defaultShop
            });

            if (defaultBT && !businessSubTypes[defaultBT]) {
                shopService.getBusinessSubTypes(defaultBT).then(subTypes => {
                    setBusinessSubTypes(prev => ({ ...prev, [defaultBT]: subTypes }));
                });
            }
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                ...formData,
                businessTypes: formData.businessType ? [formData.businessType] : [],
                businessSubTypes: formData.businessSubType ? [formData.businessSubType] : [],
                options: formData.dataType === "SELECT" ? formData.options.split(",").map(o => o.trim()).filter(Boolean) : [],
                unitId: formData.requiresUnit ? formData.unitId : null,
                categoryId: formData.categoryDependent ? formData.categoryId : null,
                shopId: formData.shopDependent ? formData.shopId : null
            };

            if (editingAttribute) {
                await attributeService.updateAttribute(editingAttribute._id, payload);
                toast.success("Attribute updated successfully");
            } else {
                await attributeService.createAttribute(payload);
                toast.success("Attribute created successfully");
            }

            setIsDialogOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error?.message || "Operation failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this attribute?")) {
            try {
                await attributeService.deleteAttribute(id);
                toast.success("Attribute deleted successfully");
                fetchData();
            } catch (error) {
                toast.error("Failed to delete attribute");
            }
        }
    };

    const columns = [
        { header: "Name", key: "name", className: `font-bold ${theme.textPrimary}` },
        { header: "Code", key: "code", className: `${theme.textSecondary} font-mono text-sm` },
        {
            header: "Type", key: "dataType", render: (value) => (
                <span className={`px-2 py-1 ${theme.inputBg} ${theme.textSecondary} rounded-lg text-xs font-bold`}>{value}</span>
            )
        },
        {
            header: "Unit", key: "unitId", render: (value, row) =>
                row.requiresUnit && value ? <span className={`px-2 py-1 ${theme.infoBg} ${theme.infoText} rounded-lg text-[10px] uppercase font-black tracking-widest`}>{value.code || value.name}</span> : "-"
        },
        {
            header: "Category", key: "categoryId", render: (value, row) =>
                row.categoryDependent && value ? <span className={`px-2 py-1 ${theme.primaryIconBg} ${theme.primaryIconText} rounded-lg text-xs font-bold`}>{value.name}</span> : "-"
        },
        {
            header: "Options", key: "options", render: (value) =>
                value?.length ? value.join(", ") : "-"
        },
        {
            header: "Business Type", key: "businessTypes", render: (value) =>
                value?.[0]?.displayString || value?.[0] || "All"
        },
        {
            header: "Subtype", key: "businessSubTypes", render: (value) =>
                value?.[0]?.displayString || value?.[0] || "All"
        },
        {
            header: "Shop", key: "shopId", render: (value, row) =>
                row.shopDependent && value ? <span className={`px-2 py-1 ${theme.infoBg} ${theme.infoText} rounded-lg text-xs font-bold`}>{value.name}</span> : <span className="text-xs italic opacity-50">Global</span>
        },
        {
            header: "Actions", key: "actions", render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenDialog(row)}
                        className={`p-2 ${theme.textSecondary} hover:${theme.primaryIconText} hover:${theme.primaryIconBg.replace('bg-', '')} rounded-xl transition-colors`}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className={`p-2 ${theme.textSecondary} hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors`}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className={`flex justify-between items-center ${theme.surfaceBg} p-6 rounded-[24px] shadow-sm border ${theme.borderLight}`}>
                <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                        Attributes
                    </h3>
                    <p className={`text-sm font-medium ${theme.textSecondary} mt-1`}>Manage global item attributes (e.g., Size, Color)</p>
                </div>
                <button
                    onClick={() => handleOpenDialog()}
                    className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-xl font-bold ${theme.buttonHoverBg} transition-all flex items-center gap-2 shadow-lg shadow-indigo-200`}
                >
                    <Plus size={20} /> Add Attribute
                </button>
            </div>

            <div className={`${theme.surfaceBg} rounded-[24px] shadow-sm border ${theme.borderLight} overflow-hidden`}>
                <CommonTable columns={columns} data={attributes} />
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
                    <div className={`w-full max-w-2xl sm:max-w-3xl ${theme.surfaceBg} rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto`}>
                        <div className="mb-4">
                            <h2 className={`text-2xl font-black ${theme.textHeading}`}>
                                {editingAttribute ? "Edit Attribute" : "Create Attribute"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Attribute Name</label>
                                    <input
                                        required
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.name}
                                        placeholder="e.g. Color"
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Code (Unique)</label>
                                    <input
                                        required
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.code}
                                        placeholder="e.g. color"
                                        disabled={!!editingAttribute}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Data Type</label>
                                    <CommonSelect
                                        options={dataTypes.map(type => ({ value: type, label: type }))}
                                        value={formData.dataType}
                                        onChange={(val) => setFormData({ ...formData, dataType: val })}
                                        placeholder="Select Type"
                                        labelKey="label"
                                        valueKey="value"
                                    />
                                </div>
                                {formData.dataType === "SELECT" && (
                                    <div className="space-y-2 md:col-span-2">
                                        <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Options (Comma separated)</label>
                                        <input
                                            required
                                            className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                            value={formData.options}
                                            placeholder="Red, Blue, Green"
                                            onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                                        />
                                    </div>
                                )}

                                {formData.dataType === "NUMBER" && (
                                    <div className={`space-y-4 md:col-span-2 p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl`}>
                                        <label className={`flex items-center gap-3 cursor-pointer hover:${theme.primaryIconText} transition-colors`}>
                                            <input
                                                type="checkbox"
                                                checked={formData.requiresUnit}
                                                onChange={(e) => setFormData({ ...formData, requiresUnit: e.target.checked, unitId: e.target.checked ? formData.unitId : "" })}
                                                className={`w-5 h-5 rounded ${theme.inputBorder} text-indigo-600 focus:ring-indigo-500`}
                                            />
                                            <div>
                                                <div className={`font-bold ${theme.textPrimary}`}>Requires Unit</div>
                                                <div className={`text-xs ${theme.textSecondary} font-medium`}>Link a specific measurement unit to this attribute</div>
                                            </div>
                                        </label>

                                        {formData.requiresUnit && (
                                            <div className={`mt-4 pt-4 border-t ${theme.borderLight}`}>
                                                <label className={`text-xs font-black ${theme.textSecondary} uppercase mb-2 block`}>Select Default Unit</label>
                                                <CommonSelect
                                                    options={units}
                                                    value={formData.unitId}
                                                    onChange={(val) => setFormData({ ...formData, unitId: val })}
                                                    placeholder="Select a unit..."
                                                    labelKey="name"
                                                    valueKey="_id"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className={`space-y-6 pt-4 border-t ${theme.borderLight} ${!isSuperAdmin ? "hidden" : ""}`}>
                                <h4 className={`text-lg font-bold ${theme.textHeading}`}>Scope & Dependencies</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Business Type</label>
                                        <CommonSelect
                                            options={businessTypes}
                                            value={formData.businessType}
                                            onChange={handleBusinessTypeChange}
                                            placeholder="Select Business Type..."
                                            labelKey="displayString"
                                            valueKey="_id"
                                        />
                                    </div>

                                    <div className={`space-y-2 ${!formData.businessType ? "opacity-50 pointer-events-none" : ""}`}>
                                        <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Business Subtype (Optional)</label>
                                        <CommonSelect
                                            options={businessSubTypes[formData.businessType] || []}
                                            value={formData.businessSubType}
                                            onChange={(val) => setFormData({ ...formData, businessSubType: val, shopId: "", categoryId: "" })}
                                            placeholder="All Subtypes"
                                            labelKey="displayString"
                                            valueKey="_id"
                                        />
                                    </div>
                                </div>

                                <div className={`space-y-4 p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl ${!formData.businessType ? "opacity-50 pointer-events-none" : ""}`}>
                                    <label className={`flex items-center gap-3 cursor-pointer hover:${theme.primaryIconText} transition-colors`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.shopDependent}
                                            onChange={(e) => setFormData({ ...formData, shopDependent: e.target.checked, shopId: "", categoryDependent: false, categoryId: "" })}
                                            className={`w-5 h-5 rounded ${theme.inputBorder} text-indigo-600 focus:ring-indigo-500`}
                                        />
                                        <div>
                                            <div className={`font-bold ${theme.textPrimary}`}>Shop Dependent</div>
                                            <div className={`text-xs ${theme.textSecondary} font-medium`}>Make this attribute specific to a particular shop</div>
                                        </div>
                                    </label>

                                    {formData.shopDependent && (
                                        <div className={`mt-4 pt-4 border-t ${theme.borderLight}`}>
                                            <label className={`text-xs font-black ${theme.textSecondary} uppercase mb-2 block`}>Select Shop</label>
                                            <CommonSelect
                                                options={shops.filter(s => {
                                                    const sBtId = s.businessType?._id || s.businessType;
                                                    const sBstId = s.subType?._id || s.subType;
                                                    const matchesBt = String(sBtId) === String(formData.businessType);
                                                    const matchesBst = !formData.businessSubType || String(sBstId) === String(formData.businessSubType);
                                                    return matchesBt && matchesBst;
                                                })}
                                                value={formData.shopId}
                                                onChange={(val) => setFormData({ ...formData, shopId: val, categoryId: "" })}
                                                placeholder="Select a shop..."
                                                labelKey="name"
                                                valueKey="_id"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={`space-y-4 p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl ${(!formData.shopId && isSuperAdmin) ? "opacity-50 pointer-events-none" : ""}`}>
                                    <label className={`flex items-center gap-3 cursor-pointer hover:${theme.primaryIconText} transition-colors`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.categoryDependent}
                                            disabled={!formData.shopId && isSuperAdmin}
                                            onChange={(e) => setFormData({ ...formData, categoryDependent: e.target.checked, categoryId: "" })}
                                            className={`w-5 h-5 rounded ${theme.inputBorder} text-indigo-600 focus:ring-indigo-500`}
                                        />
                                        <div>
                                            <div className={`font-bold ${theme.textPrimary}`}>Category Dependent</div>
                                            <div className={`text-xs ${theme.textSecondary} font-medium`}>
                                                {(!formData.shopId && isSuperAdmin) ? "Select 'Shop' first" : "Link this attribute rigidly to a specific item category"}
                                            </div>
                                        </div>
                                    </label>

                                    {formData.categoryDependent && (formData.shopId || !isSuperAdmin) && (
                                        <div className={`mt-4 pt-4 border-t ${theme.borderLight}`}>
                                            <label className={`text-xs font-black ${theme.textSecondary} uppercase mb-2 block`}>Select Category</label>
                                            <CommonSelect
                                                options={categories}
                                                value={formData.categoryId}
                                                onChange={(val) => setFormData({ ...formData, categoryId: val })}
                                                placeholder="Select a category..."
                                                labelKey="name"
                                                valueKey="_id"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {!isSuperAdmin && (
                                <div className={`space-y-4 p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl`}>
                                    <label className={`flex items-center gap-3 cursor-pointer hover:${theme.primaryIconText} transition-colors`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.categoryDependent}
                                            onChange={(e) => setFormData({ ...formData, categoryDependent: e.target.checked, categoryId: "" })}
                                            className={`w-5 h-5 rounded ${theme.inputBorder} text-indigo-600 focus:ring-indigo-500`}
                                        />
                                        <div>
                                            <div className={`font-bold ${theme.textPrimary}`}>Category Dependent</div>
                                            <div className={`text-xs ${theme.textSecondary} font-medium`}>
                                                Link this attribute to a specific category in your shop
                                            </div>
                                        </div>
                                    </label>

                                    {formData.categoryDependent && (
                                        <div className={`mt-4 pt-4 border-t ${theme.borderLight}`}>
                                            <label className={`text-xs font-black ${theme.textSecondary} uppercase mb-2 block`}>Select Category</label>
                                            <CommonSelect
                                                options={categories}
                                                value={formData.categoryId}
                                                onChange={(val) => setFormData({ ...formData, categoryId: val })}
                                                placeholder="Select a category..."
                                                labelKey="name"
                                                valueKey="_id"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={`flex justify-end gap-3 pt-6 border-t ${theme.borderLight}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsDialogOpen(false)}
                                    className={`px-6 py-3 rounded-xl font-bold ${theme.textSecondary} hover:${theme.inputBg.replace('bg-', '')} transition-colors`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !formData.businessType}
                                    className={`${theme.buttonBg} ${theme.buttonText} px-8 py-3 rounded-xl font-bold ${theme.buttonHoverBg} transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200`}
                                >
                                    {isLoading ? "Saving..." : "Save Attribute"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttributeSettings;
