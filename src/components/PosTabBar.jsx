import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, User, Trash2, History, Loader2, Volume2, VolumeX, GripVertical } from 'lucide-react';
import { useTakeaway } from '../pages/Takeaway/TakeawayContext';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { orderService } from '../services/api';
import { isSoundEnabled, toggleSoundEnabled } from '../utils/soundService';
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
        reorderTabs,
    } = useTakeaway();
    const { theme } = useTheme();
    const { menu, currentShopId, activeBranchId, formatCurrency } = useApp();
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [recentSales, setRecentSales] = useState([]);
    const historyRef = useRef(null);
    const historyButtonRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState(null);
    const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

    useEffect(() => {
        const handleSoundChange = (e) => {
            if (e?.detail) {
                setSoundOn(e.detail.enabled);
            }
        };
        window.addEventListener('pos_sound_changed', handleSoundChange);
        return () => window.removeEventListener('pos_sound_changed', handleSoundChange);
    }, []);

    const handleToggleSound = () => {
        const next = toggleSoundEnabled();
        setSoundOn(next);
        toast.success(next ? "Voice Announcements Enabled" : "Voice Announcements Muted", {
            icon: next ? "🔊" : "🔇",
            duration: 2000,
        });
    };

    // Tab Drag & Drop reordering state
    const [draggedTabId, setDraggedTabId] = useState(null);
    const [dragOverTabId, setDragOverTabId] = useState(null);

    // Whole Bar Position & Dragging state
    const [barPosition, setBarPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('pos_tabbar_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    return parsed;
                }
            }
        } catch {}
        return { x: 0, y: 0 };
    });
    const isDraggingBarRef = useRef(false);
    const barDragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

    // Drag-to-scroll on tabs area
    const tabsScrollRef = useRef(null);
    const isScrollDraggingRef = useRef(false);
    const scrollStartXRef = useRef(0);
    const scrollLeftRef = useRef(0);

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
            toast.success(`Loaded history sale ${order.orderNumber || ''}`, {
                icon: '📋',
                duration: 2000,
            });
        } catch (error) {
            console.error('Failed to load full history sale:', error);
            toast.error('Failed to load sale details');
        }
    };

    // --- Tab Drag & Drop Handlers ---
    const handleTabDragStart = (e, tabId) => {
        setDraggedTabId(tabId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(tabId));
    };

    const handleTabDragOver = (e, tabId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTabId !== tabId) {
            setDragOverTabId(tabId);
        }
    };

    const handleTabDrop = (e, targetTabId) => {
        e.preventDefault();
        if (draggedTabId && draggedTabId !== targetTabId) {
            const fromIdx = saleTabs.findIndex((t) => t.id === draggedTabId);
            const toIdx = saleTabs.findIndex((t) => t.id === targetTabId);
            if (fromIdx !== -1 && toIdx !== -1 && typeof reorderTabs === 'function') {
                reorderTabs(fromIdx, toIdx);
            }
        }
        setDraggedTabId(null);
        setDragOverTabId(null);
    };

    const handleTabDragEnd = () => {
        setDraggedTabId(null);
        setDragOverTabId(null);
    };

    // --- Whole Bar Reposition Handlers ---
    const handleBarPointerDown = (e) => {
        if (e.button !== 0) return;
        isDraggingBarRef.current = true;
        barDragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: barPosition.x,
            initialY: barPosition.y,
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const handleBarPointerMove = (e) => {
        if (!isDraggingBarRef.current) return;
        const dx = e.clientX - barDragStartRef.current.startX;
        const dy = e.clientY - barDragStartRef.current.startY;
        const maxX = Math.max(120, (window.innerWidth - 320) / 2);
        const newX = Math.max(-maxX, Math.min(maxX, barDragStartRef.current.initialX + dx));
        const newY = Math.max(-25, Math.min(25, barDragStartRef.current.initialY + dy));
        setBarPosition({ x: Math.round(newX), y: Math.round(newY) });
        if (showHistory) updateDropdownPosition();
    };

    const handleBarPointerUp = (e) => {
        if (!isDraggingBarRef.current) return;
        isDraggingBarRef.current = false;
        try {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
        } catch {}
        localStorage.setItem('pos_tabbar_pos', JSON.stringify(barPosition));
        if (showHistory) updateDropdownPosition();
    };

    const handleResetBarPosition = () => {
        setBarPosition({ x: 0, y: 0 });
        localStorage.removeItem('pos_tabbar_pos');
        toast.success('Tab bar reset to center', { duration: 1500, icon: '🎯' });
        if (showHistory) updateDropdownPosition();
    };

    // --- Drag-to-Scroll Tabs Area ---
    const handleTabsMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[draggable="true"]')) return;
        isScrollDraggingRef.current = true;
        scrollStartXRef.current = e.pageX - (tabsScrollRef.current?.offsetLeft || 0);
        scrollLeftRef.current = tabsScrollRef.current?.scrollLeft || 0;
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e) => {
            if (!isScrollDraggingRef.current || !tabsScrollRef.current || draggedTabId) return;
            e.preventDefault();
            const x = e.pageX - (tabsScrollRef.current.offsetLeft || 0);
            const walk = (x - scrollStartXRef.current) * 1.5;
            tabsScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
        };

        const handleGlobalMouseUp = () => {
            isScrollDraggingRef.current = false;
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [draggedTabId]);

    const { isTakeaway: isTakeawayActive } = useTakeaway();

    // Table orders are handled on the table management screen
    if (tableId) return null;

    const normalizedView = String(view || '').toLowerCase();
    const isDirectOrSale = takeawayOrder?.orderType === 'DIRECT_SALE' || takeawayOrder?.orderType === 'WHOLESALE' || takeawayOrder?.orderType === 'TAKEAWAY';
    const showTabs = isTakeawayActive || isDirectOrSale || [
        'takeaway',
        'wholesale',
        'direct-sale',
        'direct_sale',
        'order',
        'pos'
    ].includes(normalizedView);

    if (!showTabs) return null;

    const saleTabs = tabs.filter((t) => !t.tableId && !t.isTableOrder);

    const getTabOrder = (tab) =>
        tab.id === activeTabId ? takeawayOrder : (tab.takeawayOrder || {});

    const formatTabOrderLabel = (tab, order) => {
        if (order.orderNumber) return order.orderNumber;
        if (order.orderId) return `#${String(order.orderId).slice(-6)}`;
        return tab.name || `Tab ${tab.id}`;
    };

    const getTabsWithCartItems = () =>
        saleTabs
            .map((tab) => {
                const order = getTabOrder(tab);
                const itemCount = (order.items || []).length;
                if (itemCount === 0) return null;
                return {
                    tabId: tab.id,
                    label: formatTabOrderLabel(tab, order),
                    itemCount,
                };
            })
            .filter(Boolean);

    const confirmClearAll = () => {
        const tabsWithItems = getTabsWithCartItems();

        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[300px] max-w-[420px]">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-500/20 rounded-xl shrink-0">
                        <Trash2 size={20} className="text-red-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-slate-100 uppercase tracking-tight">Clear all tabs?</p>
                        {tabsWithItems.length > 0 ? (
                            <p className="text-[10px] font-bold text-slate-400 mt-1 leading-relaxed">
                                If you clear tabs, these orders with items in cart will also be removed:
                            </p>
                        ) : (
                            <p className="text-[10px] font-bold text-slate-400 mt-1">
                                This will reset all current orders.
                            </p>
                        )}
                    </div>
                </div>

                {tabsWithItems.length > 0 && (
                    <ul className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10 max-h-40 overflow-y-auto">
                        {tabsWithItems.map((entry) => (
                            <li
                                key={entry.tabId}
                                className="flex items-center justify-between gap-3 px-3 py-2.5 text-[11px] font-bold text-slate-200"
                            >
                                <span className="font-black text-slate-100 truncate">{entry.label}</span>
                                <span className="shrink-0 text-slate-400">
                                    {entry.itemCount} item{entry.itemCount !== 1 ? 's' : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={() => toast.dismiss(t.id)}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            clearAllTabs();
                            toast.dismiss(t.id);
                        }}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95 cursor-pointer"
                    >
                        Clear All
                    </button>
                </div>
            </div>
        ), {
            duration: Infinity,
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

    const confirmCloseTab = (tabId, e) => {
        if (e) e.stopPropagation();

        const targetTab = saleTabs.find((t) => t.id === tabId);
        if (!targetTab) return;

        const order = getTabOrder(targetTab);
        const itemCount = (order.items || []).length;

        if (itemCount === 0) {
            closeTab(tabId, e);
            return;
        }

        const label = formatTabOrderLabel(targetTab, order);

        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px] max-w-[360px]">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-500/20 rounded-xl shrink-0">
                        <Trash2 size={20} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-100 uppercase tracking-tight">Close this tab?</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 leading-relaxed">
                            <span className="text-slate-200 font-black">{label}</span> has {itemCount} item{itemCount !== 1 ? 's' : ''} in cart. Closing will remove this order.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={() => toast.dismiss(t.id)}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            closeTab(tabId, e);
                            toast.dismiss(t.id);
                        }}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95 cursor-pointer"
                    >
                        Close Tab
                    </button>
                </div>
            </div>
        ), {
            duration: Infinity,
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
                            type="button"
                            onClick={() => handleSelectHistorySale(sale)}
                            className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-indigo-50/60 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 ${theme.borderLight} cursor-pointer`}
                        >
                            <div className="min-w-0 flex-1">
                                <p className={`text-xs font-black ${theme.textHeading} truncate`}>
                                    {sale.orderNumber || `#${String(sale._id || sale.id).slice(-6)}`}
                                </p>
                                <p className={`text-[10px] font-bold ${theme.textMuted} truncate mt-0.5`}>
                                    {customer}
                                </p>
                                {createdAt && (
                                    <p className={`text-[9px] font-semibold ${theme.textMuted} mt-0.5`}>
                                        {createdAt}
                                    </p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                    {total}
                                </p>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                    {sale.orderStatus || 'COMPLETED'}
                                </span>
                            </div>
                        </button>
                    );
                })
            )}
        </div>,
        document.body
    ) : null;

    return (
        <div className="flex items-center justify-start md:justify-center lg:justify-center xl:justify-center w-full px-4 pt-2 pb-2 lg:pt-0 lg:pb-0 xl:pt-0 xl:pb-0">
            <div
                style={{
                    transform: `translate3d(${barPosition.x}px, ${barPosition.y}px, 0)`,
                    transition: isDraggingBarRef.current ? 'none' : 'transform 0.15s ease-out',
                }}
                className="flex items-center gap-1.5 p-1.5 bg-[#7a818e] rounded-full shadow-lg max-w-full lg:pointer-events-auto xl:pointer-events-auto overflow-hidden select-none"
            >
                {/* Grip Handle to drag and reposition the entire bar */}
                <div
                    onPointerDown={handleBarPointerDown}
                    onPointerMove={handleBarPointerMove}
                    onPointerUp={handleBarPointerUp}
                    onPointerCancel={handleBarPointerUp}
                    onDoubleClick={handleResetBarPosition}
                    className="h-8 w-5 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-0.5 touch-none"
                    title="Drag to reposition tab bar (Double-click to reset to center)"
                >
                    <GripVertical size={14} strokeWidth={2.5} />
                </div>

                {/* Scrollable & Reorderable tabs area */}
                <div
                    ref={tabsScrollRef}
                    onMouseDown={handleTabsMouseDown}
                    className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0"
                >
                    {saleTabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const activeOrder = isActive ? takeawayOrder : (tab.takeawayOrder || {});
                        const itemCount = (activeOrder.items || []).length || 0;
                        const orderLabel = activeOrder.orderNumber 
                            ? activeOrder.orderNumber
                            : (activeOrder.orderId ? `#${String(activeOrder.orderId).slice(-6)}` : null);
                        const fallbackName = (isActive ? takeawayCustName : tab.takeawayCustName) || tab.name;
                        const tabLabel = orderLabel || fallbackName || "";

                        const ordMatch = typeof tabLabel === 'string' && tabLabel.match(/^(ORD-?|#)(.+)$/i);
                        const labelPrefix = ordMatch ? ordMatch[1] : null;
                        const labelNum = ordMatch ? ordMatch[2] : tabLabel;
                        const isSingleTab = saleTabs.length === 1;

                        const isBeingDragged = draggedTabId === tab.id;
                        const isDragTarget = dragOverTabId === tab.id && draggedTabId !== tab.id;

                        return (
                            <div
                                key={tab.id}
                                draggable={saleTabs.length > 1}
                                onDragStart={(e) => handleTabDragStart(e, tab.id)}
                                onDragOver={(e) => handleTabDragOver(e, tab.id)}
                                onDrop={(e) => handleTabDrop(e, tab.id)}
                                onDragEnd={handleTabDragEnd}
                                onClick={() => switchTab(tab.id)}
                                title={saleTabs.length > 1 ? `${tabLabel} (Drag to reorder)` : tabLabel}
                                className={`group relative shrink-0 ${isSingleTab ? 'max-w-none' : 'max-w-[140px] md:max-w-[180px]'} h-8 md:h-9 px-2.5 md:px-3.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-all duration-200 transform rounded-full border border-transparent
                                    ${isBeingDragged ? 'opacity-40 scale-95 border-dashed border-white/60' : ''}
                                    ${isDragTarget ? 'ring-2 ring-amber-300 bg-white/20 scale-105' : ''}
                                    ${isActive
                                        ? 'bg-[#5b52f6] text-white shadow-md z-10'
                                        : 'text-slate-200 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1 pointer-events-none">
                                    {itemCount > 0 ? (
                                        <div className={`shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-black
                                            ${isActive ? 'bg-white text-[#5b52f6]' : 'bg-slate-400/50 text-white'}`}>
                                            {itemCount}
                                        </div>
                                    ) : (
                                        <div className={`shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                                            <User size={11} className={isActive ? 'text-white' : 'text-slate-200'} />
                                        </div>
                                    )}
                                    <span 
                                        className={`inline-block font-black tracking-wide uppercase ${isSingleTab ? 'whitespace-nowrap' : 'truncate [direction:rtl] [text-align:left]'}`}
                                    >
                                        {labelPrefix ? (
                                            <>
                                                <span className="opacity-75 font-semibold text-[9px] md:text-[10px] uppercase">{labelPrefix}</span>
                                                <span className={`font-black text-[11px] md:text-[12px] tracking-widest ${isActive ? 'text-amber-300' : 'text-white'}`}>{labelNum}</span>
                                            </>
                                        ) : (
                                            <span className="text-[10px] md:text-[11px] font-black">{tabLabel}</span>
                                        )}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => confirmCloseTab(tab.id, e)}
                                    className={`p-0.5 rounded-full transition-all shrink-0 cursor-pointer
                                        ${isActive
                                            ? 'hover:bg-white/20 text-white/70 hover:text-white'
                                            : 'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                                        }`}
                                >
                                    <X size={11} strokeWidth={3} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Fixed action buttons — never scroll */}
                <div className="flex items-center gap-1.5 px-2 border-l border-white/10 ml-1 shrink-0">
                    <button
                        type="button"
                        onClick={handleToggleSound}
                        className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl transition-all flex items-center justify-center ${
                            soundOn ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/20 text-slate-300 hover:bg-white/30'
                        }`}
                        title={soundOn ? "Voice Announcements Enabled (Click to Mute)" : "Voice Announcements Muted (Click to Enable)"}
                    >
                        {soundOn ? <Volume2 size={18} strokeWidth={2.5} /> : <VolumeX size={18} strokeWidth={2.5} />}
                    </button>

                    <button
                        ref={historyButtonRef}
                        type="button"
                        onClick={() => setShowHistory((prev) => !prev)}
                        className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                            showHistory ? 'bg-white text-[#5b52f6]' : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title="Recent Sales"
                    >
                        <History size={18} strokeWidth={2.5} />
                    </button>

                    <button
                        type="button"
                        onClick={addTab}
                        className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all flex items-center justify-center cursor-pointer"
                        title="New Sale Tab"
                    >
                        <Plus size={18} strokeWidth={4} />
                    </button>

                    {saleTabs.length > 1 && (
                        <button
                            type="button"
                            onClick={confirmClearAll}
                            className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl bg-[#c17878]/30 text-[#e68c8c] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
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
