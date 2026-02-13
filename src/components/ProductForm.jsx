import React, { useState, useEffect } from 'react';
import { ALL_FIELDS } from '../config/itemFields';
import { X, Plus, Trash2 } from 'lucide-react';

const ProductForm = ({
    initialValues = {},
    visibleFields = [],
    onSave,
    onCancel,
    title = "Add Item",
    inventoryItems = [], // List of raw items for recipe
    showRecipe = true
}) => {
    const [formData, setFormData] = useState(initialValues);
    const [errors, setErrors] = useState({});

    // Recipe / Ingredients State
    const [ingredients, setIngredients] = useState(initialValues.ingredients || []);
    const [selectedRawItem, setSelectedRawItem] = useState("");
    const [ingredientQty, setIngredientQty] = useState("");
    const [ingredientUnit, setIngredientUnit] = useState("unit");

    // Group fields by section for better UI
    const groupedFields = visibleFields.reduce((acc, fieldKey) => {
        const fieldDef = ALL_FIELDS[fieldKey];
        if (!fieldDef) return acc;

        const section = fieldDef.section || "Other";
        if (!acc[section]) acc[section] = [];
        acc[section].push({ ...fieldDef, key: fieldKey }); // Ensure key is preserved
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

    const handleAddIngredient = () => {
        if (!selectedRawItem || !ingredientQty) return;

        const rawItem = inventoryItems.find(i => i.id === selectedRawItem);
        if (!rawItem) return;

        const newIngredient = {
            rawItemId: rawItem.id,
            name: rawItem.name,
            quantity: parseFloat(ingredientQty),
            unit: ingredientUnit,
            cost: (rawItem.costPerUnit / ((rawItem.weightUnit || rawItem.unit) === ingredientUnit ? 1 : 1)) * parseFloat(ingredientQty) // Simple cost calc
        };

        setIngredients([...ingredients, newIngredient]);
        setSelectedRawItem("");
        setIngredientQty("");
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
                ingredients: ingredients // Include recipe
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
                                {fields.map(field => (
                                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-3' : ''}>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>

                                        {field.type === 'select' ? (
                                            <select
                                                value={formData[field.key] || field.defaultValue || ""}
                                                onChange={(e) => handleChange(field.key, e.target.value)}
                                                className={`w-full p-4 border-2 rounded-2xl bg-white outline-none font-bold transition-all ${errors[field.key] ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-500'
                                                    }`}
                                            >
                                                {field.options.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'textarea' ? (
                                            <textarea
                                                value={formData[field.key] || ""}
                                                onChange={(e) => handleChange(field.key, e.target.value)}
                                                rows={3}
                                                className={`w-full p-4 border-2 rounded-2xl outline-none font-bold bg-white transition-all ${errors[field.key] ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-500'
                                                    }`}
                                            />
                                        ) : field.type === 'boolean' ? (
                                            <div className="flex gap-4 mt-2">
                                                <button
                                                    onClick={() => handleChange(field.key, true)}
                                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData[field.key] === true
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                        : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-indigo-200'
                                                        }`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => handleChange(field.key, false)}
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
                                                onChange={(e) => handleChange(field.key, e.target.value)}
                                                className={`w-full p-4 border-2 rounded-2xl outline-none font-bold bg-white transition-all ${errors[field.key] ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-indigo-500'
                                                    }`}
                                                placeholder={field.label}
                                            />
                                        )}
                                        {errors[field.key] && (
                                            <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors[field.key]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* NEW RECIPE SECTION */}
                    {showRecipe && (
                        <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
                            <h4 className="text-lg font-black text-orange-600 mb-4 border-b border-orange-200 pb-2">Recipe / Ingredients</h4>
                            <p className="text-sm text-gray-500 mb-4">Define what raw items are used to make this product.</p>

                            <div className="flex flex-col md:flex-row gap-3 mb-4 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Raw Item</label>
                                    <select
                                        value={selectedRawItem}
                                        onChange={(e) => {
                                            setSelectedRawItem(e.target.value);
                                            // Auto-set unit from raw item
                                            const item = inventoryItems.find(i => i.id === e.target.value);
                                            if (item) setIngredientUnit(item.weightUnit || item.unit);
                                        }}
                                        className="w-full p-3 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-orange-400"
                                    >
                                        <option value="">Select Ingredient</option>
                                        {inventoryItems.map(item => (
                                            <option key={item.id} value={item.id}>{item.name} ({item.weightUnit || item.unit})</option>
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
                                <div className="w-full md:w-24">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Unit</label>
                                    <input
                                        type="text"
                                        value={ingredientUnit} // Read-only mostly or editable
                                        onChange={(e) => setIngredientUnit(e.target.value)}
                                        className="w-full p-3 border-2 border-gray-100 rounded-xl font-bold outline-none focus:border-orange-400 bg-gray-50"
                                    />
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
                                                    <td className="p-3 text-gray-500">{ing.unit}</td>
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
                        Save Product
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductForm;
