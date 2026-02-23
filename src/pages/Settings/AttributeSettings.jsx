import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Check, Search } from "lucide-react";
import CommonTable from "../../components/CommonTable";

import { attributeService, shopService, unitService, categoryService } from "../../services/api";
import { toast } from "react-hot-toast";

const AttributeSettings = () => {
    const [attributes, setAttributes] = useState([]);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [businessSubTypes, setBusinessSubTypes] = useState({});
    const [units, setUnits] = useState([]);
    const [categories, setCategories] = useState([]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        dataType: "TEXT",
        options: "",
        businessTypes: [],
        businessSubTypes: [],
        requiresUnit: false,
        unitId: "",
        categoryDependent: false,
        categoryId: ""
    });

    const dataTypes = ["TEXT", "NUMBER", "BOOLEAN", "SELECT", "DATE"];

    useEffect(() => {
        fetchData();
        fetchBusinessTypes();
        fetchUnits();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await categoryService.getCategories();
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
            const data = await attributeService.getAttributes();
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
        const types = formData.businessTypes.includes(typeId)
            ? formData.businessTypes.filter(id => id !== typeId)
            : [...formData.businessTypes, typeId];

        setFormData({ ...formData, businessTypes: types });

        // Fetch sub types if selected and not already fetched
        if (!businessSubTypes[typeId] && !formData.businessTypes.includes(typeId)) {
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
            setFormData({
                name: attribute.name,
                code: attribute.code,
                dataType: attribute.dataType,
                options: attribute.options?.join(", ") || "",
                businessTypes: attribute.businessTypes?.map(bt => bt._id || bt) || [],
                businessSubTypes: attribute.businessSubTypes?.map(bst => bst._id || bst) || [],
                requiresUnit: attribute.requiresUnit || false,
                unitId: attribute.unitId?._id || attribute.unitId || "",
                categoryDependent: attribute.categoryDependent || false,
                categoryId: attribute.categoryId?._id || attribute.categoryId || ""
            });

            // Pre-fetch subtypes for existing business types
            attribute.businessTypes?.forEach(async (bt) => {
                const id = bt._id || bt;
                if (!businessSubTypes[id]) {
                    const subTypes = await shopService.getBusinessSubTypes(id);
                    setBusinessSubTypes(prev => ({ ...prev, [id]: subTypes }));
                }
            });
        } else {
            setEditingAttribute(null);
            setFormData({
                name: "",
                code: "",
                dataType: "TEXT",
                options: "",
                businessTypes: [],
                businessSubTypes: [],
                requiresUnit: false,
                unitId: "",
                categoryDependent: false,
                categoryId: ""
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                ...formData,
                options: formData.dataType === "SELECT" ? formData.options.split(",").map(o => o.trim()).filter(Boolean) : [],
                unitId: formData.requiresUnit ? formData.unitId : null,
                categoryId: formData.categoryDependent ? formData.categoryId : null
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
        { header: "Name", key: "name", className: "font-bold text-gray-800" },
        { header: "Code", key: "code", className: "text-gray-500 font-mono text-sm" },
        {
            header: "Type", key: "dataType", render: (value) => (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">{value}</span>
            )
        },
        {
            header: "Unit", key: "unitId", render: (value, row) =>
                row.requiresUnit && value ? <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] uppercase font-black tracking-widest">{value.code || value.name}</span> : "-"
        },
        {
            header: "Category", key: "categoryId", render: (value, row) =>
                row.categoryDependent && value ? <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold">{value.name}</span> : "-"
        },
        {
            header: "Options", key: "options", render: (value) =>
                value?.length ? value.join(", ") : "-"
        },
        {
            header: "Business Types", key: "businessTypes", render: (value) =>
                value?.map(bt => bt.displayString || bt).join(", ") || "-"
        },
        {
            header: "Actions", key: "actions", render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenDialog(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        Attributes
                    </h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">Manage global item attributes (e.g., Size, Color)</p>
                </div>
                <button
                    onClick={() => handleOpenDialog()}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                >
                    <Plus size={20} /> Add Attribute
                </button>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                <CommonTable columns={columns} data={attributes} />
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-2xl sm:max-w-3xl bg-white rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <div className="mb-4">
                            <h2 className="text-2xl font-black text-gray-800">
                                {editingAttribute ? "Edit Attribute" : "Create Attribute"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Attribute Name</label>
                                    <input
                                        required
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={formData.name}
                                        placeholder="e.g. Color"
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Code (Unique)</label>
                                    <input
                                        required
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={formData.code}
                                        placeholder="e.g. color"
                                        disabled={!!editingAttribute}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Data Type</label>
                                    <select
                                        required
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={formData.dataType}
                                        onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                                    >
                                        {dataTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                {formData.dataType === "SELECT" && (
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-gray-400 uppercase">Options (Comma separated)</label>
                                        <input
                                            required
                                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                            value={formData.options}
                                            placeholder="Red, Blue, Green"
                                            onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                                        />
                                    </div>
                                )}

                                {formData.dataType === "NUMBER" && (
                                    <div className="space-y-4 md:col-span-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                        <label className="flex items-center gap-3 cursor-pointer hover:text-indigo-600 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.requiresUnit}
                                                onChange={(e) => setFormData({ ...formData, requiresUnit: e.target.checked, unitId: e.target.checked ? formData.unitId : "" })}
                                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <div className="font-bold text-gray-800">Requires Unit</div>
                                                <div className="text-xs text-gray-500 font-medium">Link a specific measurement unit to this attribute</div>
                                            </div>
                                        </label>

                                        {formData.requiresUnit && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Select Default Unit</label>
                                                <select
                                                    required={formData.requiresUnit}
                                                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                                    value={formData.unitId}
                                                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                                                >
                                                    <option value="">Select a unit...</option>
                                                    {units.map(unit => (
                                                        <option key={unit._id} value={unit._id}>{unit.name} ({unit.code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-4 md:col-span-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <label className="flex items-center gap-3 cursor-pointer hover:text-indigo-600 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.categoryDependent}
                                            onChange={(e) => setFormData({ ...formData, categoryDependent: e.target.checked, categoryId: e.target.checked ? formData.categoryId : "" })}
                                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-bold text-gray-800">Category Dependent</div>
                                            <div className="text-xs text-gray-500 font-medium">Link this attribute rigidly to a specific item category</div>
                                        </div>
                                    </label>

                                    {formData.categoryDependent && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Select Category</label>
                                            <select
                                                required={formData.categoryDependent}
                                                className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                                value={formData.categoryId}
                                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                            >
                                                <option value="">Select a category...</option>
                                                {categories.map(cat => (
                                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h4 className="text-lg font-bold">Applies to Business Types</h4>
                                <div className="space-y-4">
                                    {businessTypes.map(bt => (
                                        <div key={bt._id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <label
                                                className="flex items-center gap-3 cursor-pointer mb-2"
                                                onClick={() => handleBusinessTypeChange(bt._id)}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.businessTypes.includes(bt._id)
                                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                                    : "border-gray-300 hover:border-indigo-400 bg-white"
                                                    }`}>
                                                    {formData.businessTypes.includes(bt._id) && <Check size={14} strokeWidth={4} />}
                                                </div>
                                                <span className="font-bold text-gray-800 text-lg">{bt.displayString}</span>
                                            </label>

                                            {/* Show subtypes if business type is selected */}
                                            {formData.businessTypes.includes(bt._id) && businessSubTypes[bt._id] && businessSubTypes[bt._id].length > 0 && (
                                                <div className="pl-9 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {businessSubTypes[bt._id].map(bst => (
                                                        <label
                                                            key={bst._id}
                                                            className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSubtypeChange(bst._id);
                                                            }}
                                                        >
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.businessSubTypes.includes(bst._id)
                                                                ? "bg-indigo-500 border-indigo-500 text-white"
                                                                : "border-gray-300 hover:border-indigo-400 bg-white"
                                                                }`}>
                                                                {formData.businessSubTypes.includes(bst._id) && <Check size={12} strokeWidth={4} />}
                                                            </div>
                                                            <span className="font-semibold text-gray-600 text-sm">{bst.displayString}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || formData.businessTypes.length === 0}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200"
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
