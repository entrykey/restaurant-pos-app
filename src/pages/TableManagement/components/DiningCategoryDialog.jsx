import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { diningCategoryService } from '../../../services/api';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const DiningCategoryDialog = ({ isOpen, onClose, onSuccess, category, shopId, branchId }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        environment: 'NON_AC',
    });

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                environment: category.environment || 'NON_AC',
            });
        } else {
            setFormData({
                name: '',
                environment: 'NON_AC',
            });
        }
    }, [category, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleEnv = () => {
        setFormData(prev => ({
            ...prev,
            environment: prev.environment === 'AC' ? 'NON_AC' : 'AC'
        }));
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
            if (category) {
                await diningCategoryService.updateCategory(category._id, payload);
                toast.success('Category updated successfully');
            } else {
                await diningCategoryService.createCategory(payload);
                toast.success('Category created successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to save category');
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
                        {category ? 'Edit Category' : 'Create Category'}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${theme.textSecondary}`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.textSecondary}`}>
                                Category Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className={`w-full px-4 py-2.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} ${theme.inputFocus} outline-none transition-shadow`}
                                placeholder="Main Hall, Balcony, etc."
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label className={`block text-xs font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                    Environment (AC / Non-AC)
                                </label>
                                <span className={`text-sm font-semibold px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 ${theme.textPrimary}`}>
                                    {formData.environment === 'AC' ? 'AC' : 'Non-AC'}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-500">Non-AC</span>
                                <button
                                    type="button"
                                    onClick={handleToggleEnv}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${formData.environment === 'AC' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${formData.environment === 'AC' ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                                <span className="text-sm font-medium text-blue-600">AC</span>
                            </div>
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
                            'Save Category'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiningCategoryDialog;
