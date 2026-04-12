import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { X, Save, Plus, Minus, Trash2, Search, CheckCircle2, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { orderService, itemService } from '../../services/api';

const OrderEditSheet = ({ isOpen, onClose, order, onSuccess }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (isOpen && order) {
            // Initialize from current order
            setItems((order.items || []).map(item => ({
                itemId: item.itemId?._id || item.itemId,
                name: item.itemId?.name || item.itemName,
                quantity: item.quantity,
                price: item.price,
                taxPercent: item.taxPercent || item.itemId?.taxPercent || 0,
                weightBased: item.itemId?.weightBased || false
            })));
            setNotes(order.notes || '');
            setError(null);
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen, order]);

    const handleSearch = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await itemService.getItems({
                search: query,
                filters: { shopId: order.shopId }
            });
            setSearchResults(response.data || []);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    }, [order?.shopId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) handleSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    const addItem = (item) => {
        const existing = items.find(i => String(i.itemId) === String(item._id));
        if (existing) {
            updateQty(item._id, 1);
        } else {
            setItems(prev => [...prev, {
                itemId: item._id,
                name: item.name,
                quantity: 1,
                price: item.pricing?.sellingPrice || 0,
                taxPercent: item.taxPercent || 0,
                weightBased: item.weightBased || false
            }]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const updateQty = (itemId, delta) => {
        setItems(prev => prev.map(i => {
            if (String(i.itemId) === String(itemId)) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    const removeItem = (itemId) => {
        setItems(prev => prev.filter(i => String(i.itemId) !== String(itemId)));
    };

    // Calculation logic (Simplified to match TakeawayOrder logic)
    const calculateTotals = () => {
        let subtotal = 0;
        let taxTotal = 0;
        const taxBreakdown = {};

        items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            // Simple tax calculation
            const txRate = item.taxPercent || 0;
            if (txRate > 0) {
                const itemTax = parseFloat(((itemTotal * txRate) / 100).toFixed(4));
                taxTotal += itemTax;

                const key = `GST ${txRate}%`;
                if (!taxBreakdown[key]) taxBreakdown[key] = { name: key, rate: txRate, amount: 0 };
                taxBreakdown[key].amount = parseFloat((taxBreakdown[key].amount + itemTax).toFixed(4));
            }
        });

        subtotal = parseFloat(subtotal.toFixed(4));
        taxTotal = parseFloat(taxTotal.toFixed(4));
        const grandTotal = parseFloat((subtotal + taxTotal).toFixed(4));
        return { subtotal, taxTotal, grandTotal, taxBreakdown: Object.values(taxBreakdown) };
    };

    const totals = calculateTotals();

    const handleSave = async () => {
        if (items.length === 0) {
            setError("Cannot save an empty order. Please add at least one item.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await orderService.updateOrder(order._id, {
                items,
                notes,
                ...totals,
                // If it's a completed order being edited, we may want to recalculate payment status?
                // For now, we assume it stays completed but the totals change
                paymentStatus: (order.totalPaid >= totals.grandTotal) ? 'PAID' : 'PARTIAL'
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden ${theme.surfaceBg}`}>
                
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${theme.mode === 'dark' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} rounded-2xl flex items-center justify-center`}>
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black ${theme.textHeading}`}>Edit Sale</h2>
                            <p className={`text-sm font-medium ${theme.textMuted}`}>Order #{order.orderNumber} • {order.customerId?.name || 'Walk-in'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 ${theme.textMuted}`}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-600">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    {/* 1. Item Search */}
                    <section className="space-y-4">
                        <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme.textSecondary}`}>
                            <Plus size={16} /> Add New Item
                        </h3>
                        <div className="relative">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={20} />
                            <input
                                type="text"
                                placeholder="Search products by name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-12 pr-12 py-4 rounded-2xl border outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500`}
                            />
                            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" size={20} />}
                        </div>

                        {searchResults.length > 0 && (
                            <div className={`mt-2 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} overflow-hidden shadow-2xl max-h-60 overflow-y-auto z-20`}>
                                {searchResults.map(item => (
                                    <button
                                        key={item._id}
                                        onClick={() => addItem(item)}
                                        className={`w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-left border-b ${theme.borderLight}`}
                                    >
                                        <div>
                                            <p className={`font-black ${theme.textPrimary}`}>{item.name}</p>
                                            <p className={`text-xs font-bold ${theme.textMuted}`}>{item.itemCode}</p>
                                        </div>
                                        <p className="font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(item.pricing?.sellingPrice || 0)}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 2. Order Items */}
                    <section className="space-y-4">
                        <h3 className={`text-sm font-black uppercase tracking-widest flex items-center justify-between ${theme.textSecondary}`}>
                            Ordered Items
                            <span className={`text-[11px] px-2 py-0.5 rounded-lg ${theme.mode === 'dark' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{items.length} total</span>
                        </h3>
                        <div className={`rounded-3xl border overflow-hidden ${theme.borderLight} divide-y ${theme.borderLight}`}>
                            {items.map((item, idx) => (
                                <div key={idx} className={`p-4 flex items-center justify-between transition-colors ${theme.mode === 'dark' ? 'bg-white/5' : 'bg-white'}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-black ${theme.textPrimary} truncate`}>{item.name}</p>
                                        <p className={`text-xs font-bold ${theme.textMuted}`}>{formatCurrency(item.price)} each</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className={`flex items-center gap-3 p-1 rounded-xl border ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <button onClick={() => updateQty(item.itemId, -1)} className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 border ${theme.borderLight} ${theme.textPrimary} shadow-sm`}>-</button>
                                            <span className={`w-8 text-center font-black ${theme.textPrimary}`}>{item.quantity}</span>
                                            <button onClick={() => updateQty(item.itemId, 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 border ${theme.borderLight} ${theme.textPrimary} shadow-sm`}>+</button>
                                        </div>
                                        
                                        <div className="text-right min-w-[100px]">
                                            <p className={`font-black ${theme.textPrimary}`}>{formatCurrency(item.price * item.quantity)}</p>
                                        </div>

                                        <button 
                                            onClick={() => removeItem(item.itemId)}
                                            className={`p-2 transition-colors ${theme.textMuted} hover:text-red-500`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className={`p-10 text-center italic font-bold ${theme.textMuted}`}>
                                    No items in order
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 3. Notes */}
                    <section className="space-y-4">
                        <h3 className={`text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>Order Notes</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add reason for edit or general order notes..."
                            className={`w-full p-4 rounded-2xl border outline-none h-24 resize-none transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500 shadow-inner`}
                        />
                    </section>
                </div>

                {/* Footer / Summary */}
                <div className={`p-6 border-t ${theme.borderLight} ${theme.surfaceBg} bg-gradient-to-b from-transparent to-gray-50/10 dark:to-white/2`}>
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className={theme.textMuted}>Subtotal</span>
                            <span className={theme.textPrimary}>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className={theme.textMuted}>Tax Total</span>
                            <span className={theme.textPrimary}>{formatCurrency(totals.taxTotal)}</span>
                        </div>
                        <div className={`flex justify-between items-center pt-2 mt-2 border-t border-dashed ${theme.borderLight}`}>
                            <span className={`text-lg font-black ${theme.textPrimary}`}>Grand Total</span>
                            <span className={`text-2xl font-black ${theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{formatCurrency(totals.grandTotal)}</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleSave}
                        disabled={loading || items.length === 0}
                        className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-2 
                            ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} active:scale-[0.98] disabled:opacity-50`}
                    >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : (
                            <>
                                <Save size={20} />
                                Save & Update Sale
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderEditSheet;
