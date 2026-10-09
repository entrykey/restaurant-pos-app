import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Eye, PackageCheck, AlertTriangle, FileText, CheckCircle, Clock, XCircle,
    RefreshCw, Filter, ArrowRight, Building2, Package, ShoppingBag
} from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-hot-toast';
import SupplierRestockModal from './SupplierRestockModal';
import PurchaseOrderBillModal from './PurchaseOrderBillModal';
import ReceiveGoodsModal from './ReceiveGoodsModal';

const STATUS_PILL = {
    DRAFT: 'bg-transparent text-slate-600 border-slate-300 dark:text-slate-300 dark:border-slate-600 font-black',
    SENT: 'bg-transparent text-blue-600 border-blue-500 dark:text-blue-400 dark:border-blue-500 font-black',
    PARTIALLY_RECEIVED: 'bg-transparent text-amber-600 border-amber-500 dark:text-amber-400 dark:border-amber-500 font-black',
    RECEIVED: 'bg-transparent text-emerald-600 border-emerald-500 dark:text-emerald-400 dark:border-emerald-500 font-black',
    CLOSED: 'bg-transparent text-slate-500 border-slate-400 dark:text-slate-400 dark:border-slate-600 font-black',
    CANCELLED: 'bg-transparent text-rose-600 border-rose-500 dark:text-rose-400 dark:border-rose-500 font-black'
};

