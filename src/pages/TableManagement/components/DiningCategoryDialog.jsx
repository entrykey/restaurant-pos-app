import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { diningCategoryService, tableService } from '../../../services/api';
import { toast } from 'react-hot-toast';
import { X, Plus, Trash2, LayoutDashboard } from 'lucide-react';

const DiningCategoryDialog = ({ isOpen, onClose, onSuccess, category, shopId, branchId }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        environment: 'NON_AC',
    });

    const [tables, setTables] = useState([]);
    const [existingTables, setExistingTables] = useState([]);

    useEffect(() => {
        const fetchExistingTables = async () => {
            if (category?._id) {
                try {
                    const res = await tableService.getTables({ diningCategoryId: category._id, all: true });
                    setExistingTables(res || []);
                } catch (error) {
                    console.error('Error fetching existing tables:', error);
                }
            }
        };

        if (category) {
            setFormData({
                name: category.name || '',
                environment: category.environment || 'NON_AC',
            });
            setTables([]);
            fetchExistingTables();
        } else {
            setFormData({
                name: '',
                environment: 'NON_AC',
            });
            setTables([]);
            setExistingTables([]);
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

    const handleAddTable = () => {
        const nextNum = tables.length + 1;
        setTables(prev => [...prev, { tableNumber: `T${nextNum}`, capacity: 4 }]);
    };

    const handleRemoveTable = (index) => {
        setTables(prev => prev.filter((_, i) => i !== index));
    };

    const handleTableChange = (index, field, value) => {
        setTables(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formData.name) {
            toast.error("Category name is required");
            return;
        }

        setLoading(true);

        const payload = {
            ...formData,
            shopId,
            branchId
        };

        try {
            if (category) {
                await diningCategoryService.updateCategory(category._id, payload);
                
                if (tables.length > 0) {
                    await Promise.all(tables.map(table =>
                        tableService.createTable({
                            ...table,
                            diningCategoryId: category._id,
                            shopId,
                            branchId,
                            status: 'AVAILABLE',
                            isActive: true
                        })
                    ));
                    toast.success(`Category updated and ${tables.length} new tables added!`);
                } else {
                    toast.success('Category updated successfully');
                }
            } else {
                const createdCategory = await diningCategoryService.createCategory(payload);
                const categoryId = createdCategory._id || createdCategory.id;

                if (tables.length > 0) {
                    try {
                        await Promise.all(tables.map(table =>
                            tableService.createTable({
                                ...table,
                                diningCategoryId: categoryId,
                                shopId,
                                branchId,
                                status: 'AVAILABLE',
                                isActive: true
                            })
                        ));
                        toast.success(`Category and ${tables.length} tables created!`);
                    } catch (tErr) {
                        console.error('Partial table creation failure:', tErr);
                        toast.error('Category created, but some tables failed to save.');
                    }
                } else {
                    toast.success('Category created successfully');
                }
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
            <div className={`w-full max-w-xl rounded-2xl ${theme.cardBg} ${theme.borderLight} border shadow-xl flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center bg-gray-50/50 dark:bg-white/5 rounded-t-2xl`}>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <LayoutDashboard size={20} />
                        </div>
                        <h2 className={`text-lg font-bold tracking-tight ${theme.textPrimary}`}>
                            {category ? 'Edit Category' : 'Create Category & Tables'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${theme.textSecondary}`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${theme.textSecondary}`}>
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-4 py-3 rounded-xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} ${theme.inputFocus} outline-none transition-all font-bold`}
                                    placeholder="Main Hall, Balcony, etc."
                                />
                            </div>

                            <div>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${theme.textSecondary}`}>
                                    Environment
                                </label>
                                <div className="flex items-center gap-4 py-2">
                                    <button
                                        type="button"
                                        onClick={handleToggleEnv}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${formData.environment === 'AC' ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${formData.environment === 'AC' ? 'translate-x-7' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                    <span className={`text-sm font-black ${formData.environment === 'AC' ? 'text-indigo-600' : theme.textPrimary}`}>
                                        {formData.environment === 'AC' ? 'AC Room' : 'Non-AC Area'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Summary / Stats (Optional decoration) */}
                        <div className={`p-4 rounded-2xl border-2 border-dashed ${theme.borderLight} flex flex-col items-center justify-center text-center gap-2 bg-gray-50/50 dark:bg-black/10`}>
                            <div className="text-3xl font-black text-indigo-600">{existingTables.length + tables.length}</div>
                            <div className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Total Tables Registered</div>
                        </div>
                    </div>

                    {/* Tables Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className={`text-xs font-black uppercase tracking-widest ${theme.textPrimary}`}>Configure Tables</h3>
                            <button
                                type="button"
                                onClick={handleAddTable}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                <Plus size={14} /> Add Table
                            </button>
                        </div>

                        {existingTables.length === 0 && tables.length === 0 ? (
                            <div className={`text-center py-8 px-4 rounded-2xl border-2 border-dashed ${theme.borderLight} ${theme.textMuted} text-xs font-bold italic`}>
                                No tables added yet. Click "+ Add Table" to start.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Existing Tables */}
                                {existingTables.map((t, idx) => (
                                    <div key={t._id} className={`p-4 rounded-2xl border ${theme.borderLight} bg-gray-100/50 dark:bg-white/5 opacity-80 shadow-sm`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Table {t.tableNumber}</div>
                                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Existing</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className={`text-[9px] font-black uppercase text-gray-400 mb-1`}>Name</p>
                                                <p className={`text-sm font-bold ${theme.textPrimary}`}>{t.tableNumber}</p>
                                            </div>
                                            <div>
                                                <p className={`text-[9px] font-black uppercase text-gray-400 mb-1`}>Seats</p>
                                                <p className={`text-sm font-bold ${theme.textPrimary}`}>{t.capacity}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* New Tables */}
                                {tables.map((t, idx) => (
                                    <div key={idx} className={`p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm group hover:border-indigo-400 transition-all`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase italic animate-pulse">New Table</div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTable(idx)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${theme.textMuted}`}>Name</label>
                                                <input
                                                    type="text"
                                                    value={t.tableNumber}
                                                    onChange={(e) => handleTableChange(idx, 'tableNumber', e.target.value)}
                                                    className={`w-full px-3 py-2 rounded-lg border ${theme.inputBorder} ${theme.inputBg} text-sm font-bold focus:border-indigo-400 outline-none`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${theme.textMuted}`}>Seats</label>
                                                <input
                                                    type="number"
                                                    value={t.capacity}
                                                    onChange={(e) => handleTableChange(idx, 'capacity', parseInt(e.target.value || 0))}
                                                    className={`w-full px-3 py-2 rounded-lg border ${theme.inputBorder} ${theme.inputBg} text-sm font-bold focus:border-indigo-400 outline-none`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${theme.borderLight} bg-gray-50/50 dark:bg-white/5 rounded-b-2xl flex justify-end gap-3`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest ${theme.textSecondary} hover:${theme.textPrimary} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest ${theme.buttonBg} ${theme.buttonText} shadow-lg shadow-indigo-100 dark:shadow-none hover:opacity-90 transition-all flex items-center justify-center min-w-[120px]`}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            category ? 'Update' : 'Save Category'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiningCategoryDialog;
