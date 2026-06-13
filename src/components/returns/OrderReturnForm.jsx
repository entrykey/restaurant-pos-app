import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { RotateCcw, Plus, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';
import { orderService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext';
import { toast } from 'react-hot-toast';
import {
    getAdjustedUnitRefund,
    calculateReturnRefundTotal,
    withAdjustedReturnPrices,
} from '../../utils/returnAmount';

const OrderReturnForm = ({ order, onSuccess, onCancel }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const {
        setIsExchange, setExchangeCredit, setReturnedItems: setGlobalReturnedItems,
        setOriginalOrderId
    } = useOrder();

    const [loading, setLoading] = useState(false);
    const [returnedItems, setReturnedItems] = useState([]);
    const [returnType, setReturnType] = useState('return');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (order) {
            setReturnedItems([]);
            setReturnType('return');
            setNotes('');
            setError(null);
        }
    }, [order?._id]);

    const handleToggleReturn = (item) => {
        const itemId = item.itemId?._id || item.itemId;
        const isAlreadyAdded = returnedItems.find(ri => ri.itemId === itemId);
        if (isAlreadyAdded) {
            setReturnedItems(prev => prev.filter(ri => ri.itemId !== itemId));
        } else {
            const adjustedPrice = getAdjustedUnitRefund(item, order);
            setReturnedItems(prev => [...prev, {
                itemId,
                itemName: item.itemId?.name || item.itemName,
                quantity: 1,
                maxQuantity: item.quantity,
                price: adjustedPrice,
                listPrice: item.price,
                returnReason: '',
                isRestockable: true,
                isDamaged: false
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

    const updateReturnField = (itemId, field, value) => {
        setReturnedItems(prev => prev.map(ri =>
            ri.itemId === itemId ? { ...ri, [field]: value } : ri
        ));
    };

    const totalReturn = calculateReturnRefundTotal(order, returnedItems);

    const handleSubmit = async () => {
        if (returnedItems.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            await orderService.createOrderReturn({
                orderId: order._id,
                returnedItems: withAdjustedReturnPrices(order, returnedItems),
                notes
            });
            toast.success('Return processed successfully');
            onSuccess?.();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleContinueToPOS = () => {
        if (returnedItems.length === 0) return;

        setIsExchange(true);
        setExchangeCredit(totalReturn);
        const adjustedItems = withAdjustedReturnPrices(order, returnedItems);
        setGlobalReturnedItems(adjustedItems);
        setOriginalOrderId(order._id);

        navigate('/takeaway', {
            state: {
                isExchange: true,
                creditAmount: totalReturn,
                returnedItems: adjustedItems,
                originalOrderId: order._id,
                customer: order.customerId
            }
        });
    };

    if (!order) return null;

    return (
        <div className="space-y-8">
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            <section className="space-y-4">
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme.textSecondary}`}>
                    Select Action
                </h3>
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setReturnType('return')}
                        className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${returnType === 'return' ? 'border-orange-600 bg-orange-50/50 dark:bg-orange-900/20' : `${theme.borderLight} ${theme.surfaceBg}`}`}
                    >
                        <RotateCcw size={24} className={returnType === 'return' ? 'text-orange-600' : theme.textMuted} />
                        <span className={`font-black ${returnType === 'return' ? 'text-orange-600' : theme.textPrimary}`}>Direct Return</span>
                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>Instant Refund / Credit</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setReturnType('exchange')}
                        className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${returnType === 'exchange' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : `${theme.borderLight} ${theme.surfaceBg}`}`}
                    >
                        <ShoppingBag size={24} className={returnType === 'exchange' ? 'text-indigo-600' : theme.textMuted} />
                        <span className={`font-black ${returnType === 'exchange' ? 'text-indigo-600' : theme.textPrimary}`}>Exchange Items</span>
                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>Carry Credit to POS</span>
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${theme.textSecondary}`}>
                    <RotateCcw size={16} /> Select Items to Return
                </h3>
                <div className={`rounded-3xl border overflow-hidden ${theme.borderLight}`}>
                    {(order.items || []).map((item, idx) => {
                        const itemId = item.itemId?._id || item.itemId;
                        const isAdded = returnedItems.find(ri => ri.itemId === itemId);
                        return (
                            <div key={idx} className={`p-4 flex items-center justify-between transition-colors ${isAdded ? 'bg-orange-50/50 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleReturn(item)}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAdded ? 'bg-orange-600 border-orange-600 text-white' : theme.borderLight}`}
                                    >
                                        {isAdded && <CheckCircle2 size={16} />}
                                    </button>
                                    <div>
                                        <p className={`font-black ${theme.textPrimary}`}>{item.itemId?.name || item.itemName}</p>
                                                <p className={`text-xs font-bold ${theme.textMuted}`}>
                                                    Paid: {formatCurrency(getAdjustedUnitRefund(item, order))} x {item.quantity}
                                                    {getAdjustedUnitRefund(item, order) < item.price && (
                                                        <span className="line-through opacity-60 ml-1">{formatCurrency(item.price)}</span>
                                                    )}
                                                </p>
                                    </div>
                                </div>
                                {isAdded && (
                                    <div className="flex flex-col items-end gap-3">
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={() => updateReturnQty(itemId, -1)} className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 border ${theme.borderLight} ${theme.textPrimary}`}>-</button>
                                            <span className={`w-8 text-center font-black ${theme.textPrimary}`}>{isAdded.quantity}</span>
                                            <button type="button" onClick={() => updateReturnQty(itemId, 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 border ${theme.borderLight} ${theme.textPrimary}`}>+</button>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isAdded.isDamaged}
                                                onChange={(e) => updateReturnField(itemId, 'isDamaged', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${isAdded.isDamaged ? 'text-orange-600' : theme.textMuted}`}>Mark as Damaged</span>
                                        </label>
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
                    placeholder="Add reason for return/exchange..."
                    className={`w-full p-4 rounded-2xl border outline-none h-24 resize-none transition-all ${theme.surfaceBg} ${theme.borderLight} focus:border-indigo-500`}
                />
            </section>

            <div className={`p-6 rounded-3xl border ${theme.borderLight} ${theme.surfaceBg}`}>
                <div className="space-y-1 mb-6">
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span className={theme.textMuted}>{returnType === 'return' ? 'Refund Amount' : 'Exchange Credit'}</span>
                        <span className={returnType === 'return' ? 'text-orange-600' : 'text-indigo-600'}>
                            {returnType === 'return' ? '-' : ''}{formatCurrency(totalReturn)}
                        </span>
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>
                        {returnType === 'return' ? 'Amount will be returned to customer' : 'Credit will be applied in POS'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-sm ${theme.mode === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={returnType === 'exchange' ? handleContinueToPOS : handleSubmit}
                        disabled={loading || returnedItems.length === 0}
                        className={`flex-[2] py-4 rounded-2xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-2
                            ${loading ? 'bg-gray-400' : returnType === 'exchange' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'} active:scale-[0.98] disabled:opacity-50`}
                    >
                        {loading ? 'Processing...' : returnType === 'exchange' ? (
                            <>
                                <Plus size={20} />
                                Continue to POS for Exchange
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={20} />
                                Confirm Return & Refund
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderReturnForm;
