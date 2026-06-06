import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, User, Trash2, History, Loader2 } from 'lucide-react';
import { useTakeaway } from '../pages/Takeaway/TakeawayContext';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { orderService } from '../services/api';
import {
    buildHistorySaleOrderState,
    buildTakeawayDraftSignature,
} from '../utils/saleDraftSignature';
import toast from 'react-hot-toast';

const getOrderTypeForView = (view) => {
    const normalizedView = String(view || '').toLowerCase();
    if (normalizedView === 'wholesale') return 'WHOLESALE';
    if (normalizedView === 'direct-sale') return 'DIRECT_SALE';
    return 'TAKEAWAY';
};

const PosTabBar = ({ view }) => {
    const {
        tabs,
        activeTabId,
        addTab,
        switchTab,
        closeTab,
        clearAllTabs,
        takeawayOrder,
        takeawayCustName,
        tableId,
        loadHistorySale,
        setIsTakeaway,
    } = useTakeaway();
    const { theme } = useTheme();
    const { menu, currentShopId, activeBranchId, formatCurrency } = useApp();
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [recentSales, setRecentSales] = useState([]);
    const historyRef = useRef(null);
    const historyButtonRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState(null);

    const confirmClearAll = () => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-xl">
                        <Trash2 size={20} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-100 uppercase tracking-tight">Clear all tabs?</p>
                        <p className="text-[10px] font-bold text-slate-400">This will reset all current orders.</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            clearAllTabs();
                            toast.dismiss(t.id);
                            toast.success('All tabs cleared', {
                                icon: '🗑️',
                                style: {
                                    borderRadius: '12px',
                                    background: '#1e293b',
                                    color: '#fff',
                                },
                            });
                        }}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95"
                    >
                        Confirm Clear
                    </button>
                </div>
            </div>
        ), {
            duration: 3000,
            position: 'top-center',
            style: {
                background: '#0f172a',
                color: '#fff',
                padding: '16px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            },
        });
    };

    const fetchRecentSales = useCallback(async () => {
        if (!currentShopId) return;
        setHistoryLoading(true);
        try {
            const data = await orderService.getOrders({
                branchId: activeBranchId || undefined,
                orderStatus: 'COMPLETED',
                orderType: getOrderTypeForView(view),
            });
            const sales = Array.isArray(data) ? data : (data?.data || data?.orders || []);
            setRecentSales(sales.slice(0, 10));
        } catch (error) {
            console.error('Failed to fetch recent sales:', error);
            toast.error('Failed to load sale history');
        } finally {
            setHistoryLoading(false);
        }
    }, [currentShopId, activeBranchId, view]);

    useEffect(() => {
        if (!showHistory) return;
        fetchRecentSales();
    }, [showHistory, fetchRecentSales]);

    const updateDropdownPosition = useCallback(() => {
        if (!historyButtonRef.current) return;
        const rect = historyButtonRef.current.getBoundingClientRect();
        const dropdownWidth = 320;
        const left = Math.min(
            Math.max(12, rect.right - dropdownWidth),
            window.innerWidth - dropdownWidth - 12
        );
        setDropdownStyle({
            top: rect.bottom + 8,
            left,
            width: dropdownWidth,
        });
    }, []);

    useEffect(() => {
        if (!showHistory) {
            setDropdownStyle(null);
            return undefined;
        }

        updateDropdownPosition();
        window.addEventListener('resize', updateDropdownPosition);
        window.addEventListener('scroll', updateDropdownPosition, true);

        const handleClickOutside = (event) => {
            if (historyRef.current?.contains(event.target)) return;
            if (historyButtonRef.current?.contains(event.target)) return;
            setShowHistory(false);
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('resize', updateDropdownPosition);
            window.removeEventListener('scroll', updateDropdownPosition, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showHistory, updateDropdownPosition]);

    const handleSelectHistorySale = async (order) => {
        try {
            const fullOrder = await orderService.getOrderById(order._id || order.id);
            const orderState = buildHistorySaleOrderState(fullOrder, menu);
            const customerName = fullOrder.customerId?.name || fullOrder.customerName || '';
            const customerPhone = fullOrder.customerId?.phone || fullOrder.customerPhone || '';
            const historyEditBaseline = buildTakeawayDraftSignature({
                activeTabId,
                takeawayOrder: orderState,
                activeOrderType: orderState.orderType,
                takeawayCustName: customerName,
                takeawayCustPhone: customerPhone,
            });

            setIsTakeaway(true);
            loadHistorySale(
                orderState,
                customerName,
                customerPhone,
                fullOrder.customerId || null,
                historyEditBaseline
            );
            setShowHistory(false);
            toast.success(`Loaded sale ${fullOrder.orderNumber || ''} for editing`);
        } catch (error) {
            console.error('Failed to load sale into cart:', error);
            toast.error('Failed to load selected sale');
        }
    };

    // Never show when a table order is active
    if (tableId) return null;

    const normalizedView = String(view || '').toLowerCase();
    const showTabs = normalizedView === 'takeaway'
        || normalizedView === 'wholesale'
        || normalizedView === 'direct-sale'
        || normalizedView === 'order';

    if (!showTabs) return null;

    const saleTabs = tabs.filter((t) => !t.tableId);

    const historyDropdown = showHistory && dropdownStyle ? createPortal(
        <div
            ref={historyRef}
            style={{
                position: 'fixed',
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
                zIndex: 9999,
            }}
            className={`max-h-[360px] overflow-y-auto rounded-2xl shadow-2xl border ${theme.surfaceBg} ${theme.borderLight}`}
        >
            <div className={`px-4 py-3 border-b sticky top-0 z-10 ${theme.surfaceBg} ${theme.borderLight}`}>
                <p className={`text-xs font-black uppercase tracking-widest ${theme.textHeading}`}>Recent Sales</p>
                <p className={`text-[10px] font-bold ${theme.textMuted}`}>Last 10 completed sales for this branch</p>
            </div>

            {historyLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                    <Loader2 size={18} className="animate-spin text-indigo-500" />
                    <span className={`text-xs font-bold ${theme.textMuted}`}>Loading...</span>
                </div>
            ) : recentSales.length === 0 ? (
                <div className={`px-4 py-8 text-center text-xs font-bold ${theme.textMuted}`}>
                    No recent sales found
                </div>
            ) : (
                recentSales.map((sale) => {
                    const customer = sale.customerId?.name || sale.customerName || 'Walk-in';
                    const total = formatCurrency
                        ? formatCurrency(sale.grandTotal || 0)
                        : Number(sale.grandTotal || 0).toFixed(2);
                    const createdAt = sale.createdAt
                        ? new Date(sale.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '';

                    return (
                        <button
                            key={sale._id || sale.id}
                            onClick={() => handleSelectHistorySale(sale)}
                            className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${theme.borderLight}`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className={`text-xs font-black uppercase ${theme.textHeading}`}>
                                    {sale.orderNumber || `#${String(sale._id || '').slice(-6)}`}
                                </span>
                                <span className="text-xs font-black text-indigo-500">{total}</span>
                            </div>
                            <p className={`text-[10px] font-bold mt-1 truncate ${theme.textMuted}`}>{customer}</p>
                            <p className={`text-[10px] font-bold mt-0.5 ${theme.textMuted}`}>
                                {(sale.items || []).length} items {createdAt ? `• ${createdAt}` : ''}
                            </p>
                        </button>
                    );
                })
            )}
        </div>,
        document.body
    ) : null;

    return (
        <div className="flex items-center justify-start md:justify-center xl:justify-center w-full px-4 pt-2 pb-2 xl:pt-0 xl:pb-0">
            <div className="flex items-center gap-1.5 p-1.5 bg-[#7a818e] rounded-full shadow-lg overflow-x-auto no-scrollbar max-w-full xl:pointer-events-auto">
                {saleTabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const activeOrder = isActive ? takeawayOrder : (tab.takeawayOrder || {});
                    const itemCount = (activeOrder.items || []).length || 0;
                    const rawOrderLabel = activeOrder.orderNumber || activeOrder.orderId;
                    const orderLabel = rawOrderLabel ? `#${String(rawOrderLabel).slice(-6)}` : null;
                    const fallbackName = (isActive ? takeawayCustName : tab.takeawayCustName) || tab.name;
                    const tabLabel = orderLabel || fallbackName;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`group relative shrink-0 min-w-[100px] md:min-w-[140px] max-w-[180px] h-9 md:h-11 px-3 md:px-5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 transform rounded-full
                                ${isActive
                                    ? 'bg-[#5b52f6] text-white shadow-lg z-10'
                                    : 'text-slate-200 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                {itemCount > 0 ? (
                                    <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black
                                        ${isActive ? 'bg-white text-[#5b52f6]' : 'bg-slate-400/50 text-white'}`}>
                                        {itemCount}
                                    </div>
                                ) : (
                                    <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                                        <User size={12} className={isActive ? 'text-white' : 'text-slate-200'} />
                                    </div>
                                )}
                                <span className="text-[11px] md:text-[13px] font-black truncate tracking-wide uppercase">
                                    {tabLabel}
                                </span>
                            </div>

                            <button
                                onClick={(e) => closeTab(tab.id, e)}
                                className={`p-0.5 rounded-full transition-all shrink-0
                                    ${isActive
                                        ? 'hover:bg-white/20 text-white/70 hover:text-white'
                                        : 'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                                    }`}
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    );
                })}

                <div className="flex items-center gap-1.5 px-2 border-l border-white/10 ml-1 shrink-0">
                    <button
                        ref={historyButtonRef}
                        onClick={() => setShowHistory((prev) => !prev)}
                        className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl transition-all flex items-center justify-center ${
                            showHistory ? 'bg-white text-[#5b52f6]' : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title="Recent Sales"
                    >
                        <History size={18} strokeWidth={2.5} />
                    </button>

                    <button
                        onClick={addTab}
                        className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all flex items-center justify-center"
                        title="New Sale Tab"
                    >
                        <Plus size={18} strokeWidth={4} />
                    </button>

                    {saleTabs.length > 1 && (
                        <button
                            onClick={confirmClearAll}
                            className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl bg-[#c17878]/30 text-[#e68c8c] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                            title="Clear All Tabs"
                        >
                            <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>
            {historyDropdown}
        </div>
    );
};

export default PosTabBar;
