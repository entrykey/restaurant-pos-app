import React, { useState, useEffect } from "react";
import { X, Building2, Check } from "lucide-react";
import {
    BUSINESS_TYPES,
    BUSINESS_SUBTYPES,
    MODULE_LABELS,
    getDefaultModules,
    getAllModules,
} from "../config/businessTypes";
import { ROUTE_ACCESS } from "../config/permissionStructure";

const BusinessTypeModal = ({
    isOpen,
    onClose,
    businessType,
    businessSubtype,
    enabledModules,
    onSave,
}) => {
    const [selectedType, setSelectedType] = useState(businessType);
    const [selectedSubtype, setSelectedSubtype] = useState(businessSubtype);

    useEffect(() => {
        if (isOpen) {
            setSelectedType(businessType);
            setSelectedSubtype(businessSubtype);
        }
    }, [isOpen, businessType, businessSubtype]);

    if (!isOpen) return null;

    const handleSave = () => {
        // Get hardcoded defaults for the selected type/subtype
        const defaults = getDefaultModules(selectedType, selectedSubtype);

        // Ensure all module keys are explicitly set
        const normalizedModules = getAllModules().reduce((acc, key) => {
            acc[key] = defaults[key] === true;
            return acc;
        }, {});

        onSave(selectedType, selectedSubtype, normalizedModules);
        onClose();
    };

    const availableSubtypes = BUSINESS_SUBTYPES[selectedType] || [];
    const allModules = getAllModules();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div
                className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-800">Business Type & Modules</h3>
                            <p className="text-sm text-gray-500">Select business category and enable modules</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Business Type Selection */}
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase block mb-3">Business Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(BUSINESS_TYPES).map(([key, value]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        setSelectedType(value);
                                        const firstSubtype = BUSINESS_SUBTYPES[value]?.[0]?.id;
                                        if (firstSubtype) setSelectedSubtype(firstSubtype);
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedType === value
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="font-bold capitalize">{value}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Business Subtype Selection */}
                    {availableSubtypes.length > 0 && (
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase block mb-3">Business Subtype</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {availableSubtypes.map((subtype) => (
                                    <button
                                        key={subtype.id}
                                        type="button"
                                        onClick={() => setSelectedSubtype(subtype.id)}
                                        className={`p-3 rounded-xl border-2 transition-all text-left ${selectedSubtype === subtype.id
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <div className="text-sm font-bold">{subtype.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Modules Selection - REMOVED (Hardcoded based on Business Type) */}
                    <div>
                        <p className="text-sm text-gray-500 italic">
                            Modules are automatically configured based on the selected business type.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BusinessTypeModal;
