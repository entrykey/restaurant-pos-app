import React, { useState, useEffect } from 'react';
import { ALL_FIELDS } from '../config/itemFields';
import { attributeService, unitService, shopService, categoryService, itemService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { SupplierService } from '../pages/Suppliers/SupplierService';
import { X, Plus, Trash2 } from 'lucide-react';

const ProductForm = ({
    initialValues = {},
    visibleFields = [],
    onSave,
    onCancel,
    title = "Add Item",
    inventoryItems = [],
    showRecipe = true,
    isEditing = false,
}) => {
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const [formData, setFormData] = useState(initialValues);
    const [errors, setErrors] = useState({});

    // Dynamic Attributes & Units
    const [dynamicAttributes, setDynamicAttributes] = useState([]);
    const [units, setUnits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    // itemAttributes format: { [attributeCode]: { value: "", unitId: "" } }
    const [itemAttributes, setItemAttributes] = useState(initialValues.attributes || {});

    // Sync form state whenever a different item is loaded for editing (or when initialValues.attributes is populated)
    const itemId = String(initialValues._id || initialValues.id || '');
    useEffect(() => {
        setFormData(initialValues);
        setItemAttributes(initialValues.attributes || {});
        setIngredients(initialValues.ingredients || []);
    }, [itemId, initialValues?.attributes, initialValues?.ingredients]);

    useEffect(() => {
        const fetchAttributesAndUnits = async () => {
            try {
                // Get shop data to fetch business type/subtype IDs
                let businessTypeId = null;
                let businessSubTypeId = null;

                if (user?.shop_id) {
                    try {
                        const shop = await shopService.getShopById(user.shop_id);
                        businessTypeId = shop?.businessType?._id || shop?.businessType;
                        businessSubTypeId = shop?.subType?._id || shop?.subType;
                    } catch (error) {
                        console.error("Failed to fetch shop data:", error);
                    }
                }

                // Fetch attributes filtered by business type/subtype
                const params = {};
                if (businessTypeId) params.businessTypeId = businessTypeId;
                if (businessSubTypeId) params.businessSubTypeId = businessSubTypeId;

                const [attrsRes, unitsRes, categoriesRes, suppliersRes] = await Promise.all([
                    attributeService.getAttributes(params),
                    unitService.getUnits(),
                    categoryService.getCategories({ shopId: user?.shop_id }),
                    SupplierService.getSuppliers(user?.shop_id)
                ]);

                // Filter active attributes that match the business type/subtype
                setDynamicAttributes(attrsRes.filter(a => a.isActive !== false));
                setUnits(unitsRes);
                setCategories(categoriesRes.filter(c => c.isActive !== false));

                const suppliersData = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.data || []);
                setSuppliers(suppliersData);
            } catch (error) {
                console.error("Failed to load attributes/units", error);
            }
        };

        const fetchStockItems = async () => {
            if (showRecipe && user?.shop_id) {
                try {
                    const response = await itemService.getItems({
                        limit: 1000,
                        filters: {
                            shopid: user.shop_id,
                            branchId: activeBranchId || undefined,
                            itemType: "STOCK"
                        }
                    });
                    setStockItems(response.data || response);
                } catch (error) {
                    console.error("Failed to fetch stock items for recipe:", error);
                }
            }
        };

        fetchAttributesAndUnits();
        fetchStockItems();
    }, [user?.shop_id, activeBranchId, showRecipe]);

    // Recipe / Ingredients State
    const [ingredients, setIngredients] = useState(initialValues.ingredients || []);
    const [selectedRawItem, setSelectedRawItem] = useState("");
    const [ingredientQty, setIngredientQty] = useState("");
    const [ingredientUnitId, setIngredientUnitId] = useState("");

    // Group fields by section for better UI
    const groupedFields = visibleFields.reduce((acc, fieldKey) => {
        const fieldDef = ALL_FIELDS[fieldKey];
        if (!fieldDef) return acc;

        const section = fieldDef.section || "Other";
        if (!acc[section]) acc[section] = [];

        let options = fieldDef.options || [];
        if (fieldKey === "category_id") {
            // Inject dynamically fetched categories
            options = categories.map(c => ({ label: c.name, value: c._id }));
        } else if (fieldKey === "supplier_id") {
            // Inject dynamically fetched suppliers
            options = suppliers.map(s => ({ label: s.name, value: s._id }));
        } else if (fieldKey === "unit_id") {
            options = units.map(u => ({ label: u.name || u.code, value: u._id }));
        }

        acc[section].push({ ...fieldDef, originalKey: fieldKey, options }); // Keep field.key as mapped key
        return acc;
    }, {});

    const handleChange = (fieldKey, value) => {
        setFormData(prev => ({
            ...prev,
            [ALL_FIELDS[fieldKey].key]: value // Use the mapped key name (e.g. product_name -> name)
        }));

        // Clear error on change
        if (errors[fieldKey]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldKey];
                return newErrors;
            });
        }
    };

    const handleAttributeChange = (attrCode, field, value) => {
        setItemAttributes(prev => ({
            ...prev,
            [attrCode]: {
                ...prev[attrCode],
                [field]: value
            }
        }));
    };

    const handleAddIngredient = () => {
        if (!selectedRawItem || !ingredientQty || !ingredientUnitId) return;

        const rawItem = stockItems.find(i => i._id === selectedRawItem || i.id === selectedRawItem);
        if (!rawItem) return;

        const selectedUnitObj = units.find(u => u._id === ingredientUnitId || u.id === ingredientUnitId);
        const unitName = selectedUnitObj ? selectedUnitObj.name : 'Unknown';

        const newIngredient = {
            rawItemId: rawItem.id, // Keep this for UI referencing if needed
            itemId: rawItem.id, // For backend Recipe mapping
            name: rawItem.name,
            quantity: parseFloat(ingredientQty),
            unitId: ingredientUnitId,
            unitName: unitName, // For UI display
        };

        setIngredients([...ingredients, newIngredient]);
        setSelectedRawItem("");
        setIngredientQty("");
        setIngredientUnitId("");
    };

    const handleRemoveIngredient = (index) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const validate = () => {
        const newErrors = {};
        visibleFields.forEach(fieldKey => {
            const field = ALL_FIELDS[fieldKey];
            if (!field) return;

            const value = formData[field.key];
            if (field.required && (value === undefined || value === "" || value === null)) {
                newErrors[fieldKey] = `${field.label} is required`;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSave({
                ...formData,
                ingredients: ingredients, // Include recipe
                attributes: itemAttributes // Include dynamic attributes
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-6 md:p-10 rounded-[50px] w-full max-w-4xl shadow-2xl h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-3xl font-black text-gray-800">{title}</h3>
                    <button onClick={onCancel} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-8">
                    {Object.entries(groupedFields).map(([section, fields]) => (
                        <div key={section} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                            <h4 className="text-lg font-black text-indigo-600 mb-4 border-b pb-2">{section} Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {fields.map(field => {
                                    // Special UI condition: If field is min_stock_alert, check if stock_applicable is true
                                    if (field.originalKey === 'min_stock_alert') {
                                        const isStockApplicable = formData['stockApplicable'] !== false; // defaults to true or uses boolean
                                        if (!isStockApplicable) return null;
                                    }

                                    return (
                                        <div key={field.originalKey} className={field.type === 'textarea' ? 'md:col-span-3' : ''}>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </label>

                                            {field.type === 'select' ? (
                                                <select
                                                    value={formData[field.key] || field.defaultValue || ""}
                                                    onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                    className={`w-full p-4 border-2 rounded-2xl bg-white outline-none font-bold transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-500'
                                                        }`}
                                                >
                                                    <option value="">Select...</option>
                                                    {(field.options || []).map(opt => {
                                                        // Handle both string options array or object {label, value} array dynamically
                                                        const val = typeof opt === 'object' ? opt.value : opt;
                                                        const lbl = typeof opt === 'object' ? opt.label : opt;
                                                        return <option key={val} value={val}>{lbl}</option>;
                                                    })}
                                                </select>
                                            ) : field.type === 'textarea' ? (
                                                <textarea
                                                    value={formData[field.key] || ""}
                                                    onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                    rows={3}
                                                    className={`w-full p-4 border-2 rounded-2xl outline-none font-bold bg-white transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-500'
                                                        }`}
                                                />
                                            ) : field.type === 'boolean' ? (
                                                <div className="flex gap-4 mt-2">
                                                    <button
                                                        onClick={() => handleChange(field.originalKey, true)}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData[field.key] === true
                                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                            : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-indigo-200'
                                                            }`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={() => handleChange(field.originalKey, false)}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData[field.key] === false
                                                            ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                                                            : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-red-200'
                                                            }`}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    value={formData[field.key] !== undefined ? formData[field.key] : ""}
                                                    onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                    className={`w-full p-4 border-2 rounded-2xl outline-none font-bold bg-white transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-500'
                                                        }`}
                                                    placeholder={field.label}
                                                />
                                            )}
                                            {errors[field.originalKey] && (
                                                <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors[field.originalKey]}</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* DYNAMIC ATTRIBUTES SECTION - Filtered by Business Type/Subtype and Category */}
                    {dynamicAttributes.length > 0 && (
                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                            <h4 className="text-lg font-black text-blue-600 mb-4 border-b border-blue-200 pb-2">Item Attributes</h4>
                            <p className="text-sm text-gray-500 mb-4">
                                Dynamic attributes based on your business type/subtype (e.g., Size, Color, Weight).
                                These are configured in Settings → Attribute Settings.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {dynamicAttributes.filter(attr => {
                                    // Filter by category dependency
                                    if (!attr.categoryDependent) return true;
                                    const selectedCategoryId = formData.categoryId; // The value is inside formData.categoryId, not formData.category_id!
                                    const attrCategoryId = attr.categoryId?._id || attr.categoryId;
                                    return selectedCategoryId === attrCategoryId;
                                }).map(attr => (
                                    <div key={attr.code} className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">
                                            {attr.name} {attr.required && <span className="text-red-500">*</span>}
                                        </label>

                                        <div className="flex gap-2">
                                            {/* Attribute Value Input */}
                                            {attr.dataType === 'SELECT' ? (
                                                <select
                                                    value={itemAttributes[attr.code]?.value || ""}
                                                    onChange={(e) => handleAttributeChange(attr.code, 'value', e.target.value)}
                                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-white outline-none font-bold transition-all focus:border-blue-400"
                                                >
                                                    <option value="">Select...</option>
                                                    {(attr.options || []).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : attr.dataType === 'BOOLEAN' ? (
                                                <div className="flex gap-2 w-full">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleAttributeChange(attr.code, 'value', true); }}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${itemAttributes[attr.code]?.value === true
                                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                            : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-blue-200'
                                                            }`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleAttributeChange(attr.code, 'value', false); }}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${itemAttributes[attr.code]?.value === false
                                                            ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                                                            : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-red-200'
                                                            }`}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    type={attr.dataType === 'NUMBER' ? 'number' : attr.dataType === 'DATE' ? 'date' : 'text'}
                                                    value={itemAttributes[attr.code]?.value || ""}
                                                    onChange={(e) => {
                                                        handleAttributeChange(attr.code, 'value', e.target.value);
                                                        // Automatically set the unitId in the item payload if the attribute requires a unit
                                                        if (attr.requiresUnit && attr.unitId) {
                                                            handleAttributeChange(attr.code, 'unitId', attr.unitId._id);
                                                        }
                                                    }}
                                                    className={`w-full p-4 border-2 border-gray-100 rounded-l-2xl outline-none font-bold bg-white transition-all focus:border-blue-400 ${attr.requiresUnit ? 'rounded-r-none border-r-0' : 'rounded-r-2xl'}`}
                                                    placeholder={attr.name}
                                                />
                                            )}

                                            {/* Attribute Unit Selection (Fixed Label based on Attribute Definition) */}
                                            {attr.dataType === 'NUMBER' && attr.requiresUnit && attr.unitId && (
                                                <div className="flex items-center justify-center bg-gray-50 border-2 border-l-0 border-gray-100 rounded-r-2xl px-4 text-xs font-black text-gray-500 uppercase tracking-widest">
                                                    {attr.unitId.code || attr.unitId.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NEW RECIPE SECTION */}
                    {showRecipe && (
                        <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
                            <h4 className="text-lg font-black text-orange-600 mb-4 border-b border-orange-200 pb-2">Recipe / Ingredients</h4>
                            <p className="text-sm text-gray-500 mb-4">Define what raw items are used to make this product.</p>

                            <div className="flex flex-col md:flex-row gap-3 mb-4 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Stock Item</label>
                                    <select
                                        value={selectedRawItem}
                                        onChange={(e) => {
                                            setSelectedRawItem(e.target.value);
                                            // Auto-set unit from raw item if applicable
                                            const item = stockItems.find(i => i._id === e.target.value || i.id === e.target.value);
                                            if (item && item.unitId) {
                                                setIngredientUnitId(item.unitId._id || item.unitId);
                                            }
                                        }}
                                        className="w-full p-3 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-orange-400"
                                    >
                                        <option value="">Select Stock Item</option>
                                        {stockItems.map(item => (
                                            <option key={item._id || item.id} value={item._id || item.id}>{item.name} ({item.unitId?.name || "N/A"})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Qty</label>
                                    <input
                                        type="number"
                                        value={ingredientQty}
                                        onChange={(e) => setIngredientQty(e.target.value)}
                                        placeholder="0"
                                        className="w-full p-3 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-orange-400"
                                    />
                                </div>
                                <div className="w-full md:w-40">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Unit</label>
                                    <select
                                        value={ingredientUnitId}
                                        onChange={(e) => setIngredientUnitId(e.target.value)}
                                        className="w-full p-3 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-orange-400 bg-white"
                                    >
                                        <option value="">Select Unit</option>
                                        {units.map(u => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleAddIngredient}
                                    className="p-3 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            {ingredients.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-[10px] uppercase text-gray-400">
                                            <tr>
                                                <th className="p-3 font-black">Item</th>
                                                <th className="p-3 font-black">Qty</th>
                                                <th className="p-3 font-black">Unit</th>
                                                <th className="p-3 font-black text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-bold text-gray-700">
                                            {ingredients.map((ing, idx) => (
                                                <tr key={idx} className="border-t border-gray-50">
                                                    <td className="p-3">{ing.name}</td>
                                                    <td className="p-3">{ing.quantity}</td>
                                                    <td className="p-3 text-gray-500">{ing.unitName}</td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleRemoveIngredient(idx)}
                                                            className="text-red-400 hover:text-red-600 p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-8 mt-4 border-t border-gray-100 sticky bottom-0 bg-white/95 backdrop-blur-sm pb-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-5 font-black text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-2 w-2/3 py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-lg"
                    >
                        {isEditing ? "Update Product" : "Save Product"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductForm;
