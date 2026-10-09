import React, { useState, useEffect } from 'react';
import {
    X, CheckCircle, PackageCheck, AlertCircle, Calendar, Hash, FileText, ArrowRight
} from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-hot-toast';

const ReceiveGoodsModal = ({ isOpen, onClose, purchaseOrder, onReceiptConfirmed }) => {
    const { theme, isDark } = useTheme();
    const { activeBranchId, branches } = useApp();
    const [loading, setLoading] = useState(false);
    
    const [supplierChallanNo, setSupplierChallanNo] = useState('');
    const [notes, setNotes] = useState('');
    const [createInvoice, setCreateInvoice] = useState(false);

    // Items being received: { poItemId: { receivedQtyNow, batchNumber, expiryDate } }
    const [receivedItems, setReceivedItems] = useState({});

    useEffect(() => {
        if (!isOpen || !purchaseOrder) return;
        setSupplierChallanNo('');
        setNotes('');
        setCreateInvoice(false);

        // Pre-fill receiving now with pending qty
        const initial = {};
        (purchaseOrder.items || []).forEach(item => {
            initial[item._id] = {
                poItemId: item._id,
                productId: item.productId,
                receivedQtyNow: item.pendingQty || (item.orderedQty - (item.receivedQty || 0)),
                batchNumber: '',
                expiryDate: ''
            };
        });
        setReceivedItems(initial);
    }, [isOpen, purchaseOrder]);

    if (!isOpen || !purchaseOrder) return null;

    const handleItemChange = (poItemId, field, value) => {
        setReceivedItems(prev => ({
            ...prev,
            [poItemId]: {
                ...prev[poItemId],
                [field]: value
            }
        }));
    };

    const handleConfirmReceipt = async () => {
        const payloadItems = Object.values(receivedItems)
            .filter(i => Number(i.receivedQtyNow) > 0)
            .map(i => ({
                poItemId: i.poItemId,
                productId: i.productId,
                receivedQtyNow: Number(i.receivedQtyNow),
                batchNumber: i.batchNumber,
                expiryDate: i.expiryDate ? new Date(i.expiryDate) : null
            }));

        if (payloadItems.length === 0) {
            toast.error('Please enter at least 1 item quantity to receive');
            return;
        }

        setLoading(true);
        try {
            const selectedBranchId = activeBranchId || localStorage.getItem('pos_activeBranchId') || localStorage.getItem('pos_branchId') || (branches && branches[0]?._id) || purchaseOrder.branchId;
            const payload = {
                purchaseOrderId: purchaseOrder._id,
                branchId: selectedBranchId,
                supplierChallanNo,
                items: payloadItems,
                notes,
                createInvoice
            };

            const res = await PurchaseService.createGoodsReceipt(payload);
            toast.success(res.message || 'Goods receipt recorded and stock updated!');
            
            if (onReceiptConfirmed) onReceiptConfirmed(res.data);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to record goods receipt');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
            <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} overflow-hidden`}>
                
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <PackageCheck size={22} />
                        </div>
                        <div>
                            <h2 className={`text-base font-black tracking-tight ${theme.textHeading}`}>Receive Goods & Update Inventory</h2>
                            <p className={`text-xs font-semibold ${theme.textMuted}`}>
                                PO: <span className="font-bold text-indigo-500">{purchaseOrder.poNumber}</span> • Supplier: {purchaseOrder.supplierId?.name || 'Supplier'}
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className={`p-2 rounded-full transition-all ${theme.mode === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form & Table */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    {/* Top Inputs: Delivery Challan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${theme.textMuted}`}>
                                Supplier Delivery Challan / Invoice No.
                            </label>
                            <input
                                type="text"
                                value={supplierChallanNo}
                                onChange={(e) => setSupplierChallanNo(e.target.value)}
                                placeholder="e.g., CH-990123"
                                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                                    theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${theme.textMuted}`}>
                                Delivery Notes
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any damaged stock or notes..."
                                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                                    theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                            />
                        </div>
                    </div>

                    {/* Items Receiving Table */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider mb-3 text-indigo-500">
                            Verify Delivered Items & Quantities
                        </h4>
                        <div className={`overflow-x-auto rounded-2xl border ${theme.borderLight}`}>
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className={`border-b ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-800/40 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                        <th className="py-3 px-3 font-black uppercase">Product</th>
                                        <th className="py-3 px-3 font-black uppercase text-center">Ordered</th>
                                        <th className="py-3 px-3 font-black uppercase text-center">Prev Received</th>
                                        <th className="py-3 px-3 font-black uppercase text-center">Pending</th>
                                        <th className="py-3 px-3 font-black uppercase text-center bg-emerald-500/10 text-emerald-500">
                                            Receiving Now *
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme.borderLight}`}>
                                    {(purchaseOrder.items || []).map((item) => {
                                        const rItem = receivedItems[item._id] || {};

                                        return (
                                            <tr key={item._id} className={theme.mode === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                                                <td className={`py-3 px-3 font-bold ${theme.textHeading}`}>
                                                    {item.productName}
                                                    {item.itemCode && <span className={`block text-[10px] ${theme.textMuted}`}>SKU: {item.itemCode}</span>}
                                                </td>
                                                <td className={`py-3 px-3 text-center font-semibold ${theme.textMuted}`}>
                                                    {item.orderedQty} {item.unitName}
                                                </td>
                                                <td className="py-3 px-3 text-center font-semibold text-blue-500">
                                                    {item.receivedQty || 0} {item.unitName}
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold text-amber-500">
                                                    {item.pendingQty} {item.unitName}
                                                </td>
                                                <td className="py-3 px-3 text-center bg-emerald-500/5">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.pendingQty}
                                                        value={rItem.receivedQtyNow !== undefined ? rItem.receivedQtyNow : item.pendingQty}
                                                        onChange={(e) => handleItemChange(item._id, 'receivedQtyNow', e.target.value)}
                                                        className={`w-24 px-3 py-1.5 rounded-xl text-center font-black border border-emerald-500/50 outline-none ${
                                                            theme.mode === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                                                        }`}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Checkbox option to also create Purchase Invoice */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${theme.surfaceBg} ${theme.borderLight}`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="createInvoiceChk"
                                checked={createInvoice}
                                onChange={(e) => setCreateInvoice(e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="createInvoiceChk" className={`text-xs font-bold cursor-pointer ${theme.textPrimary}`}>
                                Auto-generate Purchase Invoice in Purchases tab for Accounts Payable
                            </label>
                        </div>
                    </div>

                </div>

                {/* Footer Action */}
                <div className={`p-5 border-t flex items-center justify-between ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50'}`}>
                    <button
                        onClick={onClose}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider ${
                            theme.mode === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleConfirmReceipt}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xl shadow-emerald-600/30 transition-all active:scale-95"
                    >
                        <CheckCircle size={16} /> Confirm Receipt & Increase Stock
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ReceiveGoodsModal;
