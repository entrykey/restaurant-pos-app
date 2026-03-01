import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { tableService } from '../../../services/api';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import CommonSelect from '../../../components/ui/CommonSelect';

const TableDialog = ({ isOpen, onClose, onSuccess, table, categories, shopId, branchId }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        tableNumber: '',
        capacity: 4,
        diningCategoryId: '',
    });

    useEffect(() => {
        if (table) {
            setFormData({
                tableNumber: table.tableNumber || '',
                capacity: table.capacity || 4,
                diningCategoryId: table.diningCategoryId?._id || table.diningCategoryId || '',
            });
        } else {
            setFormData({
                tableNumber: '',
                capacity: 4,
                diningCategoryId: categories?.[0]?._id || '',
            });
        }
    }, [table, categories, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            shopId,
            branchId
        };

        try {
            if (table) {
                await tableService.updateTable(table._id, payload);
                toast.success('Table updated successfully');
            } else {
                await tableService.createTable(payload);
                toast.success('Table created successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to save table');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full max-w-md rounded-2xl ${theme.cardBg} ${theme.borderLight} border shadow-xl flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center bg-gray-50/50 dark:bg-white/5 rounded-t-2xl`}>
                    <h2 className={`text-lg font-bold tracking-tight ${theme.textPrimary}`}>
                        {table ? 'Edit Table' : 'Create Table'}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${theme.textSecondary}`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 overflow-visible">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.textSecondary}`}>
                                Table Number
                            </label>
                            <input
                                type="text"
                                name="tableNumber"
                                value={formData.tableNumber}
                                onChange={handleChange}
                                required
                                className={`w-full px-4 py-2.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} ${theme.inputFocus} outline-none transition-shadow`}
                                placeholder="e.g. T1, Balcony-1"
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.textSecondary}`}>
                                Capacity
                            </label>
                            <input
                                type="number"
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleChange}
                                min="1"
                                required
                                className={`w-full px-4 py-2.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} ${theme.inputFocus} outline-none transition-shadow`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.textSecondary}`}>
                                Dining Category
                            </label>
                            <CommonSelect
                                options={categories}
                                value={formData.diningCategoryId}
                                onChange={(selectedId) => setFormData(prev => ({ ...prev, diningCategoryId: selectedId }))}
                                placeholder="Select category"
                                searchPlaceholder="Search categories..."
                                labelKey="name"
                                valueKey="_id"
                                required
                                className="w-full"
                                renderOption={(cat) => (
                                    <div className={`font-bold ${theme.textPrimary}`}>
                                        {cat.name} <span className="text-xs opacity-70">({cat.environment === "AC" ? "AC" : "Non-AC"})</span>
                                    </div>
                                )}
                            />
                            {categories.length === 0 && (
                                <p className={`text-xs mt-1 text-red-500`}>Please create a dining category first.</p>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${theme.borderLight} bg-gray-50/50 dark:bg-white/5 rounded-b-2xl flex justify-end gap-3`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-xl font-medium ${theme.textSecondary} hover:${theme.textPrimary} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-xl font-medium ${theme.buttonBg} ${theme.buttonText} hover:opacity-90 transition-all flex items-center justify-center min-w-[100px]`}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Save Table'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableDialog;
