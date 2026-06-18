import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dashboardService } from '../../services/api';
import { PurchaseService } from '../../services/PurchaseService';
import { formatCurrency } from '../../utils/format';
import { ArrowLeft, Truck, ChevronDown, Calendar, Package, ReceiptText, ArrowRightCircle, Building, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PayOutSheet from '../../components/modals/PayOutSheet';
import PurchaseReturnSheet from '../../components/modals/PurchaseReturnSheet';
import HistoryTimeline from '../../components/HistoryTimeline';
import ExportSelectToolbar from '../../components/ExportSelectToolbar';

const PayOutList = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('pending');
    const [data, setData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [returnsData, setReturnsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isReturnSheetOpen, setIsReturnSheetOpen] = useState(false);
    const [expandedSuppliers, setExpandedSuppliers] = useState({});
    const navigate = useNavigate();

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [sortBy, setSortBy] = useState('balance');
    const [sortOrder, setSortOrder] = useState('desc');
    const filterRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            const resolvedShopId = user?.shopId || user?.shop_id;
            if (resolvedShopId) {
                setLoading(true);
                if (activeTab === 'pending') {
                    const result = await dashboardService.getPayOutList(resolvedShopId);
                    setData(result);
                } else if (activeTab === 'history') {
                    const result = await dashboardService.getPayOutHistory(resolvedShopId);
                    setHistoryData(result);
                } else if (activeTab === 'returns') {
                    const result = await PurchaseService.getPurchaseReturns({ shopId: resolvedShopId });
                    setReturnsData(result);
                }
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.shopId, user?.shop_id, activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Close filter panel on outside click
    useEffect(() => {
        if (!showFilter) return;
        const handler = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setShowFilter(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showFilter]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Group data by Supplier
    const supplierList = useMemo(() => {
        if (!data || data.length === 0) return [];

        const grouped = data.reduce((acc, purchase) => {
            const key = purchase.supplierPhone !== 'N/A' && purchase.supplierPhone ? purchase.supplierPhone : (purchase.supplierName || 'General Supplier');

            if (!acc[key]) {
                acc[key] = {
                    id: key,
                    supplierName: purchase.supplierName || 'General Supplier',
                    supplierPhone: purchase.supplierPhone || 'N/A',
                    purchases: [],
                    totalAmount: 0,
                    totalPaid: 0,
                    totalBalance: 0
                };
            }
            acc[key].purchases.push(purchase);
            acc[key].totalAmount += purchase.grandTotal;
            acc[key].totalPaid += purchase.totalPaid;
            acc[key].totalBalance += purchase.balanceAmount;
            return acc;
        }, {});

        let result = Object.values(grouped);

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s => 
                (s.supplierName && s.supplierName.toLowerCase().includes(query)) ||
                (s.supplierPhone && s.supplierPhone.includes(query))
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal, bVal;
            
            if (sortBy === 'balance') {
                aVal = a.totalBalance;
                bVal = b.totalBalance;
            } else if (sortBy === 'name') {
                aVal = (a.supplierName || '').toLowerCase();
                bVal = (b.supplierName || '').toLowerCase();
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else if (sortBy === 'amount') {
                aVal = a.totalAmount;
                bVal = b.totalAmount;
            }
            
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return result;
    }, [data, searchQuery, sortBy, sortOrder]);

    const toggleSupplier = (supplierId) => {
        setExpandedSuppliers(prev => ({
            ...prev,
            [supplierId]: !prev[supplierId]
        }));
    };

    // ── Row selection ─────────────────────────────────────────────────────────
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    const currentRows = activeTab === 'pending' ? supplierList : activeTab === 'history' ? historyData : returnsData;
    const allRowKeys = currentRows.map(r => activeTab === 'returns' ? r._id : r.id);
    const allSelected = allRowKeys.length > 0 && allRowKeys.every(k => selectedKeys.has(k));
    const someSelected = !allSelected && allRowKeys.some(k => selectedKeys.has(k));

    const toggleRow = (key) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };
    const toggleAll = () => setSelectedKeys(allSelected ? new Set() : new Set(allRowKeys));

    // Reset selection when tab changes
    useEffect(() => { setSelectedKeys(new Set()); }, [activeTab]);

    const exportColumns = activeTab === 'pending'
        ? [
            { header: 'Supplier', exportValue: r => r.supplierName },
            { header: 'Phone', exportValue: r => r.supplierPhone },
            { header: 'Total Limit', exportValue: r => r.totalAmount },
            { header: 'Total Paid', exportValue: r => r.totalPaid },
            { header: 'Balance Due', exportValue: r => r.totalBalance },
          ]
        : activeTab === 'history'
        ? [
            { header: 'Supplier', exportValue: r => r.supplierName },
            { header: 'Invoice Date', exportValue: r => r.date },
            { header: 'Paid Date', exportValue: r => r.paidDate },
            { header: 'Amount Paid', exportValue: r => r.totalPaid },
          ]
        : [
            { header: 'Supplier', exportValue: r => r.supplierName },
            { header: 'Return Total', exportValue: r => r.totalReturnAmount },
            { header: 'Exchange Total', exportValue: r => r.totalExchangeAmount },
            { header: 'Net Balance', exportValue: r => r.netAmount },
          ];

    const getExportRows = () => {
        const rows = selectedKeys.size > 0
            ? currentRows.filter(r => selectedKeys.has(activeTab === 'returns' ? r._id : r.id))
            : currentRows;
        return rows.map(r => {
            const obj = {};
            exportColumns.forEach(col => { obj[col.header] = col.exportValue(r); });
            return obj;
        });
    };

    return (
        <div className={`p-4 md:p-8 pb-32 space-y-8 w-full h-full overflow-y-auto animate-in fade-in duration-500 ${theme.pageBg}`}>
            <div className={`flex items-center gap-4 ${theme.textHeading}`}>
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`p-2 hover:opacity-80 rounded-full transition-colors ${theme.surfaceBg} border ${theme.borderLight}`}
                >
                    <ArrowLeft size={24} className={theme.textPrimary} />
                </button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Pay Out (Suppliers)</h1>
                    <p className={`${theme.textMuted} mt-1 font-medium`}>List of supplier payments and balances</p>
                </div>
            </div>

            {/* Tabs section */}
            <div className={`flex flex-wrap gap-4 p-2 rounded-2xl shadow-sm w-fit ${theme.surfaceBg}`}>
                <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "pending"
                        ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                        : `${theme.textSecondary} hover:opacity-80`
                        }`}
                >
                    <Truck size={18} /> Pending Payments
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "history"
                        ? `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300`
                        : `${theme.textSecondary} hover:opacity-80`
                        }`}
                >
                    <Calendar size={18} /> Payment History
                </button>
                <button
                    onClick={() => setActiveTab("returns")}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "returns"
                        ? `bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300`
                        : `${theme.textSecondary} hover:opacity-80`
                        }`}
                >
                    <RotateCcw size={18} /> Return History
                </button>
            </div>

            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={20} />
                    <input
                        type="text"
                        placeholder="Search by supplier name, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none transition-all font-bold ${theme.surfaceBg} ${theme.borderLight} focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10`}
                    />
                </div>
                
                {/* Filter Button */}
                <div ref={filterRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setShowFilter(f => !f)}
                        className={`relative p-3.5 rounded-2xl border transition-colors ${
                            showFilter ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : `${theme.borderLight} ${theme.textPrimary} hover:bg-gray-50 dark:hover:bg-white/5`
                        }`}
                    >
                        <SlidersHorizontal size={22} />
                    </button>

                    {/* Filter Panel */}
                    {showFilter && (
                        <div className={`absolute right-0 top-full mt-2 z-50 w-72 rounded-3xl shadow-2xl border p-4 space-y-4 ${theme.surfaceBg} ${theme.borderLight}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Sort & Filter</span>
                                <button 
                                    onClick={() => {
                                        setSortBy('balance');
                                        setSortOrder('desc');
                                    }}
                                    className="text-[10px] font-black text-indigo-500 hover:text-indigo-700"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-1.5 block`}>
                                    Sort by
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { value: 'balance', label: 'Balance' },
                                        { value: 'name', label: 'Name' },
                                        { value: 'amount', label: 'Amount' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSortBy(opt.value)}
                                            className={`py-1.5 rounded-xl text-[11px] font-black transition-all ${
                                                sortBy === opt.value 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : `${theme.inputBg} ${theme.textSecondary} hover:opacity-80`
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sort Order */}
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-1.5 block`}>
                                    Order
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { value: 'desc', label: '↓ High to Low' },
                                        { value: 'asc', label: '↑ Low to High' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSortOrder(opt.value)}
                                            className={`py-1.5 rounded-xl text-[11px] font-black transition-all ${
                                                sortOrder === opt.value 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : `${theme.inputBg} ${theme.textSecondary} hover:opacity-80`
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setShowFilter(false)}
                                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`overflow-hidden rounded-[32px] border ${theme.borderLight} ${theme.surfaceBg}`}>
                <ExportSelectToolbar
                    rows={currentRows}
                    selected={selectedKeys}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    onToggleAll={toggleAll}
                    getExportRows={getExportRows}
                    exportFilename={`payout-${activeTab}`}
                    exportTitle={`Pay Out — ${activeTab}`}
                    columns={exportColumns}
                />
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${theme.pageBg} ${theme.textMuted} text-[10px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                <th className="p-3 w-10"></th>
                                <th className="p-3 text-xs">Supplier</th>
                                {activeTab === 'pending' ? (
                                    <>
                                        <th className="p-3 text-xs text-right">Total Limit</th>
                                        <th className="p-3 text-xs text-right">Total Paid</th>
                                        <th className="p-3 text-xs text-right">Total Balance Due</th>
                                    </>
                                ) : activeTab === 'history' ? (
                                    <>
                                        <th className="p-3 text-xs text-right">Invoice Date</th>
                                        <th className="p-3 text-xs text-right">Paid Date</th>
                                        <th className="p-3 text-xs text-right">Amount Paid</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-3 text-xs text-right">Return Total</th>
                                        <th className="p-3 text-xs text-right">Exchange Total</th>
                                        <th className="p-3 text-xs text-right">Net Balance</th>
                                    </>
                                )}
                                <th className="p-3 text-xs text-center w-16">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.borderLight}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`w-12 h-12 border-4 rounded-full animate-spin mx-auto ${theme.mode === 'dark' ? 'border-red-500/20 border-t-red-500' : 'border-red-100 border-t-red-600'}`} />
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textMuted}`}>Loading pay-outs...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (activeTab === 'pending' ? supplierList : activeTab === 'history' ? historyData : returnsData).length > 0 ? (
                                (activeTab === 'pending' ? supplierList : activeTab === 'history' ? historyData : returnsData).map((group) => {
                                    const key = activeTab === 'returns' ? group._id : group.id;
                                    const isExpanded = expandedSuppliers[key];

                                    return (
                                        <React.Fragment key={key}>
                                            <tr
                                                onClick={() => toggleSupplier(key)}
                                                className={`group hover:${theme.pageBg} transition-all cursor-pointer ${isExpanded ? theme.pageBg : ''} ${selectedKeys.has(key) ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                                            >
                                                <td className="p-3 w-10" onClick={e => { e.stopPropagation(); toggleRow(key); }}>
                                                    <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => {}}
                                                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? (activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600') + ' text-white' : `${theme.pageBg} ${theme.textMuted} group-hover:${activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600'} group-hover:text-white`}`}>
                                                            <Truck size={18} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-lg font-black tracking-tight transition-colors capitalize ${theme.textHeading}`}>
                                                                {group.supplierName}
                                                            </p>
                                                            <p className={`text-sm font-bold ${theme.textMuted}`}>
                                                                {group.supplierPhone !== 'N/A' ? group.supplierPhone : 'No Contact Info'}
                                                                {activeTab === 'history' && group.purchaseNumber && ` • #${group.purchaseNumber}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {activeTab === 'pending' ? (
                                                    <>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-lg font-black tracking-tight ${theme.textHeading}`}>{formatCurrency(group.totalAmount)}</p>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <p className="text-sm font-black text-green-600 tracking-tight">{formatCurrency(group.totalPaid)}</p>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-sm font-black tracking-tight ${group.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {formatCurrency(group.totalBalance)}
                                                            </p>
                                                        </td>
                                                    </>
                                                ) : activeTab === 'history' ? (
                                                    <>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-sm font-black ${theme.textHeading}`}>{formatDate(group.date)}</p>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-sm font-black text-emerald-600`}>{formatDate(group.paidDate)}</p>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-lg font-black text-emerald-600 tracking-tight`}>{formatCurrency(group.totalPaid)}</p>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-lg font-black text-orange-600 tracking-tight`}>{formatCurrency(group.totalReturnAmount)}</p>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-lg font-black text-indigo-600 tracking-tight`}>{formatCurrency(group.totalExchangeAmount)}</p>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <p className={`text-lg font-black tracking-tight ${group.netAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {formatCurrency(group.netAmount)}
                                                            </p>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="p-3 text-center">
                                                    <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? (activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600') + ' text-white rotate-180' : `${theme.pageBg} ${theme.textMuted} hover:${activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600'} hover:text-white`}`}>
                                                        <ChevronDown size={20} />
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expandable Accordion Row */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} className="p-0 border-none bg-transparent">
                                                        <div className={`${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50/50'} border-t ${theme.borderLight} p-8 animate-in slide-in-from-top-2 duration-300 overflow-hidden`}>
                                                            <HistoryTimeline
                                                                onAction={(purchase) => {
                                                                    setSelectedPurchase(purchase);
                                                                    setIsSheetOpen(true);
                                                                }}
                                                                onReturn={(purchase) => {
                                                                    setSelectedPurchase(purchase);
                                                                    setIsReturnSheetOpen(true);
                                                                }}
                                                                events={(() => {
                                                                    const events = [];
                                                                    const purchasesToProcess = activeTab === 'pending' ? group.purchases : [group];
                                                                    purchasesToProcess.forEach(purchase => {
                                                                        events.push({
                                                                            id: `purchase-${purchase.id}`,
                                                                            type: 'PURCHASE',
                                                                            date: purchase.date,
                                                                            orderNumber: purchase.purchaseNumber,
                                                                            amount: purchase.grandTotal,
                                                                            balance: purchase.balanceAmount || 0,
                                                                            order: purchase // Reusing 'order' prop name for HistoryTimeline
                                                                        });

                                                                        (purchase.payments || []).forEach(p => {
                                                                            events.push({
                                                                                id: `payment-${p.id}`,
                                                                                type: 'PAYMENT',
                                                                                date: p.date,
                                                                                orderNumber: purchase.purchaseNumber,
                                                                                amount: p.amount,
                                                                                method: p.method
                                                                            });
                                                                        });
                                                                    });
                                                                    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
                                                                })()}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="max-w-md mx-auto space-y-4">
                                            <div className={`w-20 h-20 ${theme.pageBg} rounded-full flex items-center justify-center mx-auto ${theme.textMuted}`}>
                                                {activeTab === 'pending' ? <Truck size={40} /> : <ReceiptText size={40} />}
                                            </div>
                                            <h3 className={`text-xl font-black ${theme.textHeading}`}>
                                                {activeTab === 'pending' ? 'All Clear' : 'No History Found'}
                                            </h3>
                                            <p className={`${theme.textMuted} font-medium`}>
                                                {activeTab === 'pending' 
                                                    ? 'There are no outstanding payouts to suppliers currently pending.' 
                                                    : 'No historical payout transactions were found.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PayOutSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                purchase={selectedPurchase}
                onSuccess={() => {
                    fetchData();
                }}
            />
            <PurchaseReturnSheet
                isOpen={isReturnSheetOpen}
                onClose={() => setIsReturnSheetOpen(false)}
                purchase={selectedPurchase}
                onSuccess={() => {
                    fetchData();
                }}
            />
        </div>
    );
};

export default PayOutList;

