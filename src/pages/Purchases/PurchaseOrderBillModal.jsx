import React, { useState, useEffect } from 'react';
import {
    X, Save, Send, Printer, Share2, Plus, Trash2, Calendar, Building2,
    FileText, CheckCircle2, AlertCircle, ShoppingCart
} from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-hot-toast';

const PurchaseOrderBillModal = ({ isOpen, onClose, initialData, onOrderSaved }) => {
    const { theme, isDark } = useTheme();
    const { activeBranchId, branches } = useApp();
    const [loading, setLoading] = useState(false);

    // Form states
    const [supplier, setSupplier] = useState(null);
    const [expectedDate, setExpectedDate] = useState('');
    const [items, setItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [taxRate, setTaxRate] = useState(0); // overall tax %
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        if (!isOpen || !initialData) return;
        setSupplier(initialData.supplier || null);
        setItems(initialData.items || []);

        // Default expected delivery date: 3 days from now
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setExpectedDate(d.toISOString().split('T')[0]);
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    // Handle line item quantity / price changes
    const handleItemChange = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = Number(value) || 0;
        setItems(updated);
    };

    // Remove item
    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Calculations
    const totalOrderQty = items.reduce((sum, item) => sum + (Number(item.orderedQty) || 0), 0);
    const subtotal = items.reduce((sum, item) => sum + ((Number(item.orderedQty) || 0) * (Number(item.unitPrice) || 0)), 0);
    const discountAmount = Number(discount) || 0;
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = (taxableSubtotal * (Number(taxRate) || 0)) / 100;
    const grandTotal = taxableSubtotal + taxAmount;

    // Save PO handler (Status = DRAFT or SENT)
    const handleSaveOrder = async (statusToSet = 'DRAFT') => {
        if (!supplier || !supplier._id) {
            toast.error('Supplier is required');
            return;
        }
        if (items.length === 0) {
            toast.error('At least one item is required in the purchase order');
            return;
        }

        setLoading(true);
        try {
            const selectedBranchId = activeBranchId || localStorage.getItem('pos_activeBranchId') || localStorage.getItem('pos_branchId') || (branches && branches[0]?._id);
            const payload = {
                supplierId: supplier._id,
                branchId: selectedBranchId,
                expectedDate: expectedDate ? new Date(expectedDate) : null,
                items: items.map(i => ({
                    productId: i.productId,
                    productName: i.productName,
                    itemCode: i.itemCode,
                    unitName: i.unitName || 'pcs',
                    currentStock: i.currentStock,
                    reorderLevel: i.reorderLevel,
                    orderedQty: i.orderedQty,
                    unitPrice: i.unitPrice,
                    taxRate: taxRate,
                    discount: 0
                })),
                notes,
                status: statusToSet
            };

            const res = await PurchaseService.createPurchaseOrder(payload);
            toast.success(statusToSet === 'SENT' ? 'Purchase order sent to supplier!' : 'Purchase order draft saved!');
            
            if (onOrderSaved) onOrderSaved(res.data);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save purchase order');
        } finally {
            setLoading(false);
        }
    };

    // Print / PDF Handler
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn print:p-0 print:bg-white">
            <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} overflow-hidden print:shadow-none print:border-none print:max-h-none`}>
                
                {/* ── Header ── */}
                <div className={`px-6 py-4 border-b flex items-center justify-between print:hidden ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h2 className={`text-base font-black tracking-tight ${theme.textHeading}`}>Purchase Order (PO Draft)</h2>
                            <p className={`text-xs font-semibold ${theme.textMuted}`}>
                                Stock will NOT be increased until goods are actually received.
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className={`p-2 rounded-full transition-all ${theme.mode === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* ── Bill Document Printable Area ── */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    
                    {/* Bill Header Info */}
                    <div className={`flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b ${theme.borderLight}`}>
                        <div>
                            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 inline-block mb-2">
                                Purchase Order Document
                            </span>
                            <h3 className={`text-xl font-black ${theme.textHeading}`}>{supplier?.name || 'Supplier Name'}</h3>
                            <p className={`text-xs font-semibold ${theme.textMuted} mt-1`}>
                                {supplier?.contactPerson ? `Contact: ${supplier.contactPerson} • ` : ''}
                                {supplier?.phone ? `Phone: ${supplier.phone}` : ''}
                            </p>
                            {supplier?.address && (
                                <p className={`text-xs ${theme.textMuted}`}>
                                    {supplier.address.line1}, {supplier.address.city}, {supplier.address.state?.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 text-right">
                            <div className={`text-xs font-bold ${theme.textMuted}`}>PO DATE: {new Date().toLocaleDateString('en-IN')}</div>
                            
                            <div className="flex items-center justify-end gap-2 text-xs font-bold">
                                <span className={theme.textMuted}>Expected Delivery:</span>
                                <input
                                    type="date"
                                    value={expectedDate}
                                    onChange={(e) => setExpectedDate(e.target.value)}
                                    className={`px-3 py-1 rounded-xl border text-xs font-bold outline-none print:border-none ${
                                        theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bill Line Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className={`border-b ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-800/40 text-slate-400' : 'bg-slate-100/70 text-slate-600'}`}>
                                    <th className="py-3 px-3 font-black uppercase">Product</th>
                                    <th className="py-3 px-3 font-black uppercase text-center">Stock Now</th>
                                    <th className="py-3 px-3 font-black uppercase text-center">Order Qty</th>
                                    <th className="py-3 px-3 font-black uppercase text-right">Rate</th>
                                    <th className="py-3 px-3 font-black uppercase text-right">Amount</th>
                                    <th className="py-3 px-3 font-black uppercase text-center print:hidden">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.borderLight}`}>
                                {items.map((item, idx) => {
                                    const amount = (item.orderedQty || 0) * (item.unitPrice || 0);

                                    return (
                                        <tr key={idx} className={theme.mode === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                                            <td className={`py-3 px-3 font-bold ${theme.textHeading}`}>
                                                <div>{item.productName}</div>
                                                {item.itemCode && <span className={`text-[10px] ${theme.textMuted}`}>SKU: {item.itemCode}</span>}
                                            </td>
                                            <td className={`py-3 px-3 text-center font-semibold ${theme.textMuted}`}>
                                                {item.currentStock || 0} {item.unitName || 'pcs'}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.orderedQty}
                                                    onChange={(e) => handleItemChange(idx, 'orderedQty', e.target.value)}
                                                    className={`w-20 px-2 py-1 rounded-xl text-center font-black border outline-none ${
                                                        theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                                    }`}
                                                />
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                                    className={`w-24 px-2 py-1 rounded-xl text-right font-black border outline-none ${
                                                        theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                                    }`}
                                                />
                                            </td>
                                            <td className="py-3 px-3 text-right font-black text-indigo-500">
                                                {formatCurrency(amount)}
                                            </td>
                                            <td className="py-3 px-3 text-center print:hidden">
                                                <button
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Summary & Notes */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t ${theme.borderLight}`}>
                        {/* Notes */}
                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>
                                Order Notes / Instructions
                            </label>
                            <textarea
                                rows="3"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add instructions for supplier delivery..."
                                className={`w-full p-3 rounded-2xl border text-xs font-semibold outline-none ${
                                    theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                            />
                        </div>

                        {/* Calculation Card */}
                        <div className={`p-4 rounded-2xl border space-y-2 text-xs ${theme.surfaceBg} ${theme.borderLight}`}>
                            <div className="flex justify-between font-semibold">
                                <span className={theme.textMuted}>Total Order Qty:</span>
                                <span className={`font-bold ${theme.textHeading}`}>{totalOrderQty} items</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span className={theme.textMuted}>Subtotal:</span>
                                <span className={`font-bold ${theme.textHeading}`}>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center font-semibold">
                                <span className={theme.textMuted}>Tax Rate (%):</span>
                                <input
                                    type="number"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                                    className={`w-16 px-2 py-0.5 text-right rounded-lg border font-bold text-xs ${
                                        theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                />
                            </div>
                            <div className={`flex justify-between font-semibold pt-2 border-t ${theme.borderLight} text-sm`}>
                                <span className={`font-black ${theme.textHeading}`}>Estimated Grand Total:</span>
                                <span className="font-black text-indigo-500 text-base">{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Footer Action Bar ── */}
                <div className={`p-5 border-t flex flex-wrap items-center justify-between gap-3 print:hidden ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                                theme.mode === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <Printer size={15} /> Print / PDF
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleSaveOrder('DRAFT')}
                            disabled={loading}
                            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                                theme.mode === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Save Draft
                        </button>
                        
                        <button
                            onClick={() => handleSaveOrder('SENT')}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                        >
                            <Send size={15} /> Send Purchase Order
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PurchaseOrderBillModal;
