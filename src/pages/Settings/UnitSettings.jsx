import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { unitService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

const UnitSettings = () => {
    const { theme } = useTheme();
    const [units, setUnits] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        category: "WEIGHT",
        decimalAllowed: false,
    });

    const categories = ["COUNT", "WEIGHT", "TIME", "VOLUME", "LENGTH"];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await unitService.getUnits();
            setUnits(data);
        } catch (error) {
            toast.error("Failed to fetch units");
        }
    };

    const handleOpenDialog = (unit = null) => {
        if (unit) {
            setEditingUnit(unit);
            setFormData({
                name: unit.name,
                code: unit.code,
                category: unit.category,
                decimalAllowed: unit.decimalAllowed || false,
            });
        } else {
            setEditingUnit(null);
            setFormData({
                name: "",
                code: "",
                category: "WEIGHT",
                decimalAllowed: false,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingUnit) {
                await unitService.updateUnit(editingUnit._id, formData);
                toast.success("Unit updated successfully");
            } else {
                await unitService.createUnit(formData);
                toast.success("Unit created successfully");
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
        if (window.confirm("Are you sure you want to delete this unit?")) {
            try {
                await unitService.deleteUnit(id);
                toast.success("Unit deleted successfully");
                fetchData();
            } catch (error) {
                toast.error("Failed to delete unit");
            }
        }
    };

    const columns = [
        { header: "Name", key: "name", className: `font-bold ${theme.textPrimary}` },
        { header: "Code", key: "code", className: `${theme.textSecondary} font-mono text-sm` },
        {
            header: "Category", key: "category", render: (value) => (
                <span className={`px-3 py-1 ${theme.successBg} ${theme.successText} rounded-lg text-[10px] uppercase font-black tracking-widest`}>{value}</span>
            )
        },
        {
            header: "Decimals", key: "decimalAllowed", render: (value) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${value ? `${theme.infoBg} ${theme.infoText}` : `${theme.inputBg} ${theme.textMuted}`}`}>
                    {value ? 'Allowed' : 'Not Allowed'}
                </span>
            )
        },
        {
            header: "System", key: "isSystemUnit", render: (value) => (
                value ? <span className={`text-xs ${theme.textMuted} font-medium italic`}>Yes</span> : "-"
            )
        },
        {
            header: "Actions", key: "actions", render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenDialog(row)}
                        className={`p-2 ${theme.textSecondary} hover:${theme.primaryIconBg.replace('bg-', '')} hover:${theme.primaryIconText} rounded-xl transition-colors`}
                        disabled={row.isSystemUnit}
                        title={row.isSystemUnit ? "System units cannot be edited" : "Edit"}
                    >
                        <Edit2 size={16} className={row.isSystemUnit ? "opacity-30" : ""} />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className={`p-2 ${theme.textSecondary} hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors`}
                        disabled={row.isSystemUnit}
                        title={row.isSystemUnit ? "System units cannot be deleted" : "Delete"}
                    >
                        <Trash2 size={16} className={row.isSystemUnit ? "opacity-30" : ""} />
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
                        Units of Measurement
                    </h3>
                    <p className={`text-sm font-medium ${theme.textSecondary} mt-1`}>Manage physical units (e.g., Kilograms, Liters) across items</p>
                </div>
                <button
                    onClick={() => handleOpenDialog()}
                    className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-xl font-bold ${theme.buttonHoverBg} transition-all flex items-center gap-2 shadow-lg shadow-indigo-200`}
                >
                    <Plus size={20} /> Add Unit
                </button>
            </div>

            <div className={`${theme.surfaceBg} rounded-[24px] shadow-sm border ${theme.borderLight} overflow-hidden`}>
                <CommonTable columns={columns} data={units} />
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
                    <div className={`w-full max-w-lg ${theme.surfaceBg} rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto`}>
                        <div className="mb-4">
                            <h2 className={`text-2xl font-black ${theme.textHeading}`}>
                                {editingUnit ? "Edit Unit" : "Create Unit"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Unit Name</label>
                                    <input
                                        required
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.name}
                                        placeholder="e.g. Kilograms"
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Code (Short Name)</label>
                                    <input
                                        required
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.code}
                                        placeholder="e.g. kg"
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Category</label>
                                    <select
                                        required
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <label className={`flex items-center gap-3 cursor-pointer p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl hover:border-indigo-200 transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.decimalAllowed}
                                        onChange={(e) => setFormData({ ...formData, decimalAllowed: e.target.checked })}
                                        className={`w-5 h-5 rounded ${theme.inputBorder} text-indigo-600 focus:ring-indigo-500`}
                                    />
                                    <div>
                                        <div className={`font-bold ${theme.textPrimary}`}>Allow Decimals</div>
                                        <div className={`text-xs ${theme.textSecondary} font-medium`}>Used if values like "1.5 kg" should be permitted</div>
                                    </div>
                                </label>
                            </div>

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
                                    disabled={isLoading}
                                    className={`${theme.buttonBg} ${theme.buttonText} px-8 py-3 rounded-xl font-bold ${theme.buttonHoverBg} transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200`}
                                >
                                    {isLoading ? "Saving..." : "Save Unit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnitSettings;