const PurchaseOrdersTab = () => {
    const { theme, isDark } = useTheme();
    const { activeBranchId, branches } = useApp();
    const selectedBranchId = activeBranchId || (branches && branches[0]?._id);
    const [orders, setOrders] = useState([]);
    const [kpis, setKpis] = useState({ openOrdersCount: 0, pendingItemsCount: 0, totalOpenValue: 0 });
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isRestockOpen, setIsRestockOpen] = useState(false);
    
    // Draft Bill Modal state
    const [isDraftOpen, setIsDraftOpen] = useState(false);
    const [draftData, setDraftData] = useState(null);

    // Receive Goods Modal state
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [selectedPOForReceive, setSelectedPOForReceive] = useState(null);

    const loadOrders = () => {
        setLoading(true);
        PurchaseService.getPurchaseOrders({
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            branchId: selectedBranchId
        })
            .then(res => {
                setOrders(res.data || []);
                if (res.kpis) setKpis(res.kpis);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadOrders();
    }, [statusFilter, selectedBranchId]);

    // Handle transition from Restock modal to Order Draft Bill modal
    const handleProceedToDraft = (data) => {
        setIsRestockOpen(false);
        setDraftData(data);
        setIsDraftOpen(true);
    };

    // Open receive goods modal
    const handleOpenReceive = (po) => {
        setSelectedPOForReceive(po);
        setIsReceiveOpen(true);
    };

    // Handle status changes (e.g. Cancel)
    const handleStatusChange = async (poId, status) => {
        try {
            await PurchaseService.updatePOStatus(poId, status);
            toast.success(`Order marked as ${status}`);
            loadOrders();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const filteredOrders = orders.filter(o =>
        o.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplierId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            
            {/* ── Top KPI Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all shadow-sm ${theme.surfaceBg} ${theme.borderLight}`}>
                    <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
                        <ShoppingBag size={24} />
                    </div>
                    <div className="min-w-0">
                        <div className={`text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>Open Orders</div>
                        <div className={`text-2xl font-black ${theme.textHeading}`}>{kpis.openOrdersCount < 10 ? `0${kpis.openOrdersCount}` : kpis.openOrdersCount}</div>
                    </div>
                </div>

                <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all shadow-sm ${theme.surfaceBg} ${theme.borderLight}`}>
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
                        <Clock size={24} />
                    </div>
                    <div className="min-w-0">
                        <div className={`text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>Pending Delivery</div>
                        <div className="text-2xl font-black text-amber-500">{kpis.pendingItemsCount} items</div>
                    </div>
                </div>

                <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all shadow-sm ${theme.surfaceBg} ${theme.borderLight}`}>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                        <PackageCheck size={24} />
                    </div>
                    <div className="min-w-0">
                        <div className={`text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>Open Orders Value</div>
                        <div className="text-2xl font-black text-emerald-500">{formatCurrency(kpis.totalOpenValue)}</div>
                    </div>
                </div>
            </div>

            {/* ── Header Controls & Actions ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                    <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search PO Number or Supplier..."
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-bold border outline-none transition-all ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} placeholder:${theme.textMuted} focus:border-indigo-500`}
                    />
                </div>

                {/* Restock & Create PO Button */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                        onClick={() => setIsRestockOpen(true)}
                        className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                    >
                        <Plus size={16} /> Restock From Supplier
                    </button>
                </div>
            </div>

            {/* ── Status Filter Pills ── */}
            <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map(st => (
                    <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            statusFilter === st
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : theme.mode === 'dark' 
                                    ? 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        {st.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* ── Purchase Orders Table ── */}
            <div className={`rounded-3xl border overflow-hidden shadow-sm ${theme.surfaceBg} ${theme.borderLight}`}>
                {loading ? (
                    <div className="py-16 text-center opacity-60 text-xs font-bold flex items-center justify-center gap-2">
                        <RefreshCw size={18} className="animate-spin text-indigo-500" />
                        Loading purchase orders...
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center opacity-60">
                        <ShoppingBag size={40} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-bold">No purchase orders found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className={`border-b ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-950/80 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                                    <th className="py-3.5 px-4 font-black uppercase">Order Ref</th>
                                    <th className="py-3.5 px-4 font-black uppercase">Supplier</th>
                                    <th className="py-3.5 px-4 font-black uppercase">Items</th>
                                    <th className="py-3.5 px-4 font-black uppercase text-right">Order Value</th>
                                    <th className="py-3.5 px-4 font-black uppercase text-center">Status</th>
                                    <th className="py-3.5 px-4 font-black uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.borderLight}`}>
                                {filteredOrders.map((po) => {
                                    const totalItemsCount = po.items?.length || 0;
                                    const isReceivable = ['SENT', 'PARTIALLY_RECEIVED'].includes(po.status);

                                    return (
                                        <tr key={po._id} className={theme.mode === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}>
                                            <td className="py-3.5 px-4 font-black text-indigo-500">
                                                {po.poNumber}
                                                <div className={`text-[10px] font-semibold ${theme.textMuted}`}>
                                                    {new Date(po.poDate).toLocaleDateString('en-IN')}
                                                </div>
                                            </td>
                                            <td className={`py-3.5 px-4 font-bold ${theme.textPrimary}`}>
                                                {po.supplierId?.name || 'N/A'}
                                                {po.supplierId?.phone && <div className={`text-[10px] font-medium ${theme.textMuted}`}>{po.supplierId.phone}</div>}
                                            </td>
                                            <td className={`py-3.5 px-4 font-semibold ${theme.textSecondary}`}>
                                                {totalItemsCount} product{totalItemsCount === 1 ? '' : 's'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-indigo-500">
                                                {formatCurrency(po.grandTotal)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${STATUS_PILL[po.status] || STATUS_PILL.DRAFT}`}>
                                                    {po.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isReceivable && (
                                                        <button
                                                            onClick={() => handleOpenReceive(po)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                                                        >
                                                            <PackageCheck size={14} /> Receive goods
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            setDraftData({
                                                                supplier: po.supplierId,
                                                                items: po.items
                                                            });
                                                            setIsDraftOpen(true);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                                            theme.mode === 'dark' 
                                                                ? 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700' 
                                                                : 'border-slate-200 bg-slate-100/70 text-slate-700 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        View order
                                                    </button>

                                                    {po.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => handleStatusChange(po._id, 'CANCELLED')}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                                                            title="Cancel order"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Supplier Restocking Catalog Modal ── */}
            <SupplierRestockModal
                isOpen={isRestockOpen}
                onClose={() => setIsRestockOpen(false)}
                onProceedToDraft={handleProceedToDraft}
            />

            {/* ── Purchase Order Draft Bill Modal ── */}
            <PurchaseOrderBillModal
                isOpen={isDraftOpen}
                onClose={() => setIsDraftOpen(false)}
                initialData={draftData}
                onOrderSaved={loadOrders}
            />

            {/* ── Receive Goods Modal ── */}
            <ReceiveGoodsModal
                isOpen={isReceiveOpen}
                onClose={() => setIsReceiveOpen(false)}
                purchaseOrder={selectedPOForReceive}
                onReceiptConfirmed={loadOrders}
            />

        </div>
    );
};

export default PurchaseOrdersTab;
