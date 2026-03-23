import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { X, RotateCcw, AlertCircle, Truck } from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';

const PurchaseReturnSheet = ({ isOpen, onClose, purchase, onSuccess }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [returnedItems, setReturnedItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && purchase) {
            setReturnedItems([]);
            setNotes('');
            setError(null);
        }
    }, [isOpen, purchase]);

    const handleToggleReturn = (item) => {
        const isAlreadyAdded = returnedItems.find(ri => ri.itemId === item.itemId?._id);
        if (isAlreadyAdded) {
            setReturnedItems(prev => prev.filter(ri => ri.itemId !== item.itemId?._id));
        } else {
            setReturnedItems(prev => [...prev, {
                itemId: item.itemId?._id,
                itemName: item.itemId?.name || item.itemName,
                quantity: 1,
                maxQuantity: item.quantity,
                purchasePrice: item.purchasePrice || 0,
                returnReason: ''
            }]);
        }
    };

    const updateReturnQty = (itemId, delta) => {
        setReturnedItems(prev => prev.map(ri => {
            if (ri.itemId === itemId) {
                const newQty = Math.max(1, Math.min(ri.maxQuantity, ri.quantity + delta));
                return { ...ri, quantity: newQty };
            }
            return ri;
        }));
    };

    const totalReturn = returnedItems.reduce((acc, item) => acc + (item.purchasePrice * item.quantity), 0);

    const handleSubmit = async () => {
        if (returnedItems.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            await PurchaseService.createPurchaseReturn({
                purchaseId: purchase._id,
                returnedItems,
                notes
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !purchase) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden ${theme.surfaceBg}`}>
                
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black ${theme.textHeading}`}>Purchase Return</h2>
                            <p className={`text-sm font-medium ${theme.textMuted}`}>Purchase #{purchase.purchaseNumber} • {purchase.supplierId?.name || 'General Supplier'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 ${theme.textMuted}`}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-600">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <section className="space-y-4">
                        <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme.textSecondary}`}>
                            <Truck size={16} /> Select Items to Return to Supplier
                        </h3>
                        <div className={`rounded-3xl border overflow-hidden ${theme.borderLight}`}>
                            {(purchase.items || []).map((item, idx) => {
                                const isAdded = returnedItems.find(ri => ri.itemId === item.itemId?._id);
                                return (
                                    <div key={idx} className={`p-4 flex items-center justify-between group transition-colors ${isAdded ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => handleToggleReturn(item)}
                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAdded ? 'bg-red-600 border-red-600 text-white' : theme.borderLight}`}
                                            >
                                                {isAdded && <RotateCcw size={16} className="rotate-45" />}
                                            </button>
                                            <div>
                                                <p className={`font-black ${theme.textPrimary}`}>{item.itemId?.name || item.itemName}</p>
                                                <p className={`text-xs font-bold ${theme.textMuted}`}>Purchased: {formatCurrency(item.purchasePrice)} x {item.quantity}</p>
                                            </div>
                                        </div>
                                        {isAdded && (
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => updateReturnQty(item.itemId?._id, -1)} className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 border ${theme.borderLight} ${theme.textPrimary}`}>-</button>
                                                <span className={`w-8 text-center font-black ${theme.textPrimary}`}>{isAdded.quantity}</span>
                                                <button onClick={() => updateReturnQty(item.itemId?._id, 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 border ${theme.borderLight} ${theme.textPrimary}`}>+</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className={`text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>Notes / Reason</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add reason for returning to supplier..."
                            className={`w-full p-4 rounded-2xl border outline-none h-24 resize-none transition-all ${theme.surfaceBg} ${theme.borderLight} focus:border-red-500`}
                        />
                    </section>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${theme.borderLight} ${theme.surfaceBg}`}>
                    <div className="flex justify-between items-center mb-6">
                        <span className={`text-lg font-black ${theme.textHeading}`}>Total Return Value</span>
                        <p className="text-2xl font-black text-red-600">
                            {formatCurrency(totalReturn)}
                        </p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || returnedItems.length === 0}
                        className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-2 
                            ${loading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'}`}
                    >
                        {loading ? 'Processing...' : 'Complete Purchase Return'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseReturnSheet;
