import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Percent } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { taxService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

const TaxSettings = () => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const [taxes, setTaxes] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTax, setEditingTax] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        percentage: 0,
        isActive: true,
    });

    useEffect(() => {
        if (activeBranchId) {
            fetchData();
        }
    }, [activeBranchId]);

    const fetchData = async () => {
        try {
            const data = await taxService.getTaxes(activeBranchId);
            setTaxes(data);
        } catch (error) {
            toast.error("Failed to fetch taxes");
        }
    };

    const handleOpenDialog = (tax = null) => {
        if (tax) {
            setEditingTax(tax);
            setFormData({
                name: tax.name,
                percentage: tax.percentage,
                isActive: tax.isActive ?? true,
            });
        } else {
            setEditingTax(null);
            setFormData({
                name: "",
                percentage: 0,
                isActive: true,
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = { ...formData, shopId: user.shop_id, branchId: activeBranchId };
            if (editingTax) {
                await taxService.updateTax(editingTax._id, payload);
                toast.success("Tax updated successfully");
            } else {
                await taxService.createTax(payload);
                toast.success("Tax created successfully");
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
        if (window.confirm("Are you sure you want to delete this tax percentage?")) {
            try {
                await taxService.deleteTax(id);
                toast.success("Tax deleted successfully");
                fetchData();
            } catch (error) {
                toast.error("Failed to delete tax");
            }
        }
    };

    const columns = [
        { header: "Tax Name", key: "name", className: `font-bold ${theme.textPrimary}` },
        { 
            header: "Percentage (%)", 
            key: "percentage", 
            className: `${theme.textSecondary} font-mono font-black`,
            render: (value) => <span>{value}%</span>
        },
        {
            header: "Status", 
            key: "isActive", 
            render: (value) => (
                <span className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest ${value ? `${theme.successBg} ${theme.successText}` : `${theme.inputBg} ${theme.textMuted}`}`}>
                    {value ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: "Actions", 
            key: "actions", 
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenDialog(row)}
                        className={`p-2 ${theme.textSecondary} hover:${theme.primaryIconBg.replace('bg-', '')} hover:${theme.primaryIconText} rounded-xl transition-colors`}
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className={`p-2 ${theme.textSecondary} hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors`}
                        title="Delete"
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
                        <Percent className={theme.primaryIconText} size={24} /> Tax Percentages
                    </h3>
                    <p className={`text-sm font-medium ${theme.textSecondary} mt-1`}>Manage tax rates for your products and services</p>
                </div>
                <button
                    onClick={() => handleOpenDialog()}
                    className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-xl font-bold ${theme.buttonHoverBg} transition-all flex items-center gap-2 shadow-lg shadow-indigo-200`}
                >
                    <Plus size={20} /> Add Tax
                </button>
            </div>

            <div className={`${theme.surfaceBg} rounded-[24px] shadow-sm border ${theme.borderLight} overflow-hidden`}>
                <CommonTable columns={columns} data={taxes} />
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
                    <div className={`w-full max-w-lg ${theme.surfaceBg} rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto`}>
                        <div className="mb-4">
                            <h2 className={`text-2xl font-black ${theme.textHeading}`}>
                                {editingTax ? "Edit Tax" : "Create Tax"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Tax Name</label>
                                    <input
                                        required
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.name}
                                        placeholder="e.g. GST 18% or VAT 5%"
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Percentage (%)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.percentage}
                                        placeholder="0"
                                        onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) })}
                                    />
                                </div>

                                <label className={`flex items-center gap-3 cursor-pointer p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl hover:border-indigo-200 transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className={`w-5 h-5 rounded ${theme.inputBorder} text-indigo-600 focus:ring-indigo-500`}
                                    />
                                    <div>
                                        <div className={`font-bold ${theme.textPrimary}`}>Active</div>
                                        <div className={`text-xs ${theme.textSecondary} font-medium`}>Inactive taxes won't show up in product selection</div>
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
                                    {isLoading ? "Saving..." : "Save Tax"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxSettings;
