import React, { useState, useEffect } from 'react';
import {
    PackageCheck, Search, Calendar, FileText, CheckCircle2, ArrowRight, RefreshCw
} from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-hot-toast';

const GoodsReceivedTab = () => {
    const { theme } = useTheme();
    const { activeBranchId, branches } = useApp();
    const selectedBranchId = activeBranchId || (branches && branches[0]?._id);
    const [grns, setGrns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadReceipts = () => {
        setLoading(true);
        PurchaseService.getGoodsReceipts({ branchId: selectedBranchId })
            .then(res => setGrns(res.data || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadReceipts();
    }, [selectedBranchId]);

    const handleConvertToInvoice = async (grnId) => {
        try {
            const res = await PurchaseService.convertReceiptToInvoice(grnId);
            toast.success(res.message || 'Purchase invoice generated successfully!');
            loadReceipts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to convert receipt to invoice');
        }
    };

    const filteredGRNs = grns.filter(g =>
        g.grnNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.supplierId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.supplierChallanNo?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by GRN No., Supplier or Challan..."
                        className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold border outline-none transition-all ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} placeholder:${theme.textMuted} focus:border-indigo-500`}
                    />
                </div>

                <button
                    onClick={loadReceipts}
                    className={`p-2.5 rounded-2xl border transition-all ${
                        theme.mode === 'dark' 
                            ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700' 
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* GRN Table */}
            <div className={`rounded-3xl border overflow-hidden shadow-sm ${theme.surfaceBg} ${theme.borderLight}`}>
                {loading ? (
                    <div className="py-16 text-center opacity-60 text-xs font-bold">
                        Loading goods received logs...
                    </div>
                ) : filteredGRNs.length === 0 ? (
                    <div className="py-16 text-center opacity-60">
                        <PackageCheck size={36} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-bold">No goods receipt records found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className={`border-b ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-950/80 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                                    <th className="py-3.5 px-4 font-black uppercase">GRN Number</th>
                                    <th className="py-3.5 px-4 font-black uppercase">PO Ref</th>
                                    <th className="py-3.5 px-4 font-black uppercase">Supplier</th>
                                    <th className="py-3.5 px-4 font-black uppercase">Challan No</th>
                                    <th className="py-3.5 px-4 font-black uppercase text-center">Received Qty</th>
                                    <th className="py-3.5 px-4 font-black uppercase text-right">Value</th>
                                    <th className="py-3.5 px-4 font-black uppercase text-center">Stock Updated</th>
                                    <th className="py-3.5 px-4 font-black uppercase text-right">Invoice Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.borderLight}`}>
                                {filteredGRNs.map((grn) => (
                                    <tr key={grn._id} className={theme.mode === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}>
                                        <td className="py-3.5 px-4 font-black text-indigo-500">
                                            {grn.grnNumber}
                                            <div className={`text-[10px] font-semibold ${theme.textMuted}`}>
                                                {new Date(grn.receiptDate).toLocaleDateString('en-IN')}
                                            </div>
                                        </td>
                                        <td className={`py-3.5 px-4 font-bold ${theme.textPrimary}`}>
                                            {grn.purchaseOrderId?.poNumber || 'Direct'}
                                        </td>
                                        <td className={`py-3.5 px-4 font-bold ${theme.textPrimary}`}>
                                            {grn.supplierId?.name || 'N/A'}
                                        </td>
                                        <td className={`py-3.5 px-4 font-semibold ${theme.textSecondary}`}>
                                            {grn.supplierChallanNo || '—'}
                                        </td>
                                        <td className="py-3.5 px-4 text-center font-black text-emerald-500">
                                            +{grn.totalReceivedItems || 0} pcs
                                        </td>
                                        <td className={`py-3.5 px-4 text-right font-black ${theme.textHeading}`}>
                                            {formatCurrency(grn.totalValue)}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-transparent border border-emerald-500 text-emerald-600 dark:text-emerald-400">
                                                ✓ YES (+Stock)
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            {grn.invoiceCreated ? (
                                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-transparent border border-blue-500 text-blue-600 dark:text-blue-400">
                                                    Invoice Created
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleConvertToInvoice(grn._id)}
                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                                                >
                                                    + Create Invoice
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoodsReceivedTab;
