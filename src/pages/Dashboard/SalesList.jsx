import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
    History
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import OrderReturnSheet from '../../components/modals/OrderReturnSheet';
import OrderEditSheet from '../../components/modals/OrderEditSheet';

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

const SalesList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'returns'
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);
    const [returns, setReturns] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isReturnSheetOpen, setIsReturnSheetOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [isReturnDetailOpen, setIsReturnDetailOpen] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});

    const toggleOrderArea = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const fetchSales = useCallback(async () => {
        const resolvedShopId = user?.shopId || user?.shop_id;
        if (!resolvedShopId) return;

        setLoading(true);
        try {
            if (activeTab === 'history') {
                const data = await orderService.getOrders({ 
                    shopId: resolvedShopId, 
                    search: searchQuery,
                    orderStatus: 'COMPLETED' // showing only completed sales by default
                });
                setSales(data);
            } else {
                const data = await orderService.getOrderReturns({ 
                    shopId: resolvedShopId,
                    search: searchQuery 
                });
                setReturns(data);
            }
        } catch (error) {
            console.error("Failed to fetch sales data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.shopId, user?.shop_id, activeTab, searchQuery]);

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchSales();
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [fetchSales]);

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

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className={`text-2xl md:text-4xl font-black ${theme.textHeading} tracking-tight`}>Sales History</h1>
                    <p className={`${theme.textMuted} mt-1 font-medium`}>Manage your shop's sales records and processed returns</p>
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
                    <button
                        type="button"
                        className={`p-3.5 rounded-2xl border ${theme.borderLight} ${theme.textPrimary} hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                    >
                        <Filter size={22} />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/sales/new')}
                        className="px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Add Sale
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4 p-2 rounded-2xl shadow-sm w-full md:w-fit ${theme.surfaceBg}`}>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    className={`w-full sm:w-auto px-4 md:px-6 py-3 rounded-xl font-black transition-all flex items-center justify-center sm:justify-start gap-2 ${
                        activeTab === 'history'
                            ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                            : `${theme.textSecondary} hover:opacity-80`
                    }`}
                >
                    <ShoppingBag size={18} />
                    All Sales
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'returns'}
                    onClick={() => setActiveTab('returns')}
                    className={`w-full sm:w-auto px-4 md:px-6 py-3 rounded-xl font-black transition-all flex items-center justify-center sm:justify-start gap-2 ${
                        activeTab === 'returns'
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                            : `${theme.textSecondary} hover:opacity-80`
                    }`}
                >
                    <RotateCcw size={18} />
                    Sales Returns
                </button>
            </div>

            {/* Content Table */}
            <div className={`flex-1 overflow-hidden flex flex-col rounded-[32px] md:rounded-[40px] border ${theme.borderLight} ${theme.surfaceBg} shadow-sm`}>
                <div className="overflow-x-auto h-full custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center p-20 space-y-4">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className={`font-black uppercase tracking-widest text-xs ${theme.textMuted}`}>Loading records...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-[0.2em] ${theme.surfaceBg} border-b ${theme.borderLight}`}>
                                    <th className="px-4 md:px-8 py-4 md:py-6">Order Info</th>
                                    <th className="px-4 md:px-8 py-4 md:py-6">Customer</th>
                                    <th className="px-4 md:px-8 py-4 md:py-6">Items</th>
                                    <th className="px-4 md:px-8 py-4 md:py-6">Amount</th>
                                    <th className="px-4 md:px-8 py-4 md:py-6">Status</th>
                                    <th className="px-4 md:px-8 py-4 md:py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.borderLight}`}>
                                {activeTab === 'history' ? (
                                    sales.length > 0 ? sales.map((order) => (
                                        <React.Fragment key={order._id}>
                                        <tr className={`group hover:${theme.mode === 'dark' ? 'bg-white/5' : 'bg-gray-50/50'} transition-all`}>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400`}>#{order.orderNumber}</span>
                                                        <span className={`text-[10px] font-black text-gray-400`}>{formatDate(order.createdAt)}</span>
                                                    </div>
                                                    <p className={`font-black ${theme.textHeading}`}>{order.invoiceNumber || 'No Invoice'}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500">
                                                        <User size={18} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-black ${theme.textPrimary}`}>{order.customerId?.name || 'Walk-in Customer'}</p>
                                                        <p className={`text-xs font-bold ${theme.textMuted}`}>{order.customerId?.phone || 'No Phone'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${theme.mode === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                                    {order.items?.length || 0} Items
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="space-y-0.5">
                                                    <p className={`font-black text-lg text-indigo-600`}>
                                                        {formatCurrency(order.grandTotal)}
                                                    </p>
                                                    {order.exchangeCredit > 0 && (
                                                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                                                            Exchange Credit: -{formatCurrency(order.exchangeCredit)}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex items-center gap-2 text-emerald-500">
                                                    <CheckCircle2 size={16} />
                                                    <span className="text-xs font-black uppercase tracking-widest">
                                                        {order.isExchange ? 'EXCHANGE' : order.orderStatus}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {order.editHistory && order.editHistory.length > 0 && (
                                                        <button 
                                                            onClick={() => toggleOrderArea(order._id)}
                                                            className={`p-2.5 rounded-xl border ${theme.borderLight} ${expandedOrders[order._id] ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30' : theme.textMuted} hover:text-indigo-600 hover:border-indigo-200 transition-colors bg-white dark:bg-slate-800 shadow-sm`}
                                                            title="View Edit History"
                                                        >
                                                            {expandedOrders[order._id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleEditSale(order)}
                                                        className={`p-2.5 rounded-xl border ${theme.borderLight} ${theme.textMuted} hover:text-indigo-600 hover:border-indigo-200 transition-colors bg-white dark:bg-slate-800 shadow-sm`}
                                                        title="Edit Items/Quantity"
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleProcessReturn(order)}
                                                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20 flex items-center gap-2`}
                                                    >
                                                        <RotateCcw size={14} />
                                                        Process Return
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expandable Edit History Row */}
                                        {expandedOrders[order._id] && order.editHistory && order.editHistory.length > 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-0 border-none bg-transparent">
                                                    <div className={`${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-indigo-50/30'} border-t ${theme.borderLight} p-4 md:p-8 animate-in slide-in-from-top-2 duration-300 overflow-hidden`}>
                                                        <h4 className={`text-sm font-black uppercase tracking-widest ${theme.textHeading} mb-6 flex items-center gap-2`}>
                                                            <History size={18} className="text-indigo-500" /> Edit History
                                                        </h4>
                                                        <div className="space-y-4">
                                                            {order.editHistory.sort((a,b) => new Date(b.editedAt) - new Date(a.editedAt)).map((edit, idx) => (
                                                                <div key={idx} className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border ${theme.borderLight} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                                                            <User size={14} />
                                                                        </div>
                                                                        <div>
                                                                            <p className={`text-sm font-bold ${theme.textPrimary}`}>Edited by <span className="font-black text-indigo-600">{edit.editedByName || 'Unknown User'}</span></p>
                                                                            <p className={`text-xs ${theme.textMuted} mt-0.5 whitespace-pre-wrap italic`}>Reason: "{edit.reason}"</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 whitespace-nowrap bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
                                                                        <Clock size={12} />
                                                                        {formatDate(edit.editedAt)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </React.Fragment>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 md:px-8 py-12 md:py-20 text-center">
                                                <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
                                                <p className={`font-bold ${theme.textMuted}`}>No sales found</p>
                                            </td>
                                        </tr>
                                    )
                                ) : (
                                    returns.length > 0 ? returns.map((ret) => (
                                        <tr key={ret._id} className={`group hover:${theme.mode === 'dark' ? 'bg-white/5' : 'bg-gray-50/50'} transition-all`}>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400`}>#{ret.returnNumber}</span>
                                                        <span className={`text-[10px] font-black text-gray-400`}>{formatDate(ret.returnDate)}</span>
                                                    </div>
                                                    <p className={`font-black ${theme.textHeading}`}>For Order #{ret.orderId?.orderNumber}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500">
                                                        <User size={18} />
                                                    </div>
                                                    <div>
                                                        <p className={`font-black ${theme.textPrimary}`}>{ret.orderId?.customerId?.name || 'Walk-in'}</p>
                                                        <p className={`text-xs font-bold ${theme.textMuted}`}>By {ret.createdBy?.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase text-orange-500">Returned: {ret.items?.length || 0}</span>
                                                    {(ret.exchangeOrderId || ret.exchangeItems?.length > 0) && <span className="text-[10px] font-black uppercase text-indigo-500">Exchanged</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-orange-600">-{formatCurrency(ret.totalReturnAmount)}</p>
                                                    {ret.exchangeOrderId && <p className="text-[10px] font-bold text-indigo-600">Linked to Order Exchange</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6 font-black text-lg text-gray-800 dark:text-gray-100">
                                                {formatCurrency(ret.netAmount)}
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleViewReturnDetail(ret)}
                                                        className={`p-2.5 rounded-xl border ${theme.borderLight} ${theme.textMuted} hover:text-indigo-600 hover:border-indigo-200 transition-colors bg-white dark:bg-slate-800 shadow-sm`}
                                                        title="View Mapping Details"
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                    <button className={`p-2.5 rounded-xl border ${theme.borderLight} ${theme.textMuted} hover:text-indigo-600 hover:border-indigo-200 transition-colors bg-white dark:bg-slate-800 shadow-sm`}>
                                                        <ArrowUpRight size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 md:px-8 py-12 md:py-20 text-center">
                                                <RotateCcw size={48} className="mx-auto mb-4 text-gray-300" />
                                                <p className={`font-bold ${theme.textMuted}`}>No returns found</p>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

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
