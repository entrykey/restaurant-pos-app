import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { categoryService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

const CategorySettings = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [categories, setCategories] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        isActive: true
    });

    useEffect(() => {
        if (user?.shop_id) {
            fetchData();
        }
    }, [user?.shop_id]);

    const fetchData = async () => {
        try {
            const data = await categoryService.getCategories({ shopId: user.shop_id });
            setCategories(data);
        } catch (error) {
            toast.error("Failed to fetch categories");
        }
    };

    const handleOpenDialog = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                isActive: category.isActive !== false // handle potential missing field
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: "",
                isActive: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingCategory) {
                await categoryService.updateCategory(editingCategory._id, formData);
                toast.success("Category updated successfully");
            } else {
                await categoryService.createCategory({
                    ...formData,
                    shopId: user.shop_id
                });
                toast.success("Category created successfully");
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
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                await categoryService.deleteCategory(id);
                toast.success("Category deleted successfully");
                fetchData();
            } catch (error) {
                toast.error(error?.message || "Failed to delete category");
            }
        }
    };

    const columns = [
        { header: "Category Name", key: "name", className: `font-bold ${theme.textPrimary}` },
        {
            header: "Status",
            key: "isActive",
            render: (value) => (
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${value ? `${theme.successBg} ${theme.successText}` : "bg-red-100 text-red-700"}`}>
                    {value ? "Active" : "Inactive"}
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
                        Item Categories
                    </h3>
                    <p className={`text-sm font-medium ${theme.textSecondary} mt-1`}>Manage product categories for your inventory</p>
                </div>
                <button
                    onClick={() => handleOpenDialog()}
                    className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-xl font-bold ${theme.buttonHoverBg} transition-all flex items-center gap-2 shadow-lg shadow-indigo-200`}
                >
                    <Plus size={20} /> Add Category
                </button>
            </div>

            <div className={`${theme.surfaceBg} rounded-[24px] shadow-sm border ${theme.borderLight} overflow-hidden`}>
                <CommonTable columns={columns} data={categories} />
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
                    <div className={`w-full max-w-lg ${theme.surfaceBg} rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto`}>
                        <div className="mb-4">
                            <h2 className={`text-2xl font-black ${theme.textHeading}`}>
                                {editingCategory ? "Edit Category" : "Create Category"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>Category Name</label>
                                <input
                                    required
                                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                    value={formData.name}
                                    placeholder="e.g. Beverages"
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className={`p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl`}>
                                <label className={`flex items-center gap-3 cursor-pointer hover:${theme.primaryIconText} transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className={`w-5 h-5 rounded ${theme.inputBorder} text-indigo-600 focus:ring-indigo-500`}
                                    />
                                    <div>
                                        <div className={`font-bold ${theme.textPrimary}`}>Active Status</div>
                                        <div className={`text-xs ${theme.textSecondary} font-medium`}>Allow items to be created with this category</div>
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
                                    disabled={isLoading || !formData.name.trim()}
                                    className={`${theme.buttonBg} ${theme.buttonText} px-8 py-3 rounded-xl font-bold ${theme.buttonHoverBg} transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200`}
                                >
                                    {isLoading ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategorySettings;
