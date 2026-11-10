import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { 
    RotateCcw, Plus, CheckCircle2, AlertCircle, ShoppingBag, 
    AlertTriangle, PackageCheck, Ban
} from 'lucide-react';
import { orderService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext';
import { toast } from 'react-hot-toast';
import {
    getAdjustedUnitRefund,
    calculateReturnRefundTotal,
    withAdjustedReturnPrices,
} from '../../utils/returnAmount';
import CommonSelect from '../ui/CommonSelect';

export const RETURN_REASONS = [
    { label: 'Defective / Damaged Item', value: 'Defective / Damaged Item' },
    { label: 'Wrong Item Delivered', value: 'Wrong Item Delivered' },
    { label: 'Customer Dissatisfied / Quality Issue', value: 'Customer Dissatisfied / Quality Issue' },
    { label: 'Customer Changed Mind', value: 'Customer Changed Mind' },
    { label: 'Expired / Spoiled Item', value: 'Expired / Spoiled Item' },
    { label: 'Incorrect Billing / Price', value: 'Incorrect Billing / Price' },
    { label: 'Other', value: 'Other' }
];

const OrderReturnForm = ({ order, onSuccess, onCancel }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const {
        setIsExchange, setExchangeCredit, setReturnedItems: setGlobalReturnedItems,
        setOriginalOrderId
    } = useOrder();

    const [loading, setLoading] = useState(false);
    const [fetchingReturns, setFetchingReturns] = useState(false);
    const [orderReturns, setOrderReturns] = useState(order?.returns || []);
    const [returnedItems, setReturnedItems] = useState([]);
    const [returnType, setReturnType] = useState('return');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    // Fetch existing returns for this order to prevent returning multiple times
    useEffect(() => {
        let isMounted = true;
        if (order?._id) {
            setReturnedItems([]);
            setReturnType('return');
            setNotes('');
            setError(null);

            setFetchingReturns(true);
            orderService.getOrderReturns({ orderId: order._id })
                .then(res => {
                    if (isMounted) {
                        const list = Array.isArray(res) ? res : (res?.data || []);
                        setOrderReturns(list);
                    }
                })
                .catch(err => {
                    console.warn("Could not load previous returns for order:", err);
                })
                .finally(() => {
                    if (isMounted) setFetchingReturns(false);
                });
        }
        return () => { isMounted = false; };
    }, [order?._id]);

    // Calculate returned quantity across all previous returns for each item
    const getRawItemId = (item) => {
        const id = item?.itemId?._id || item?.itemId || item?._id;
        return String(id || '');
    };

    const alreadyReturnedMap = useMemo(() => {
        const map = {};
        (orderReturns || []).forEach(ret => {
            (ret.items || []).forEach(ri => {
                const idStr = String(ri.itemId?._id || ri.itemId || '');
                map[idStr] = (map[idStr] || 0) + (Number(ri.quantity) || 0);
            });
        });
        return map;
    }, [orderReturns]);

    // Determine returnable capacity for each item
    const itemsAvailability = useMemo(() => {
        return (order?.items || []).map(item => {
            const rawId = getRawItemId(item);
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
    }, [order?.items, alreadyReturnedMap]);

    // Check if the entire invoice is already fully returned
    const isOrderFullyReturned = useMemo(() => {
        if (!order?.items || order.items.length === 0) return false;
        if (order.returnStatus === 'FULL' || order.isFullyReturned) return true;
        return itemsAvailability.length > 0 && itemsAvailability.every(i => i.isFullyReturned);
    }, [order, itemsAvailability]);

    const handleToggleReturn = (item, remainingReturnable) => {
        if (remainingReturnable <= 0) {
            toast.error('This item has already been fully returned.');
            return;
        }

        const rawId = getRawItemId(item);
        const isAlreadyAdded = returnedItems.find(ri => ri.itemId === rawId);
        if (isAlreadyAdded) {
            setReturnedItems(prev => prev.filter(ri => ri.itemId !== rawId));
        } else {
            const adjustedPrice = getAdjustedUnitRefund(item, order);
            setReturnedItems(prev => [...prev, {
                itemId: rawId,
                itemName: item.itemId?.name || item.itemName || 'Item',
                quantity: 1,
                maxQuantity: remainingReturnable,
                damagedQuantity: 0,
                price: adjustedPrice,
                listPrice: item.price,
                returnReason: 'Defective / Damaged Item',
                customReason: '',
                isRestockable: true,
                isDamaged: false
            }]);
        }
    };

    const updateReturnQty = (itemId, delta) => {
        setReturnedItems(prev => prev.map(ri => {
            if (ri.itemId === itemId) {
                const newQty = Math.max(1, Math.min(ri.maxQuantity, ri.quantity + delta));
                const newDamagedQty = Math.min(ri.damagedQuantity || 0, newQty);
                return {
                    ...ri,
                    quantity: newQty,
                    damagedQuantity: newDamagedQty,
                    isDamaged: newDamagedQty > 0,
                    isRestockable: (newQty - newDamagedQty) > 0
                };
            }
            return ri;
        }));
    };

    const updateDamagedQty = (itemId, delta) => {
        setReturnedItems(prev => prev.map(ri => {
            if (ri.itemId === itemId) {
                const currentDamaged = ri.damagedQuantity || 0;
                const newDamaged = Math.max(0, Math.min(ri.quantity, currentDamaged + delta));
                return {
                    ...ri,
                    damagedQuantity: newDamaged,
                    isDamaged: newDamaged > 0,
                    isRestockable: (ri.quantity - newDamaged) > 0
                };
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

    const totalDamagedQty = useMemo(() => {
        return returnedItems.reduce((sum, item) => sum + (Number(item.damagedQuantity) || 0), 0);
    }, [returnedItems]);

    const totalRestockableQty = useMemo(() => {
        return returnedItems.reduce((sum, item) => sum + Math.max(0, item.quantity - (Number(item.damagedQuantity) || 0)), 0);
    }, [returnedItems]);

    const preparePayloadItems = () => {
        return withAdjustedReturnPrices(order, returnedItems).map(item => {
            const damagedQty = Math.max(0, Math.min(Number(item.damagedQuantity) || 0, item.quantity));
            const restockableQty = Math.max(0, item.quantity - damagedQty);
            const finalReason = item.returnReason === 'Other' && item.customReason
                ? item.customReason.trim()
                : (item.customReason ? `${item.returnReason}: ${item.customReason.trim()}` : item.returnReason);

            return {
                ...item,
                damagedQuantity: damagedQty,
                restockableQuantity: restockableQty,
                isDamaged: damagedQty > 0,
                isRestockable: restockableQty > 0,
                returnReason: finalReason || 'Customer Return'
            };
        });
    };

    const handleSubmit = async () => {
        if (returnedItems.length === 0) {
            toast.error('Please select at least one item to return');
            return;
        }

        // Validate reasons
        for (const item of returnedItems) {
            if (item.returnReason === 'Other' && !item.customReason?.trim()) {
                toast.error(`Please provide a reason for "${item.itemName}"`);
                return;
            }
        }

        setLoading(true);
        setError(null);
        try {
            const payloadItems = preparePayloadItems();
            await orderService.createOrderReturn({
                orderId: order._id,
                returnedItems: payloadItems,
                notes: notes.trim()
            });
            toast.success('Return processed successfully');
            onSuccess?.();
        } catch (err) {
            console.error('Error processing return:', err);
            setError(err.response?.data?.message || err.message || 'Failed to process return');
        } finally {
            setLoading(false);
        }
    };

    const handleContinueToPOS = () => {
        if (returnedItems.length === 0) {
            toast.error('Please select at least one item to exchange');
            return;
        }

        setIsExchange(true);
        setExchangeCredit(totalReturn);
        const payloadItems = preparePayloadItems();
        setGlobalReturnedItems(payloadItems);
        setOriginalOrderId(order._id);

        navigate('/takeaway', {
            state: {
                isExchange: true,
                creditAmount: totalReturn,
                returnedItems: payloadItems,
                originalOrderId: order._id,
                customer: order.customerId
            }
        });
    };

    if (!order) return null;

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {/* Fully returned banner */}
            {isOrderFullyReturned && (
                <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3.5 text-rose-800 dark:text-rose-300">
                    <Ban size={24} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wide">Invoice Already Fully Returned</h4>
                        <p className="text-xs font-semibold mt-1 opacity-90">
                            All items from this invoice have already been returned in previous transactions. Additional returns or exchanges cannot be processed for this order.
                        </p>
                    </div>
                </div>
            )}

            {/* Previous Returns History Info */}
            {orderReturns.length > 0 && !isOrderFullyReturned && (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span>This order has {orderReturns.length} previous return{orderReturns.length > 1 ? 's' : ''}. Quantities below show remaining returnable balance.</span>
                    </div>
                </div>
            )}

            {/* Action Mode Toggle */}
            <section className="space-y-3">
                <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${theme.textSecondary}`}>
                    Select Action
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setReturnType('return')}
                        disabled={isOrderFullyReturned}
                        className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 text-center ${
                            returnType === 'return'
                                ? 'border-orange-600 bg-orange-50/60 dark:bg-orange-950/30 shadow-sm'
                                : `${theme.borderLight} ${theme.surfaceBg} hover:opacity-80`
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <RotateCcw size={22} className={returnType === 'return' ? 'text-orange-600' : theme.textMuted} />
                        <span className={`text-sm font-black ${returnType === 'return' ? 'text-orange-600' : theme.textPrimary}`}>Direct Return</span>
                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>Instant Refund to Customer</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setReturnType('exchange')}
                        disabled={isOrderFullyReturned}
                        className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 text-center ${
                            returnType === 'exchange'
                                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-sm'
                                : `${theme.borderLight} ${theme.surfaceBg} hover:opacity-80`
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <ShoppingBag size={22} className={returnType === 'exchange' ? 'text-indigo-600' : theme.textMuted} />
                        <span className={`text-sm font-black ${returnType === 'exchange' ? 'text-indigo-600' : theme.textPrimary}`}>Exchange Items</span>
                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>Carry Credit to POS Register</span>
                    </button>
                </div>
            </section>

            {/* Items Selection */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${theme.textSecondary}`}>
                        <RotateCcw size={15} /> Select Items &amp; Specify Condition
                    </h3>
                    {returnedItems.length > 0 && (
                        <span className="text-[11px] font-bold text-orange-600">
                            {returnedItems.length} item{returnedItems.length > 1 ? 's' : ''} selected
                        </span>
                    )}
                </div>

                <div className={`rounded-3xl border overflow-hidden divide-y ${theme.borderLight}`}>
                    {(order.items || []).map((item, idx) => {
                        const rawId = getRawItemId(item);
                        const isAdded = returnedItems.find(ri => ri.itemId === rawId);
                        const availability = itemsAvailability.find(a => a.rawId === rawId) || {
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
                                            ? 'bg-orange-50/40 dark:bg-orange-950/20' 
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <button
                                            type="button"
                                            disabled={isFullyReturned || isOrderFullyReturned}
                                            onClick={() => handleToggleReturn(item, remainingReturnable)}
                                            className={`w-6 h-6 rounded-lg border-2 mt-0.5 flex items-center justify-center transition-all shrink-0 ${
                                                isFullyReturned 
                                                    ? 'border-gray-300 dark:border-slate-700 bg-gray-200 dark:bg-slate-800 cursor-not-allowed'
                                                    : isAdded 
                                                        ? 'bg-orange-600 border-orange-600 text-white shadow-sm' 
                                                        : theme.borderLight
                                            }`}
                                        >
                                            {isAdded && <CheckCircle2 size={16} />}
                                            {isFullyReturned && <Ban size={12} className="text-gray-400" />}
                                        </button>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`font-black text-sm ${theme.textPrimary}`}>
                                                    {item.itemId?.name || item.itemName}
                                                </p>
                                                {isFullyReturned ? (
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                                                        Already Returned ({alreadyReturned}/{origQty})
                                                    </span>
                                                ) : alreadyReturned > 0 ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                                        Returned: {alreadyReturned} • Remaining: {remainingReturnable}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <p className={`text-xs font-bold mt-0.5 ${theme.textMuted}`}>
                                                Paid: {formatCurrency(getAdjustedUnitRefund(item, order))} &times; {origQty}
                                                {getAdjustedUnitRefund(item, order) < (item.price || 0) && (
                                                    <span className="line-through opacity-60 ml-1.5">{formatCurrency(item.price)}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {!isAdded && !isFullyReturned && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleReturn(item, remainingReturnable)}
                                            className="px-3 py-1 rounded-xl text-xs font-black text-orange-600 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 transition-colors"
                                        >
                                            + Return
                                        </button>
                                    )}
                                </div>

                                {/* Expanded Item Return Controls */}
                                {isAdded && (
                                    <div className="mt-4 pt-4 border-t border-orange-200/60 dark:border-orange-900/40 space-y-3.5 pl-9">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Return Quantity Stepper */}
                                            <div className={`p-3 rounded-2xl border ${theme.borderLight} bg-white dark:bg-slate-900 flex items-center justify-between`}>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                                        Return Qty
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        Max returnable: {isAdded.maxQuantity}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateReturnQty(rawId, -1)}
                                                        disabled={isAdded.quantity <= 1}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border ${theme.borderLight} ${theme.textPrimary} hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30`}
                                                    >
                                                        -
                                                    </button>
                                                    <span className={`w-8 text-center font-black text-sm ${theme.textPrimary}`}>
                                                        {isAdded.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateReturnQty(rawId, 1)}
                                                        disabled={isAdded.quantity >= isAdded.maxQuantity}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border ${theme.borderLight} ${theme.textPrimary} hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quantity-Wise Damage Stepper */}
                                            <div className={`p-3 rounded-2xl border ${theme.borderLight} bg-white dark:bg-slate-900 flex items-center justify-between`}>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1 block">
                                                        <AlertTriangle size={12} /> Damaged Qty
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        Restockable: {isAdded.quantity - (isAdded.damagedQuantity || 0)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateDamagedQty(rawId, -1)}
                                                        disabled={!isAdded.damagedQuantity || isAdded.damagedQuantity <= 0}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border ${theme.borderLight} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30`}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-8 text-center font-black text-sm text-rose-600">
                                                        {isAdded.damagedQuantity || 0}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateDamagedQty(rawId, 1)}
                                                        disabled={(isAdded.damagedQuantity || 0) >= isAdded.quantity}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border ${theme.borderLight} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30`}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Condition / Restock Status Feedback */}
                                        <div className="flex items-center gap-2 text-[11px] font-bold">
                                            {(isAdded.damagedQuantity || 0) === 0 ? (
                                                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900/40">
                                                    <CheckCircle2 size={13} className="text-emerald-600" />
                                                    All {isAdded.quantity} will be restocked to sellable inventory
                                                </span>
                                            ) : isAdded.damagedQuantity === isAdded.quantity ? (
                                                <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/40">
                                                    <AlertCircle size={13} className="text-rose-600" />
                                                    All {isAdded.quantity} marked as damaged (will not restock)
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 border border-amber-200 dark:border-amber-900/40">
                                                    <AlertTriangle size={13} className="text-amber-600" />
                                                    {isAdded.damagedQuantity} damaged, {isAdded.quantity - isAdded.damagedQuantity} restocked to sellable inventory
                                                </span>
                                            )}
                                        </div>

                                        {/* Return Reason Selector */}
                                        <div className="space-y-1.5">
                                            <CommonSelect
                                                label="Return Reason"
                                                value={isAdded.returnReason}
                                                onChange={(val) => updateReturnField(rawId, 'returnReason', val)}
                                                options={RETURN_REASONS}
                                                searchable={false}
                                                placeholder="Select return reason..."
                                                size="sm"
                                            />

                                            {/* Custom detail input if 'Other' or extra notes */}
                                            {isAdded.returnReason === 'Other' && (
                                                <input
                                                    type="text"
                                                    value={isAdded.customReason || ''}
                                                    onChange={(e) => updateReturnField(rawId, 'customReason', e.target.value)}
                                                    placeholder="Please specify return reason..."
                                                    className={`w-full mt-1.5 p-2 rounded-xl border text-xs font-bold outline-none ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-orange-500`}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* General Notes */}
            <section className="space-y-2">
                <h3 className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                    Overall Notes (Optional)
                </h3>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add additional remarks for this return/exchange transaction..."
                    className={`w-full p-3.5 rounded-2xl border outline-none h-20 resize-none text-xs font-bold transition-all ${theme.surfaceBg} ${theme.borderLight} focus:border-orange-500`}
                />
            </section>

            {/* Financial Summary & Actions */}
            <div className={`p-6 rounded-3xl border ${theme.borderLight} ${theme.surfaceBg} space-y-5 shadow-sm`}>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-black">
                        <span className={theme.textMuted}>{returnType === 'return' ? 'Total Refund Amount' : 'Total Exchange Credit'}</span>
                        <span className={`text-xl font-black ${returnType === 'return' ? 'text-orange-600' : 'text-indigo-600'}`}>
                            {formatCurrency(totalReturn)}
                        </span>
                    </div>

                    {returnedItems.length > 0 && (
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 pt-1 border-t border-gray-100 dark:border-slate-800">
                            <span>Units returning: {returnedItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
                            <span>&bull;</span>
                            <span className="text-rose-600">Damaged: {totalDamagedQty}</span>
                            <span>&bull;</span>
                            <span className="text-emerald-600">Restocked: {totalRestockableQty}</span>
                        </div>
                    )}

                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                        {returnType === 'return' ? 'Refund will be recorded and cash/card credited' : 'Credit will automatically apply at POS checkout'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className={`flex-1 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs border ${theme.borderLight} ${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors`}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={returnType === 'exchange' ? handleContinueToPOS : handleSubmit}
                        disabled={loading || returnedItems.length === 0 || isOrderFullyReturned}
                        className={`flex-[2] py-3.5 rounded-2xl font-black text-white text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2
                            ${loading ? 'bg-gray-400' : returnType === 'exchange' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/25'} active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {loading ? 'Processing...' : isOrderFullyReturned ? 'Fully Returned' : returnType === 'exchange' ? (
                            <>
                                <Plus size={16} />
                                Continue to POS for Exchange
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                Confirm Return &amp; Refund
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderReturnForm;
