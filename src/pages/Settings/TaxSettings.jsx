import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Percent } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import CommonSelect from "../../components/ui/CommonSelect";
import { taxService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

const TaxSettings = () => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId, branches, organization, currentShopId } = useApp();
    const [taxes, setTaxes] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTax, setEditingTax] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        percentage: 0,
        taxSystem: "GST",
        taxType: "EXCLUSIVE",
        isActive: true,
        components: {
            cgst: 0,
            sgst: 0,
            igst: 0
        }
    });

    useEffect(() => {
        if (user?.isSuperAdmin || activeBranchId) {
            fetchData();
        }
    }, [activeBranchId, user?.isSuperAdmin]);

    const fetchData = async () => {
        try {
            const params = user?.isSuperAdmin ? {} : { branchId: activeBranchId };
            const data = await taxService.getTaxes(params);
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
                taxSystem: tax.taxSystem || "GST",
                taxType: tax.taxType || "EXCLUSIVE",
                isActive: tax.isActive ?? true,
                components: {
                    cgst: tax.components?.cgst || 0,
                    sgst: tax.components?.sgst || 0,
                    igst: tax.components?.igst || 0
                }
            });
        } else {
            // Try to find the current branch's tax system
            const currentBranch = branches.find(b => b._id === activeBranchId);
            const defaultTaxSystem = currentBranch?.taxProfile?.taxSystem || "GST";

            setEditingTax(null);
            setFormData({
                name: "",
                percentage: 0,
                taxSystem: defaultTaxSystem,
                taxType: "EXCLUSIVE",
                isActive: true,
                components: {
                    cgst: 0,
                    sgst: 0,
                    igst: 0
                }
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = { ...formData };
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
            header: "Tax Profile",
            key: "taxSystem",
            render: (value) => (
                <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold bg-indigo-50 text-indigo-600`}>
                    {value || 'NONE'}
                </span>
            )
        },
        {
            header: "Type",
            key: "taxType",
            render: (value) => (
                <span className={`text-[10px] font-bold ${theme.textSecondary}`}>
                    {value || 'EXCLUSIVE'}
                </span>
            )
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
                                    <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Total Percentage (%)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                        value={formData.percentage}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            if (formData.taxSystem === "GST") {
                                                const split = val / 2;
                                                setFormData({
                                                    ...formData,
                                                    percentage: val,
                                                    components: {
                                                        cgst: split,
                                                        sgst: split,
                                                        igst: val
                                                    }
                                                });
                                            } else {
                                                setFormData({ ...formData, percentage: val });
                                            }
                                        }}
                                    />
                                </div>

                                {formData.taxSystem === "GST" && (
                                    <div className={`p-5 rounded-3xl border-2 border-dashed ${theme.borderLight} bg-indigo-50/30 space-y-4`}>
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-xs font-black ${theme.textSecondary} uppercase tracking-widest`}>GST Split-up</h4>
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Automated Calculation</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className={`text-[10px] font-black ${theme.textMuted} uppercase`}>CGST (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className={`w-full p-3 ${theme.inputBg} border ${theme.inputBorder} rounded-xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText} text-sm`}
                                                    value={formData.components.cgst}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const newSgst = formData.components.sgst;
                                                        setFormData({
                                                            ...formData,
                                                            percentage: val + newSgst,
                                                            components: {
                                                                ...formData.components,
                                                                cgst: val,
                                                                igst: val + newSgst
                                                            }
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={`text-[10px] font-black ${theme.textMuted} uppercase`}>SGST (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className={`w-full p-3 ${theme.inputBg} border ${theme.inputBorder} rounded-xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText} text-sm`}
                                                    value={formData.components.sgst}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const newCgst = formData.components.cgst;
                                                        setFormData({
                                                            ...formData,
                                                            percentage: val + newCgst,
                                                            components: {
                                                                ...formData.components,
                                                                sgst: val,
                                                                igst: val + newCgst
                                                            }
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t border-indigo-100">
                                            <label className={`text-[10px] font-black ${theme.textMuted} uppercase`}>IGST (%) <span className="text-indigo-400 capitalize font-medium">(Inter-state tax)</span></label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className={`w-full p-3 ${theme.inputBg} border ${theme.inputBorder} rounded-xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText} text-sm`}
                                                value={formData.components.igst}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setFormData({
                                                        ...formData,
                                                        components: {
                                                            ...formData.components,
                                                            igst: val
                                                        }
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Tax Profile</label>
                                        <CommonSelect
                                            options={[
                                                { label: "GST", value: "GST" },
                                                { label: "VAT", value: "VAT" },
                                                { label: "Sales Tax", value: "SALES_TAX" },
                                                { label: "None", value: "NONE" }
                                            ]}
                                            value={formData.taxSystem}
                                            onChange={(val) => {
                                                if (val === "GST" && formData.percentage > 0) {
                                                    const split = formData.percentage / 2;
                                                    setFormData({
                                                        ...formData,
                                                        taxSystem: val,
                                                        components: {
                                                            cgst: split,
                                                            sgst: split,
                                                            igst: formData.percentage
                                                        }
                                                    });
                                                } else {
                                                    setFormData({ ...formData, taxSystem: val });
                                                }
                                            }}
                                            disabled={!user?.isSuperAdmin}
                                            placeholder="Select Tax Profile"
                                            className="w-full text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Tax Type</label>
                                        <CommonSelect
                                            options={[
                                                { label: "Exclusive", value: "EXCLUSIVE" },
                                                { label: "Inclusive", value: "INCLUSIVE" }
                                            ]}
                                            value={formData.taxType}
                                            onChange={(val) => setFormData({ ...formData, taxType: val })}
                                            placeholder="Select Tax Type"
                                            className="w-full text-sm font-bold"
                                        />
                                    </div>
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
