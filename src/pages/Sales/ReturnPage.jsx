import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, RotateCcw, User, Receipt, Loader2, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency, formatDate } from '../../utils/format';
import OrderReturnForm from '../../components/returns/OrderReturnForm';
import { toast } from 'react-hot-toast';

const ReturnPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { formatCurrency: appFormatCurrency } = useApp();
    const { theme } = useTheme();
    const fmt = appFormatCurrency || formatCurrency;

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loadingOrder, setLoadingOrder] = useState(false);

    const resolvedShopId = user?.shopId || user?.shop_id;

    const loadOrder = useCallback(async (orderId) => {
        if (!orderId) return;
        setLoadingOrder(true);
        try {
            const order = await orderService.getOrderById(orderId);
            if (order?.orderStatus !== 'COMPLETED') {
                toast.error('Only completed sales can be returned.');
                return;
            }
            setSelectedOrder(order);
        } catch (err) {
            console.error('Failed to load order:', err);
            toast.error('Could not load invoice details.');
        } finally {
            setLoadingOrder(false);
        }
    }, []);

    useEffect(() => {
        const orderId = searchParams.get('orderId');
        if (orderId) loadOrder(orderId);
    }, [searchParams, loadOrder]);

    useEffect(() => {
        if (!resolvedShopId) return;
        const term = searchQuery.trim();
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const response = await orderService.getOrders({
                    shopId: resolvedShopId,
                    search: term,
                    orderStatus: 'COMPLETED',
                    page: 1,
                    limit: 12,
                    sortBy: 'createdAt',
                    sortOrder: 'desc',
                });
                const orders = response?.data || (Array.isArray(response) ? response : []);
                setSearchResults(orders);
            } catch (err) {
                console.error('Invoice search failed:', err);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, resolvedShopId]);

    const handleSelectOrder = (order) => {
        setSearchQuery(order.invoiceNumber || order.orderNumber || '');
        setSearchResults([]);
        loadOrder(order._id);
    };

    const handleReturnSuccess = () => {
        navigate('/sales-history?tab=returns');
    };

    const clearSelection = () => {
        setSelectedOrder(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className={`min-h-full ${theme.pageBg} p-3 md:p-8`}>
            <div className="max-w-[1000px] mx-auto space-y-4 md:space-y-8 pb-10">
                <div className="mb-2">
                    <Link to="/sales-history?tab=returns" className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-colors hover:opacity-70 ${theme.textMuted}`}>
                        <ArrowLeft size={14} /> Sales Returns
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className={`text-xl md:text-3xl font-black uppercase ${theme.textHeading}`}>
                            Make Return
                        </h1>
                        <p className={`font-bold text-[10px] uppercase tracking-widest mt-0.5 ${theme.textMuted}`}>
                            Search invoice and select items to return or exchange
                        </p>
                    </div>
                </div>

                <div className={`${theme.surfaceBg} rounded-2xl md:rounded-[40px] shadow-md md:shadow-2xl p-4 md:p-12 border ${theme.borderLight} space-y-4 md:space-y-6`}>
                    <h2 className={`text-base md:text-lg font-black flex items-center gap-3 uppercase ${theme.textHeading}`}>
                        <Search className="text-orange-600" size={20} /> Find Invoice
                    </h2>

                    <div className="relative">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (selectedOrder) setSelectedOrder(null);
                            }}
                            placeholder="Search by Order # or Invoice #..."
                            className={`w-full pl-12 pr-12 py-4 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary}`}
                        />
                        {searching && (
                            <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 animate-spin ${theme.textMuted}`} size={20} />
                        )}
                        {selectedOrder && !searching && (
                            <button
                                type="button"
                                onClick={clearSelection}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-50 text-red-500`}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {!selectedOrder && searchResults.length > 0 && (
                        <div className={`rounded-2xl border overflow-hidden divide-y ${theme.borderLight}`}>
                            {searchResults.map((order) => (
                                <button
                                    key={order._id}
                                    type="button"
                                    onClick={() => handleSelectOrder(order)}
                                    className={`w-full p-4 text-left hover:bg-orange-50 dark:hover:bg-orange-900/10 flex items-center justify-between gap-4 transition-colors`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                                #{order.orderNumber}
                                            </span>
                                            <span className={`text-[10px] font-bold ${theme.textMuted}`}>{formatDate(order.createdAt)}</span>
                                        </div>
                                        <p className={`font-black ${theme.textPrimary}`}>{order.invoiceNumber || 'No Invoice'}</p>
                                        <p className={`text-xs font-bold ${theme.textMuted} flex items-center gap-1 mt-0.5`}>
                                            <User size={12} /> {order.customerId?.name || 'Walk-in'}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-black text-indigo-600">{fmt(order.grandTotal)}</p>
                                        <p className={`text-[10px] font-bold ${theme.textMuted}`}>{order.items?.length || 0} items</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!selectedOrder && searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                        <p className={`text-center text-sm font-bold py-6 ${theme.textMuted}`}>No completed invoices found for this search.</p>
                    )}
                </div>

                {loadingOrder && (
                    <div className={`${theme.surfaceBg} rounded-2xl md:rounded-[40px] p-8 md:p-12 border ${theme.borderLight} flex flex-col items-center justify-center gap-3`}>
                        <Loader2 className="animate-spin text-orange-600" size={32} />
                        <p className={`font-bold ${theme.textMuted}`}>Loading invoice details...</p>
                    </div>
                )}

                {selectedOrder && !loadingOrder && (
                    <div className={`${theme.surfaceBg} rounded-2xl md:rounded-[40px] shadow-md md:shadow-2xl p-4 md:p-12 border ${theme.borderLight} space-y-4 md:space-y-8`}>
                        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b ${theme.borderLight}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600">
                                    <Receipt size={24} />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black ${theme.textHeading}`}>
                                        {selectedOrder.invoiceNumber || `Order #${selectedOrder.orderNumber}`}
                                    </h2>
                                    <p className={`text-sm font-medium ${theme.textMuted}`}>
                                        #{selectedOrder.orderNumber} • {selectedOrder.customerId?.name || 'Walk-in'} • {formatDate(selectedOrder.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Invoice Total</p>
                                <p className="text-2xl font-black text-indigo-600">{fmt(selectedOrder.grandTotal)}</p>
                            </div>
                        </div>

                        <OrderReturnForm
                            order={selectedOrder}
                            onSuccess={handleReturnSuccess}
                            onCancel={clearSelection}
                        />
                    </div>
                )}

                {!selectedOrder && !loadingOrder && searchQuery.trim().length < 2 && (
                    <div className={`text-center py-12 rounded-2xl md:rounded-[40px] border-2 border-dashed ${theme.borderLight}`}>
                        <RotateCcw size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className={`font-bold ${theme.textMuted}`}>Search for an invoice to start a return</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReturnPage;
