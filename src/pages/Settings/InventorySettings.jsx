import React, { useState, useEffect } from 'react';
import { Save, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { ALL_FIELDS, getVisibleFieldKeys } from '../../config/itemFields';

const InventorySettings = () => {
    // Default to all fields if nothing saved
    const [selectedFields, setSelectedFields] = useState([]);
    const [isSaved, setIsSaved] = useState(false);

    // Group fields for display
    const groupedFields = Object.entries(ALL_FIELDS).reduce((acc, [key, field]) => {
        const section = field.section || "Other";
        if (!acc[section]) acc[section] = [];
        acc[section].push({ ...field, key });
        return acc;
    }, {});

    useEffect(() => {
        const saved = localStorage.getItem('visibleInventoryFields');
        if (saved) {
            setSelectedFields(JSON.parse(saved));
        } else {
            // Default: select all
            setSelectedFields(getVisibleFieldKeys());
        }
    }, []);

    const toggleField = (key) => {
        setSelectedFields(prev => {
            if (prev.includes(key)) {
                return prev.filter(k => k !== key);
            } else {
                return [...prev, key];
            }
        });
        setIsSaved(false);
    };

    const toggleSection = (sectionFields) => {
        const allKeys = sectionFields.map(f => f.key);
        const allSelected = allKeys.every(k => selectedFields.includes(k));

        if (allSelected) {
            // Deselect all in section
            setSelectedFields(prev => prev.filter(k => !allKeys.includes(k)));
        } else {
            // Select all in section
            setSelectedFields(prev => [...new Set([...prev, ...allKeys])]);
        }
        setIsSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem('visibleInventoryFields', JSON.stringify(selectedFields));
        setIsSaved(true);
        // Dispatch custom event to notify listeners (like Inventory page if open)
        window.dispatchEvent(new Event('inventoryFieldsUpdated'));

        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleReset = () => {
        const allKeys = getVisibleFieldKeys();
        setSelectedFields(allKeys);
        setIsSaved(false);
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-8">
            <div className="flex justify-between items-center border-b pb-6">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        Inventory Form Configurations
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Select which fields to display in the "Add Item" form.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Reset to Default"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isSaved
                                ? "bg-green-100 text-green-700"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                            }`}
                    >
                        {isSaved ? "Saved!" : <><Save size={18} /> Save Settings</>}
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {Object.entries(groupedFields).map(([section, fields]) => {
                    const allSectionSelected = fields.every(f => selectedFields.includes(f.key));

                    return (
                        <div key={section} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-black text-indigo-900">{section}</h4>
                                <button
                                    onClick={() => toggleSection(fields)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                                >
                                    {allSectionSelected ? "Deselect Section" : "Select Section"}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {fields.map(field => {
                                    const isSelected = selectedFields.includes(field.key);
                                    const isRequired = field.required; // Cannot deselect required fields logic could go here

                                    return (
                                        <div
                                            key={field.key}
                                            onClick={() => !isRequired && toggleField(field.key)}
                                            className={`
                                                flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none
                                                ${isRequired ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-100' : ''}
                                                ${isSelected && !isRequired ? 'bg-white border-indigo-600 shadow-sm' : 'bg-white border-transparent hover:border-gray-200'}
                                            `}
                                        >
                                            <div className={`
                                                w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                                                ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-transparent'}
                                            `}>
                                                <CheckSquare size={14} />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                                                    {field.label}
                                                </p>
                                                {isRequired && <span className="text-[10px] text-red-400 font-bold uppercase">Required</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InventorySettings;
