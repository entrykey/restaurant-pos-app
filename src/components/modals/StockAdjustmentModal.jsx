import React, { useState } from 'react';
import { X, Plus, Minus, Calculator, FileText, Calendar } from 'lucide-react';
import ThemeLoader from '../ui/ThemeLoader';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../services/api';
import { shopExpenseService } from '../../services/api/shopExpenses';
import { useApp } from '../../context/AppContext';

const StockAdjustmentModal = ({ isOpen, onClose, item, branchId, onAdjustmentSuccess, formatCurrency: propFormatCurrency }) => {
    const { theme } = useTheme();
    const { organization, formatCurrency } = useApp();
    const currency = organization?.defaultCurrency || 'USD';
    const [adjustmentType, setAdjustmentType] = useState('ADD'); // 'ADD' or 'SUBTRACT'
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { user } = useAuth();
    if (!isOpen || !item) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
            alert("Please enter a valid quantity");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                itemId: item._id || item.id,
                branchId,
                quantity: Number(quantity),
                type: adjustmentType,
                atPrice: price ? Number(price) : undefined,
                description,
                adjustmentDate: new Date(adjustmentDate)
            };

            await inventoryService.adjustInventory(payload);

            // Record as expense if adding/reducing stock with a price
            if (price && Number(quantity) > 0) {
                try {
                    const shopId = user?.shop_id || user?.shopId;
                    if (shopId && branchId) {
                        const multiplier = adjustmentType === 'ADD' ? 1 : -1;
                        await shopExpenseService.upsertExpense(shopId, branchId, {
                            category: multiplier > 0 ? 'Stock' : 'Stock (Reduction)',
                            amount: Number(quantity) * Number(price) * multiplier,
                            term: 'one time',
                            isDefault: false
                        });
                    }
                } catch (expError) {
                    console.error("Failed to record stock expense:", expError);
                }
            }

            onAdjustmentSuccess();
            onClose();
        } catch (error) {
            console.error("Adjustment failed:", error);
            alert(error.response?.data?.message || "Failed to adjust stock");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`${theme.surfaceBg} w-full max-w-lg max-h-[90vh] rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border ${theme.borderLight} animate-in zoom-in-95 duration-300`}>
                
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start flex-shrink-0">
                    <div>
                        <h3 className={`text-2xl font-black ${theme.textHeading}`}>Stock Adjustment</h3>
                        <p className={`text-sm font-bold mt-1 ${theme.textMuted}`}>
                            {item.name} <span className="opacity-50">•</span> {item.itemCode}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className={`p-3 rounded-full hover:bg-red-50 hover:text-red-500 transition-all ${theme.textSecondary}`}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* Adjustment Type Toggle */}
                    <div className="space-y-3">
                        <label className={`block text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>
                            <span className="text-red-500 mr-1">*</span> Choose adjustment
                        </label>
                        <div className={`flex p-1.5 rounded-2xl w-fit ${theme.inputBg} border ${theme.borderLight}`}>
                            <button
                                type="button"
                                onClick={() => setAdjustmentType('ADD')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all ${
                                    adjustmentType === 'ADD' 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                    : `${theme.textMuted} hover:text-blue-500`
                                }`}
                            >
                                <Plus size={18} /> Add Stock
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustmentType('SUBTRACT')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all ${
                                    adjustmentType === 'SUBTRACT' 
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                                    : `${theme.textMuted} hover:text-red-500`
                                }`}
                            >
                                <Minus size={18} /> Reduce Stock
                            </button>
                        </div>
                    </div>

                    {/* Quantity Field */}
                    <div className="space-y-3">
                        <label className={`block text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>
                            <span className="text-red-500 mr-1">*</span> Quantity
                        </label>
                        <div className="relative group">
                            <Calculator className={`absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors ${theme.textMuted}`} size={20} />
                            <input
                                type="number"
                                required
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="Total Qty"
                                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent outline-none focus:border-blue-500 transition-all font-bold text-lg ${theme.inputBg} ${theme.textPrimary}`}
                            />
                        </div>
                    </div>

                    {/* Price Field */}
                    <div className="space-y-3">
                        <label className={`block text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>
                            <span className="text-red-500 mr-1">*</span> At Price
                        </label>
                        <div className="relative group">
                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black group-focus-within:text-blue-500 transition-colors ${theme.textMuted}`}>{currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency)}</span>
                            <input
                                type="number"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="At Price"
                                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent outline-none focus:border-blue-500 transition-all font-bold text-lg ${theme.inputBg} ${theme.textPrimary}`}
                            />
                        </div>
                    </div>

                    {/* Description Field */}
                    <div className="space-y-3">
                        <label className={`block text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>
                            Description
                        </label>
                        <div className="relative group">
                            <FileText className={`absolute left-4 top-5 group-focus-within:text-blue-500 transition-colors ${theme.textMuted}`} size={20} />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Details"
                                rows="3"
                                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent outline-none focus:border-blue-500 transition-all font-bold ${theme.inputBg} ${theme.textPrimary} resize-none`}
                            />
                        </div>
                    </div>

                    {/* Date Field */}
                    <div className="space-y-3">
                        <label className={`block text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>
                            Adjustment Date
                        </label>
                        <div className="relative group">
                            <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors ${theme.textMuted}`} size={20} />
                            <input
                                type="date"
                                value={adjustmentDate}
                                onChange={(e) => setAdjustmentDate(e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent outline-none focus:border-blue-500 transition-all font-black ${theme.inputBg} ${theme.textPrimary} [color-scheme:light]`}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-4 rounded-2xl font-black border-2 ${theme.borderLight} ${theme.textSecondary} hover:bg-gray-50 dark:hover:bg-white/5 transition-all`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-4 rounded-2xl font-black text-white bg-blue-600 shadow-xl shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-all flex items-center justify-center gap-2`}
                        >
                            {isSubmitting ? (
                                <ThemeLoader size="sm" />
                            ) : (
                                "Create"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
