import React, { useState, useEffect } from 'react';
import { Save, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { ALL_FIELDS, getCommonFieldKeys } from '../../config/itemFields';
import { useTheme } from "../../context/ThemeContext";

const InventorySettings = () => {
    const { theme } = useTheme();
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
            // Default: select all common fields
            setSelectedFields(getCommonFieldKeys());
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
        const allKeys = getCommonFieldKeys();
        setSelectedFields(allKeys);
        setIsSaved(false);
    };

    return (
        <div className={`${theme.cardBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-8`}>
            <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-6`}>
                <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                        Inventory Form Configurations
                    </h3>
                    <p className={`text-sm ${theme.textSecondary} mt-1`}>
                        Select which fields to display in the "Add Item" form.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className={`p-3 ${theme.textSecondary} hover:${theme.primaryIconText} hover:${theme.inputBg.replace('bg-', '')} rounded-xl transition-all`}
                        title="Reset to Default"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isSaved
                            ? `${theme.successBg} ${theme.successText}`
                            : `${theme.buttonBg} ${theme.buttonText} hover:${theme.buttonHoverBg.replace('hover:', '')} shadow-lg shadow-indigo-200`
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
                        <div key={section} className={`${theme.inputBg} p-6 rounded-3xl border ${theme.borderLight}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className={`text-lg font-black ${theme.textHeading}`}>{section}</h4>
                                <button
                                    onClick={() => toggleSection(fields)}
                                    className={`text-xs font-bold ${theme.primaryIconText} hover:text-indigo-800 uppercase tracking-wider`}
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
                                                ${isRequired ? `opacity-50 cursor-not-allowed ${theme.inputBorder} ${theme.surfaceBg}` : ''}
                                                ${isSelected && !isRequired ? `${theme.surfaceBg} border-indigo-600 shadow-sm` : `${theme.surfaceBg} border-transparent hover:border-gray-200`}
                                            `}
                                        >
                                            <div className={`
                                                w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                                                ${isSelected ? `${theme.buttonBg} ${theme.buttonText}` : `${theme.inputBorder} text-transparent`}
                                            `}>
                                                <CheckSquare size={14} />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isSelected ? theme.textPrimary : theme.textSecondary}`}>
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
