import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { X, RotateCcw, AlertCircle, Truck, CheckCircle2, Ban, AlertTriangle } from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';
import { toast } from 'react-hot-toast';
import CommonSelect from '../ui/CommonSelect';

export const PURCHASE_RETURN_REASONS = [
    { label: 'Defective / Damaged Goods', value: 'Defective / Damaged Goods' },
    { label: 'Wrong Item Delivered by Supplier', value: 'Wrong Item Delivered by Supplier' },
    { label: 'Expired / Near Expiry', value: 'Expired / Near Expiry' },
    { label: 'Excess Delivery / Overstock', value: 'Excess Delivery / Overstock' },
    { label: 'Quality Not as Agreed', value: 'Quality Not as Agreed' },
    { label: 'Price / Billing Discrepancy', value: 'Price / Billing Discrepancy' },
    { label: 'Other', value: 'Other' }
];

const PurchaseReturnSheet = ({ isOpen, onClose, purchase, onSuccess }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [fetchingReturns, setFetchingReturns] = useState(false);
    const [purchaseReturns, setPurchaseReturns] = useState([]);
    const [returnedItems, setReturnedItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        if (isOpen && purchase?._id) {
            setReturnedItems([]);
            setNotes('');
            setError(null);

            setFetchingReturns(true);
            PurchaseService.getPurchaseReturns({ purchaseId: purchase._id })
                .then(res => {
                    if (isMounted) {
                        const list = Array.isArray(res) ? res : (res?.data || []);
                        setPurchaseReturns(list);
                    }
                })
                .catch(err => {
                    console.warn("Could not load previous purchase returns:", err);
                })
                .finally(() => {
                    if (isMounted) setFetchingReturns(false);
                });
        }
        return () => { isMounted = false; };
    }, [isOpen, purchase?._id]);

    const getItemId = (item) => {
        const id = typeof item.itemId === 'object' && item.itemId?._id ? item.itemId._id : (item.itemId || item._id);
        return String(id || '');
    };

    const alreadyReturnedMap = useMemo(() => {
        const map = {};
        (purchaseReturns || []).forEach(ret => {
            (ret.items || []).forEach(ri => {
                const idStr = String(ri.itemId?._id || ri.itemId || '');
                map[idStr] = (map[idStr] || 0) + (Number(ri.quantity) || 0);
            });
        });
        return map;
    }, [purchaseReturns]);

    const itemsAvailability = useMemo(() => {
        return (purchase?.items || []).map(item => {
            const rawId = getItemId(item);
            const origQty = Number(item.quantity) || 0;
            const alreadyReturned = alreadyReturnedMap[rawId] || 0;
            const remainingReturnable = Math.max(0, origQty - alreadyReturned);
            return {
                rawId,
                origQty,
                alreadyReturned,
                remainingReturnable,
                isFullyReturned: remainingReturnable <= 0
            };
        });
    }, [purchase?.items, alreadyReturnedMap]);

    const isPurchaseFullyReturned = useMemo(() => {
        if (!purchase?.items || purchase.items.length === 0) return false;
        return itemsAvailability.length > 0 && itemsAvailability.every(i => i.isFullyReturned);
    }, [purchase, itemsAvailability]);

    const handleToggleReturn = (item, remainingReturnable) => {
        if (remainingReturnable <= 0) {
            toast.error('This item has already been fully returned to the supplier.');
            return;
        }

        const itemId = getItemId(item);
        const isAlreadyAdded = returnedItems.find(ri => ri.itemId === itemId);
        if (isAlreadyAdded) {
            setReturnedItems(prev => prev.filter(ri => ri.itemId !== itemId));
        } else {
            setReturnedItems(prev => [...prev, {
                itemId,
                itemName: item.itemId?.name || item.itemName || 'Item',
                quantity: 1,
                maxQuantity: remainingReturnable,
                purchasePrice: item.purchasePrice || 0,
                returnReason: 'Defective / Damaged Goods',
                customReason: ''
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

    const updateReturnReason = (itemId, reason) => {
        setReturnedItems(prev => prev.map(ri => {
            if (ri.itemId === itemId) {
                return { ...ri, returnReason: reason };
            }
            return ri;
        }));
    };

    const updateCustomReason = (itemId, customReason) => {
        setReturnedItems(prev => prev.map(ri => {
            if (ri.itemId === itemId) {
                return { ...ri, customReason };
            }
            return ri;
        }));
    };

    const totalReturn = returnedItems.reduce((acc, item) => acc + (item.purchasePrice * item.quantity), 0);

    const handleSubmit = async () => {
        if (returnedItems.length === 0) {
            toast.error('Please select at least one item to return');
            return;
        }

        // Validate reason
        for (const item of returnedItems) {
            if (item.returnReason === 'Other' && !item.customReason?.trim()) {
                toast.error(`Please enter reason for "${item.itemName}"`);
                return;
            }
        }

        setLoading(true);
        setError(null);
        try {
            const formattedItems = returnedItems.map(ri => ({
                ...ri,
                returnReason: ri.returnReason === 'Other' && ri.customReason
                    ? ri.customReason.trim()
                    : (ri.customReason ? `${ri.returnReason}: ${ri.customReason.trim()}` : ri.returnReason)
            }));

            await PurchaseService.createPurchaseReturn({
                purchaseId: purchase._id,
                returnedItems: formattedItems,
                notes: notes.trim()
            });
            toast.success('Purchase return submitted successfully');
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to submit purchase return');
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
                            <p className={`text-sm font-medium ${theme.textMuted}`}>
                                Purchase #{purchase.purchaseNumber || purchase.invoiceNumber || ''} &bull; {purchase.supplierId?.name || 'Supplier'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 ${theme.textMuted}`}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 flex items-center gap-3 text-red-600">
                            <AlertCircle size={20} className="shrink-0" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    {isPurchaseFullyReturned && (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-800 dark:text-rose-300">
                            <Ban size={20} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-wide">Purchase Fully Returned</h4>
                                <p className="text-xs font-semibold mt-0.5">All items from this purchase have already been returned to the supplier.</p>
                            </div>
                        </div>
                    )}

                    {purchaseReturns.length > 0 && !isPurchaseFullyReturned && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                            <span>This purchase has {purchaseReturns.length} prior return{purchaseReturns.length > 1 ? 's' : ''}. Only remaining items can be returned.</span>
                        </div>
                    )}

                    <section className="space-y-3">
                        <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${theme.textSecondary}`}>
                            <Truck size={15} /> Select Items to Return to Supplier
                        </h3>
                        <div className={`rounded-3xl border overflow-hidden divide-y ${theme.borderLight}`}>
                            {(purchase.items || []).map((item, idx) => {
                                const itemId = getItemId(item);
                                const isAdded = returnedItems.find(ri => ri.itemId === itemId);
                                const availability = itemsAvailability.find(a => a.rawId === itemId) || {
                                    origQty: Number(item.quantity) || 1,
                                    alreadyReturned: 0,
                                    remainingReturnable: Number(item.quantity) || 1,
                                    isFullyReturned: false
                                };
                                const { origQty, alreadyReturned, remainingReturnable, isFullyReturned } = availability;

                                return (
                                    <div 
                                        key={idx} 
                                        className={`p-4 transition-colors ${
                                            isFullyReturned 
                                                ? 'bg-gray-100/60 dark:bg-slate-900/60 opacity-60' 
                                                : isAdded 
                                                    ? 'bg-red-50/40 dark:bg-red-950/20' 
                                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <button 
                                                    type="button"
                                                    disabled={isFullyReturned || isPurchaseFullyReturned}
                                                    onClick={() => handleToggleReturn(item, remainingReturnable)}
                                                    className={`w-6 h-6 rounded-lg border-2 mt-0.5 flex items-center justify-center transition-all shrink-0 ${
                                                        isFullyReturned 
                                                            ? 'border-gray-300 bg-gray-200 dark:border-slate-700 dark:bg-slate-800 cursor-not-allowed'
                                                            : isAdded 
                                                                ? 'bg-red-600 border-red-600 text-white shadow-sm' 
                                                                : theme.borderLight
                                                    }`}
                                                >
                                                    {isAdded && <CheckCircle2 size={16} />}
                                                    {isFullyReturned && <Ban size={12} className="text-gray-400" />}
                                                </button>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className={`font-black text-sm ${theme.textPrimary}`}>{item.itemId?.name || item.itemName}</p>
                                                        {isFullyReturned ? (
                                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-800 text-gray-500">
                                                                Already Returned ({alreadyReturned}/{origQty})
                                                            </span>
                                                        ) : alreadyReturned > 0 ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                                                Returned: {alreadyReturned} • Remaining: {remainingReturnable}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className={`text-xs font-bold ${theme.textMuted} mt-0.5`}>
                                                        Purchased: {formatCurrency(item.purchasePrice)} &times; {origQty}
                                                    </p>
                                                </div>
                                            </div>

                                            {isAdded && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button 
                                                        type="button"
                                                        onClick={() => updateReturnQty(itemId, -1)} 
                                                        disabled={isAdded.quantity <= 1}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border ${theme.borderLight} ${theme.textPrimary} hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30`}
                                                    >
                                                        -
                                                    </button>
                                                    <span className={`w-7 text-center font-black text-sm ${theme.textPrimary}`}>{isAdded.quantity}</span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => updateReturnQty(itemId, 1)} 
                                                        disabled={isAdded.quantity >= isAdded.maxQuantity}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border ${theme.borderLight} ${theme.textPrimary} hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isAdded && (
                                            <div className="mt-3 pt-3 border-t border-red-200/60 dark:border-red-900/40 space-y-2 pl-9">
                                                <CommonSelect
                                                    label="Return Reason"
                                                    value={isAdded.returnReason}
                                                    onChange={(val) => updateReturnReason(itemId, val)}
                                                    options={PURCHASE_RETURN_REASONS}
                                                    searchable={false}
                                                    placeholder="Select return reason..."
                                                    size="sm"
                                                />

                                                {isAdded.returnReason === 'Other' && (
                                                    <input
                                                        type="text"
                                                        value={isAdded.customReason || ''}
                                                        onChange={(e) => updateCustomReason(itemId, e.target.value)}
                                                        placeholder="Specify reason for returning to supplier..."
                                                        className={`w-full p-2 rounded-xl border text-xs font-bold outline-none ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-red-500`}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h3 className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>Notes / Reason (Optional)</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add overall remarks for returning to supplier..."
                            className={`w-full p-3.5 rounded-2xl border outline-none h-20 resize-none text-xs font-bold transition-all ${theme.surfaceBg} ${theme.borderLight} focus:border-red-500`}
                        />
                    </section>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${theme.borderLight} ${theme.surfaceBg} space-y-4`}>
                    <div className="flex justify-between items-center">
                        <span className={`text-sm font-black uppercase tracking-wider ${theme.textHeading}`}>Total Return Value</span>
                        <p className="text-xl font-black text-red-600">
                            {formatCurrency(totalReturn)}
                        </p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || returnedItems.length === 0 || isPurchaseFullyReturned}
                        className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs text-white transition-all shadow-xl flex items-center justify-center gap-2 
                            ${loading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {loading ? 'Processing...' : isPurchaseFullyReturned ? 'Purchase Fully Returned' : 'Complete Purchase Return'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseReturnSheet;
