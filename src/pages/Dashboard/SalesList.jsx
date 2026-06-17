import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { orderService, dashboardService } from '../../services/api';
import { 
    ShoppingBag, 
    Search, 
    Filter, 
    Calendar, 
    ChevronRight, 
    RotateCcw, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    ArrowUpRight,
    ArrowRight,
    User,
    Edit3,
    Eye,
    X,
    ChevronDown,
    ChevronUp,
    History,
    TrendingUp,
    TrendingDown,
    Receipt,
    SlidersHorizontal,
    ArrowUpDown,
    CalendarRange
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import OrderReturnSheet from '../../components/modals/OrderReturnSheet';
import OrderEditSheet from '../../components/modals/OrderEditSheet';
import CommonTable from '../../components/CommonTable';

const ReturnDetailModal = ({ isOpen, onClose, returnData, theme, formatCurrency, formatDate }) => {
    if (!isOpen || !returnData) return null;

    const isExchange = returnData.exchangeOrderId || returnData.exchangeItems?.length > 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className={`relative w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col rounded-[40px] overflow-hidden animate-in zoom-in-95 duration-300 ${theme.surfaceBg}`}>
                
                {/* Header */}
                <div className={`p-8 border-b flex items-center justify-between ${theme.borderLight} bg-gradient-to-r from-orange-500/10 to-indigo-500/10`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isExchange ? 'bg-indigo-600' : 'bg-orange-600'} text-white shadow-lg`}>
                            {isExchange ? <ShoppingBag size={28} /> : <RotateCcw size={28} />}
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black ${theme.textHeading}`}>{isExchange ? 'Exchange Details' : 'Return Details'}</h2>
                            <p className={`text-sm font-bold ${theme.textMuted}`}>Return Number: {returnData.returnNumber} • Original Order: #{returnData.orderId?.orderNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 ${theme.textMuted} transition-all`}>
                        <X size={28} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Timestamps & Info */}
                        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>Initially Ordered</p>
                                <p className={`font-black ${theme.textPrimary}`}>{formatDate(returnData.orderId?.createdAt)}</p>
                            </div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>{isExchange ? 'Exchanged On' : 'Returned On'}</p>
                                <p className={`font-black ${theme.textPrimary}`}>{formatDate(returnData.returnDate)}</p>
                            </div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>Customer</p>
                                <p className={`font-black ${theme.textPrimary}`}>{returnData.orderId?.customerId?.name || 'Walk-in'}</p>
                            </div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>Processed By</p>
                                <p className={`font-black ${theme.textPrimary}`}>{returnData.createdBy?.username}</p>
                            </div>
                        </div>

                        {/* Side-by-Side Comparison */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-orange-600 flex items-center gap-2">
                                <RotateCcw size={16} /> Returned Items
                            </h3>
                            <div className={`rounded-3xl border ${theme.borderLight} overflow-hidden divide-y ${theme.borderLight}`}>
                                {returnData.items?.map((item, idx) => (
                                    <div key={idx} className="p-4 flex justify-between items-center bg-orange-50/20 dark:bg-orange-900/5 hover:bg-orange-50/40 transition-colors">
                                        <div>
                                            <p className={`font-black ${theme.textPrimary}`}>{item.itemName}</p>
                                            <p className={`text-xs font-bold ${theme.textMuted}`}>Quantity: {item.quantity} x {formatCurrency(item.price)}</p>
                                            {item.isDamaged && <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded ml-1">Damaged</span>}
                                        </div>
                                        <p className="font-black text-orange-600">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                <ShoppingBag size={16} /> {isExchange ? 'Exchanged To' : 'Exchange Items (None)'}
                            </h3>
                            <div className={`rounded-3xl border ${theme.borderLight} overflow-hidden divide-y ${theme.borderLight} min-h-[100px] flex flex-col`}>
                                {isExchange ? (
                                    returnData.exchangeItems?.length > 0 ? (
                                        returnData.exchangeItems.map((item, idx) => (
                                            <div key={idx} className="p-4 flex justify-between items-center bg-indigo-50/20 dark:bg-indigo-900/5 hover:bg-indigo-50/40 transition-colors">
                                                <div>
                                                    <p className={`font-black ${theme.textPrimary}`}>{item.itemName}</p>
                                                    <p className={`text-xs font-bold ${theme.textMuted}`}>Quantity: {item.quantity}  {item.price ? `x ${formatCurrency(item.price)}` : ''}</p>
                                                </div>
                                                <p className="font-black text-indigo-600">{item.price ? formatCurrency(item.price * item.quantity) : '-'}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
                                            <AlertCircle size={24} className="mb-2" />
                                            <p className="text-xs font-bold italic">Detailed exchange mapping unavailable for this record.</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex-1 flex items-center justify-center p-6 text-gray-300 italic font-medium">
                                        No exchange performed
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className={`md:col-span-2 p-8 rounded-[32px] shadow-xl ${returnData.netAmount > 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-emerald-600/20' : 'bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-indigo-600/20'} text-white`}>
                            <div className="flex flex-wrap justify-between items-center gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Financial Summary</p>
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1.5 font-bold"><RotateCcw size={16} /> Returns: {formatCurrency(returnData.totalReturnAmount)}</span>
                                        <ArrowRight size={20} className="opacity-50" />
                                        <span className="flex items-center gap-1.5 font-bold"><ShoppingBag size={16} /> Exchange Value: {formatCurrency(returnData.totalExchangeAmount)}</span>
                                    </div>
                                    {returnData.exchangeOrderId?.paymentStatus && (
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-2 px-2 py-0.5 rounded bg-white/20 w-fit">
                                            Payment Status: {returnData.exchangeOrderId.paymentStatus}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                        {returnData.netAmount > 0 ? 'Net Amount Paid' : 'Amount Refunded'}
                                    </p>
                                    <p className="text-4xl font-black">{formatCurrency(Math.abs(returnData.netAmount))}</p>
                                </div>
                            </div>
                        </div>

                        {returnData.notes && (
                            <div className="md:col-span-2 space-y-2">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Return Notes</p>
                                <p className={`p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border ${theme.borderLight} text-sm font-medium italic ${theme.textSecondary}`}>
                                    "{returnData.notes}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${theme.borderLight} bg-gray-50 dark:bg-white/5 flex justify-end`}>
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

const SalesList = ({ initialTab, hideTabs = false } = {}) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { theme } = useTheme();
    const { formatCurrency: appFormatCurrency } = useApp();
    const fmt = appFormatCurrency || formatCurrency;

    const [activeTab, setActiveTab] = useState(() => {
        if (initialTab === 'returns' || initialTab === 'history') return initialTab;
        return searchParams.get('tab') === 'returns' ? 'returns' : 'history';
    });

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'returns') {
            setSearchParams({ tab: 'returns' });
        } else {
            setSearchParams({});
        }
    };

    // If a page wants to force a tab (separate returns page), keep it in sync.
    useEffect(() => {
        if (initialTab === 'returns' || initialTab === 'history') {
            setActiveTab(initialTab);
        }
    }, [initialTab]);
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);
    const [returns, setReturns] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [showFilter, setShowFilter] = useState(false);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isReturnSheetOpen, setIsReturnSheetOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [isReturnDetailOpen, setIsReturnDetailOpen] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});

    const filterRef = useRef(null);

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

    const toggleOrderArea = (orderId) => {
        setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const fetchSales = useCallback(async () => {
        const resolvedShopId = user?.shopId || user?.shop_id;
        if (!resolvedShopId) return;
        setLoading(true);
        try {
            if (activeTab === 'history') {
                const response = await orderService.getOrders({
                    shopId: resolvedShopId,
                    search: searchQuery || undefined,
                    orderStatus: 'COMPLETED',
                    page: currentPage,
                    limit: pageSize,
                    sortBy,
                    sortOrder,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });
                if (response && response.data) {
                    setSales(response.data);
                    setTotalPages(response.pagination?.totalPages || 1);
                    setTotalItems(response.pagination?.total || 0);
                } else {
                    // legacy fallback if server not yet updated
                    setSales(Array.isArray(response) ? response : []);
                }
            } else {
                const data = await orderService.getOrderReturns({
                    shopId: resolvedShopId,
                    search: searchQuery || undefined,
                });
                setReturns(Array.isArray(data) ? data : (data?.data || []));
            }
        } catch (error) {
            console.error("Failed to fetch sales data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.shopId, user?.shop_id, activeTab, searchQuery, currentPage, pageSize, sortBy, sortOrder, startDate, endDate]);

    // Debounce search; reset page on search/filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortBy, sortOrder, startDate, endDate, activeTab, pageSize]);

    useEffect(() => {
        const delay = setTimeout(() => { fetchSales(); }, searchQuery ? 400 : 0);
        return () => clearTimeout(delay);
    }, [fetchSales]);

    const handlePageSizeChange = (size) => {
        setPageSize(Number(size));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSortBy('createdAt');
        setSortOrder('desc');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    const activeFilterCount = [
        sortBy !== 'createdAt' || sortOrder !== 'desc',
        !!startDate,
        !!endDate,
    ].filter(Boolean).length;

    const handleProcessReturn = (order) => {
        setSelectedOrder(order);
        setIsReturnSheetOpen(true);
    };

    const handleViewReturnDetail = (ret) => {
        setSelectedReturn(ret);
        setIsReturnDetailOpen(true);
    };

    const handleEditSale = (order) => {
        setSelectedOrderForEdit(order);
        setIsEditSheetOpen(true);
    };

    // Compute summary totals from loaded sales (current page)
    const summary = useMemo(() => {
        if (!sales.length) return { totalSale: 0, totalProfit: 0, count: totalItems };
        let totalSale = 0;
        let totalCost = 0;
        sales.forEach(order => {
            totalSale += order.grandTotal || 0;
            if (order.items?.length) {
                order.items.forEach(item => {
                    const pp = item.itemId?.pricing?.purchasePrice || 0;
                    totalCost += pp * (item.quantity || 1);
                });
            } else {
                totalCost += (order.subtotal || 0) - (order.discountTotal || 0);
            }
        });
        return { totalSale, totalProfit: totalSale - totalCost, count: totalItems };
    }, [sales, totalItems]);

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 min-h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className={`text-2xl md:text-4xl font-black ${theme.textHeading} tracking-tight`}>
                        {activeTab === 'returns' ? 'Sales Returns' : 'Sales Invoice'}
                    </h1>
                    <p className={`${theme.textMuted} mt-1 font-medium`}>
                        {activeTab === 'returns' ? 'Manage your shop\'s processed returns and exchanges' : 'Manage your shop\'s sales invoices and processed returns'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={20} />
                        <input
                            type="text"
                            placeholder="Search by Order/Invoice #..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none transition-all font-bold ${theme.surfaceBg} ${theme.borderLight} focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10`}
                        />
                    </div>
                    {/* Filter button with panel */}
                    <div ref={filterRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setShowFilter(f => !f)}
                            className={`relative p-3.5 rounded-2xl border transition-colors ${showFilter || activeFilterCount > 0 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : `${theme.borderLight} ${theme.textPrimary} hover:bg-gray-50 dark:hover:bg-white/5`}`}
                        >
                            <SlidersHorizontal size={22} />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {showFilter && (
                            <div className={`absolute right-0 top-full mt-2 z-50 w-72 rounded-3xl shadow-2xl border p-4 space-y-4 ${theme.surfaceBg} ${theme.borderLight}`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Filters & Sort</span>
                                    {activeFilterCount > 0 && (
                                        <button onClick={handleClearFilters} className="text-[10px] font-black text-indigo-500 hover:text-indigo-700">Clear all</button>
                                    )}
                                </div>

                                {/* Sort by */}
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-1.5 block`}>Sort by</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { value: 'createdAt', label: 'Date' },
                                            { value: 'invoiceNumber', label: 'Invoice' },
                                            { value: 'grandTotal', label: 'Amount' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setSortBy(opt.value)}
                                                className={`py-1.5 rounded-xl text-[11px] font-black transition-all ${sortBy === opt.value ? 'bg-indigo-600 text-white' : `${theme.inputBg} ${theme.textSecondary} hover:opacity-80`}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Sort order */}
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-1.5 block`}>Order</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { value: 'desc', label: '↓ Newest first' },
                                            { value: 'asc', label: '↑ Oldest first' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setSortOrder(opt.value)}
                                                className={`py-1.5 rounded-xl text-[11px] font-black transition-all ${sortOrder === opt.value ? 'bg-indigo-600 text-white' : `${theme.inputBg} ${theme.textSecondary} hover:opacity-80`}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date range */}
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-1.5 block`}>Date range</label>
                                    <div className="space-y-2">
                                        <div>
                                            <span className={`text-[9px] font-bold uppercase ${theme.textMuted} mb-0.5 block`}>From</span>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className={`w-full px-3 py-2 rounded-xl text-sm font-bold border outline-none ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500`}
                                            />
                                        </div>
                                        <div>
                                            <span className={`text-[9px] font-bold uppercase ${theme.textMuted} mb-0.5 block`}>To</span>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className={`w-full px-3 py-2 rounded-xl text-sm font-bold border outline-none ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500`}
                                            />
                                        </div>
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
                    <button
                        type="button"
                        onClick={() => navigate(activeTab === 'returns' ? '/sales/return' : '/sales/new')}
                        className={`px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg whitespace-nowrap ${
                            activeTab === 'returns'
                                ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                        }`}
                    >
                        {activeTab === 'returns' ? <RotateCcw size={18} /> : <Plus size={18} />}
                        {activeTab === 'returns' ? 'Make Return' : 'Add Sale'}
                    </button>
                </div>
            </div>

            {/* Summary Widgets — only shown for sales tab */}
            {activeTab === 'history' && !loading && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    {/* Total Sale */}
                    <div className={`rounded-2xl p-4 border ${theme.borderLight} ${theme.surfaceBg} flex items-center gap-4`}>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                            <Receipt size={20} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-0.5`}>Total Sales</p>
                            <p className={`text-xl font-black ${theme.textHeading}`}>{fmt(summary.totalSale)}</p>
                            <p className={`text-[11px] font-bold ${theme.textMuted}`}>{summary.count} invoice{summary.count !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    {/* Total Profit */}
                    <div className={`rounded-2xl p-4 border ${theme.borderLight} ${theme.surfaceBg} flex items-center gap-4`}>
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${summary.totalProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            {summary.totalProfit >= 0
                                ? <TrendingUp size={20} className="text-emerald-500" />
                                : <TrendingDown size={20} className="text-red-500" />
                            }
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-0.5`}>Total Profit</p>
                            <p className={`text-xl font-black ${summary.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {fmt(Math.abs(summary.totalProfit))}
                            </p>
                            <p className={`text-[11px] font-bold ${theme.textMuted}`}>
                                {summary.totalSale > 0 ? `${((summary.totalProfit / summary.totalSale) * 100).toFixed(1)}% margin` : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Avg Order Value */}
                    <div className={`rounded-2xl p-4 border ${theme.borderLight} ${theme.surfaceBg} flex items-center gap-4`}>
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag size={20} className="text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-0.5`}>Avg Order</p>
                            <p className={`text-xl font-black ${theme.textHeading}`}>
                                {fmt(summary.count > 0 ? summary.totalSale / summary.count : 0)}
                            </p>
                            <p className={`text-[11px] font-bold ${theme.textMuted}`}>per invoice</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            {!hideTabs && (
                <div className={`flex flex-row gap-1 p-1.5 rounded-2xl shadow-sm w-full md:w-fit ${theme.surfaceBg}`}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'history'}
                        onClick={() => handleTabChange('history')}
                        className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'history'
                                ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                                : `${theme.textSecondary} hover:opacity-80`
                        }`}
                    >
                        <ShoppingBag size={16} />
                        All Sales
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'returns'}
                        onClick={() => handleTabChange('returns')}
                        className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'returns'
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                                : `${theme.textSecondary} hover:opacity-80`
                        }`}
                    >
                        <RotateCcw size={16} />
                        Sales Returns
                    </button>
                </div>
            )}

            {/* Table */}
            <CommonTable
                columns={activeTab === 'history' ? [
                    {
                        header: 'Order Info',
                        key: 'orderNumber',
                        render: (_, order) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">#{order.orderNumber}</span>
                                    <span className="text-[10px] font-black text-gray-400">{formatDate(order.createdAt)}</span>
                                </div>
                                <p className={`font-black ${theme.textHeading}`}>{order.invoiceNumber || 'No Invoice'}</p>
                            </div>
                        )
                    },
                    {
                        header: 'Customer',
                        key: 'customerId',
                        render: (_, order) => (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 flex-shrink-0">
                                    <User size={15} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`font-black text-sm truncate ${theme.textPrimary}`}>{order.customerId?.name || 'Walk-in'}</p>
                                    <p className={`text-[10px] font-bold ${theme.textMuted}`}>{order.customerId?.phone || 'No Phone'}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: 'Items',
                        key: 'items',
                        headerClassName: 'text-center',
                        className: 'text-center',
                        render: (_, order) => (
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${theme.mode === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                {order.items?.length || 0} Items
                            </span>
                        )
                    },
                    {
                        header: 'Subtotal',
                        key: 'subtotal',
                        render: (_, order) => (
                            <p className={`font-bold text-sm ${theme.textPrimary}`}>{fmt(order.subtotal || 0)}</p>
                        )
                    },
                    {
                        header: 'Offers',
                        key: 'offerDiscountTotal',
                        render: (_, order) => (
                            <p className={`font-bold text-sm ${(order.offerDiscountTotal || 0) > 0 ? 'text-emerald-600' : theme.textMuted}`}>
                                {(order.offerDiscountTotal || 0) > 0 ? `-${fmt(order.offerDiscountTotal)}` : '—'}
                            </p>
                        )
                    },
                    {
                        header: 'Discount',
                        key: 'discountTotal',
                        render: (_, order) => (
                            <p className={`font-bold text-sm ${(order.discountTotal || 0) > 0 ? 'text-orange-600' : theme.textMuted}`}>
                                {(order.discountTotal || 0) > 0 ? `-${fmt(order.discountTotal)}` : '—'}
                            </p>
                        )
                    },
                    {
                        header: 'Total',
                        key: 'grandTotal',
                        render: (_, order) => (
                            <div>
                                <p className="font-black text-base text-indigo-600">{fmt(order.grandTotal)}</p>
                                {order.exchangeCredit > 0 && (
                                    <p className="text-[10px] font-black text-orange-600 uppercase">Exch: -{fmt(order.exchangeCredit)}</p>
                                )}
                            </div>
                        )
                    },
                    {
                        header: 'Status',
                        key: 'orderStatus',
                        render: (_, order) => (
                            <div className="flex items-center gap-1.5 text-emerald-500">
                                <CheckCircle2 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {order.isExchange ? 'EXCHANGE' : order.orderStatus}
                                </span>
                            </div>
                        )
                    },
                    {
                        header: 'Actions',
                        key: '_id',
                        headerClassName: 'text-right',
                        className: 'text-right',
                        render: (_, order) => (
                            <div className="flex items-center justify-end gap-1.5">
                                {order.editHistory?.length > 0 && (
                                    <button
                                        onClick={e => { e.stopPropagation(); toggleOrderArea(order._id); }}
                                        className={`p-2 rounded-xl border ${theme.borderLight} ${expandedOrders[order._id] ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : theme.textMuted} hover:text-indigo-600 transition-colors bg-white dark:bg-slate-800 shadow-sm`}
                                    >
                                        {expandedOrders[order._id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                )}
                                <button
                                    onClick={e => { e.stopPropagation(); handleEditSale(order); }}
                                    className={`p-2 rounded-xl border ${theme.borderLight} ${theme.textMuted} hover:text-indigo-600 transition-colors bg-white dark:bg-slate-800 shadow-sm`}
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); handleProcessReturn(order); }}
                                    className="px-3 py-2 rounded-xl text-xs font-black bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-1.5 shadow-md"
                                >
                                    <RotateCcw size={13} />
                                    Return
                                </button>
                            </div>
                        )
                    }
                ] : [
                    {
                        header: 'Return Info',
                        key: 'returnNumber',
                        render: (_, ret) => (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">#{ret.returnNumber}</span>
                                    <span className="text-[10px] font-black text-gray-400">{formatDate(ret.returnDate)}</span>
                                </div>
                                <p className={`font-black ${theme.textHeading}`}>Order #{ret.orderId?.orderNumber}</p>
                            </div>
                        )
                    },
                    {
                        header: 'Customer',
                        key: 'orderId',
                        render: (_, ret) => (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 flex-shrink-0">
                                    <User size={15} />
                                </div>
                                <div>
                                    <p className={`font-black text-sm ${theme.textPrimary}`}>{ret.orderId?.customerId?.name || 'Walk-in'}</p>
                                    <p className={`text-[10px] font-bold ${theme.textMuted}`}>By {ret.createdBy?.username}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: 'Items',
                        key: 'items',
                        render: (_, ret) => (
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase text-orange-500">Returned: {ret.items?.length || 0}</span>
                                {(ret.exchangeOrderId || ret.exchangeItems?.length > 0) && <span className="text-[10px] font-black uppercase text-indigo-500">Exchanged</span>}
                            </div>
                        )
                    },
                    {
                        header: 'Amount',
                        key: 'totalReturnAmount',
                        render: (_, ret) => (
                            <div>
                                <p className="text-sm font-black text-orange-600">-{fmt(ret.totalReturnAmount)}</p>
                                {ret.exchangeOrderId && <p className="text-[10px] font-bold text-indigo-600">Exchange linked</p>}
                            </div>
                        )
                    },
                    {
                        header: 'Net',
                        key: 'netAmount',
                        render: (_, ret) => <p className={`font-black ${theme.textHeading}`}>{fmt(ret.netAmount)}</p>
                    },
                    {
                        header: 'Actions',
                        key: '_id',
                        headerClassName: 'text-right',
                        className: 'text-right',
                        render: (_, ret) => (
                            <div className="flex items-center justify-end gap-1.5">
                                <button onClick={e => { e.stopPropagation(); handleViewReturnDetail(ret); }} className={`p-2 rounded-xl border ${theme.borderLight} ${theme.textMuted} hover:text-indigo-600 transition-colors bg-white dark:bg-slate-800 shadow-sm`}><Eye size={16} /></button>
                                <button className={`p-2 rounded-xl border ${theme.borderLight} ${theme.textMuted} hover:text-indigo-600 transition-colors bg-white dark:bg-slate-800 shadow-sm`}><ArrowUpRight size={16} /></button>
                            </div>
                        )
                    }
                ]}
                data={activeTab === 'history' ? sales : returns}
                rowKey="_id"
                isLoading={loading}
                emptyMessage={activeTab === 'history' ? 'No sales found' : 'No returns found'}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                onPageChange={setCurrentPage}
                renderAdditionalRow={activeTab === 'history' ? (order) => (
                    expandedOrders[order._id] && order.editHistory?.length > 0 ? (
                        <tr key={`history-${order._id}`}>
                            <td colSpan="9" className="p-0">
                                <div className={`${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-indigo-50/30'} border-t ${theme.borderLight} p-4 md:p-6`}>
                                    <h4 className={`text-xs font-black uppercase tracking-widest ${theme.textHeading} mb-4 flex items-center gap-2`}>
                                        <History size={14} className="text-indigo-500" /> Edit History
                                    </h4>
                                    <div className="space-y-3">
                                        {order.editHistory.sort((a,b) => new Date(b.editedAt) - new Date(a.editedAt)).map((edit, idx) => (
                                            <div key={idx} className={`p-3 rounded-2xl bg-white dark:bg-slate-800 border ${theme.borderLight} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm`}>
                                                <div className="flex items-start gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0"><User size={12} /></div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${theme.textPrimary}`}>By <span className="font-black text-indigo-600">{edit.editedByName || 'Unknown'}</span></p>
                                                        <p className={`text-xs ${theme.textMuted} italic`}>"{edit.reason}"</p>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-1.5 text-xs font-bold text-gray-400 px-2.5 py-1 rounded-lg border ${theme.borderLight} bg-gray-50 dark:bg-white/5 whitespace-nowrap`}>
                                                    <Clock size={11} />{formatDate(edit.editedAt)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ) : null
                ) : undefined}
                mobileCardRender={activeTab === 'history' ? (order) => (
                    <div className={`p-3 ${theme.surfaceBg}`}>
                        {/* Row 1: order info + amount */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">#{order.orderNumber}</span>
                                    <span className="text-[10px] text-gray-400">{formatDate(order.createdAt)}</span>
                                </div>
                                <p className={`font-black text-sm ${theme.textHeading}`}>{order.invoiceNumber || 'No Invoice'}</p>
                                <p className={`text-xs font-bold ${theme.textMuted}`}>{order.customerId?.name || 'Walk-in Customer'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className={`text-[10px] font-bold ${theme.textMuted}`}>Sub: {fmt(order.subtotal || 0)}</p>
                                {((order.offerDiscountTotal || 0) > 0 || (order.discountTotal || 0) > 0) && (
                                    <p className="text-[10px] font-bold text-emerald-600">
                                        {(order.offerDiscountTotal || 0) > 0 && `Offer -${fmt(order.offerDiscountTotal)}`}
                                        {(order.offerDiscountTotal || 0) > 0 && (order.discountTotal || 0) > 0 && ' · '}
                                        {(order.discountTotal || 0) > 0 && `Disc -${fmt(order.discountTotal)}`}
                                    </p>
                                )}
                                <p className="font-black text-base text-indigo-600">{fmt(order.grandTotal)}</p>
                                <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500`}>
                                    <CheckCircle2 size={10} />{order.isExchange ? 'EXCHANGE' : order.orderStatus}
                                </span>
                            </div>
                        </div>
                        {/* Row 2: items badge + actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${theme.mode === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                {order.items?.length || 0} Items
                            </span>
                            {order.editHistory?.length > 0 && (
                                <button onClick={e => { e.stopPropagation(); toggleOrderArea(order._id); }} className={`p-1.5 rounded-lg border ${theme.borderLight} ${theme.textMuted}`}>
                                    {expandedOrders[order._id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); handleEditSale(order); }} className={`p-1.5 rounded-lg border ${theme.borderLight} ${theme.textMuted}`}>
                                <Edit3 size={14} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleProcessReturn(order); }} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-orange-600 text-white flex items-center gap-1">
                                <RotateCcw size={11} /> Return
                            </button>
                        </div>
                        {/* Expanded edit history */}
                        {expandedOrders[order._id] && order.editHistory?.length > 0 && (
                            <div className={`mt-3 p-3 rounded-xl ${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-indigo-50/30'} border ${theme.borderLight}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Edit History</p>
                                {order.editHistory.sort((a,b) => new Date(b.editedAt) - new Date(a.editedAt)).map((edit, idx) => (
                                    <div key={idx} className={`mb-2 p-2 rounded-xl bg-white dark:bg-slate-800 border ${theme.borderLight}`}>
                                        <p className={`text-xs font-bold ${theme.textPrimary}`}><span className="text-indigo-600">{edit.editedByName}</span> · {formatDate(edit.editedAt)}</p>
                                        <p className={`text-[10px] ${theme.textMuted} italic`}>"{edit.reason}"</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (ret) => (
                    <div className={`p-3 ${theme.surfaceBg}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-700">#{ret.returnNumber}</span>
                                    <span className="text-[10px] text-gray-400">{formatDate(ret.returnDate)}</span>
                                </div>
                                <p className={`font-black text-sm ${theme.textHeading}`}>Order #{ret.orderId?.orderNumber}</p>
                                <p className={`text-xs ${theme.textMuted}`}>{ret.orderId?.customerId?.name || 'Walk-in'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="font-black text-sm text-orange-600">-{fmt(ret.totalReturnAmount)}</p>
                                <p className={`text-xs font-bold ${theme.textMuted}`}>Net: {fmt(ret.netAmount)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={e => { e.stopPropagation(); handleViewReturnDetail(ret); }} className={`p-1.5 rounded-lg border ${theme.borderLight} ${theme.textMuted}`}><Eye size={14} /></button>
                            <button className={`p-1.5 rounded-lg border ${theme.borderLight} ${theme.textMuted}`}><ArrowUpRight size={14} /></button>
                        </div>
                    </div>
                )}
            />

            {/* Modals */}
            {selectedOrder && (
                <OrderReturnSheet
                    isOpen={isReturnSheetOpen}
                    onClose={() => setIsReturnSheetOpen(false)}
                    order={selectedOrder}
                    onSuccess={fetchSales}
                />
            )}

            <ReturnDetailModal
                isOpen={isReturnDetailOpen}
                onClose={() => setIsReturnDetailOpen(false)}
                returnData={selectedReturn}
                theme={theme}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
            />

            <OrderEditSheet
                isOpen={isEditSheetOpen}
                onClose={() => setIsEditSheetOpen(false)}
                order={selectedOrderForEdit}
                onSuccess={fetchSales}
            />
        </div>
    );
};

export default SalesList;
