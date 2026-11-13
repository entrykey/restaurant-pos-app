import { Clock, Check, Play, ShoppingBag, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const KDSCard = ({
    order,
    type = 'table',
    typeLabel,
    categoryName,
    isAdditional = false,
    onUpdateStatus,
    onUpdateItemStatus,
    onStartPrep,
    currentTime,
    canManage,
    canServe
}) => {
    const { theme, themeName } = useTheme();

    const items = order.items || [];
    const totalItemsCount = items.length;
    const readyItemsCount = items.filter(it => it.status === 'READY').length;
    const servedItemsCount = items.filter(it => it.status === 'SERVED').length;
    const preparedItemsCount = readyItemsCount + servedItemsCount;
    const isAllPrepared = totalItemsCount > 0 && items.every(it => it.status === 'READY' || it.status === 'SERVED');
    const isAllServed = (order.status === 'SERVED' || order.status === 'COMPLETED') ||
        (totalItemsCount > 0 && items.every(it => it.status === 'SERVED'));

    // Effective status
    const status = isAllServed ? 'SERVED' : (isAllPrepared ? 'READY' : (order.status || 'PENDING'));
    const isDirectServed = order.status === 'COMPLETED';
    const isServed = status === 'SERVED' || isDirectServed;

    // Reference time: when prep started or order was created
    const referenceTime = order.startedAt || order.createdAt;

    // Timer stops ONLY when ALL items are prepared or served!
    // As long as ANY item is still preparing or pending, the timer continues running in real time.
    const endTime = (isAllPrepared || isServed)
        ? new Date(order.readyAt || order.servedAt || order.updatedAt || order.createdAt).getTime()
        : currentTime;

    const timeAgo = referenceTime ? Math.max(0, Math.floor((endTime - new Date(referenceTime).getTime()) / 60000)) : 0;

    // Color based on status and waiting time
    const getStatusColor = () => {
        if (isDirectServed) return 'border-emerald-500';
        if (isServed) return 'border-blue-400';
        if (isAllPrepared || status === 'READY') return 'border-green-400';
        if (status === 'PREPARING') return 'border-orange-400';
        return 'border-indigo-400';
    };

    const getTimeColor = (mins) => {
        if (isServed) {
            return `text-emerald-600 ${themeName === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-50'}`;
        }
        if (isAllPrepared || status === 'READY') {
            return `text-emerald-600 ${themeName === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-50'}`;
        }
        if (status === 'PREPARING') {
            if (order.estimatedTime && mins >= order.estimatedTime) return 'text-red-500 bg-red-500/10 animate-pulse';
            return 'text-orange-600 bg-orange-500/10';
        }
        if (mins >= 30) return 'text-red-500 bg-red-500/10';
        if (mins >= 15) return 'text-orange-500 bg-orange-500/10';
        return `text-indigo-600 ${themeName === 'dark' ? 'bg-indigo-900/40' : 'bg-indigo-50'}`;
    };

    const handleStart = () => {
        onStartPrep(order._id);
    };

    const orderNumber = order.orderId?.orderNumber || "No Order #";
    const displayId = order.kotNumber || order._id;

    // Staff names
    const placedBy = order.orderId?.createdBy?.name || order.createdByName;
    const servedBy = order.servedBy?.name || order.orderId?.servedBy?.name;
    const preparedBy = order.preparedBy?.name;

    return (
        <div className={`${theme.surfaceBg} rounded-3xl shadow-xl overflow-hidden flex flex-col border-l-8 ${getStatusColor()} transition-all hover:shadow-2xl border-t border-r border-b ${theme.borderLight}`}>
            {/* Card Header */}
            <div className={`p-4 ${theme.pageBg} border-b ${theme.borderLight} flex justify-between items-center`}>
                <div className="min-w-0 flex-1">
                    <h3 className={`text-xl font-black ${theme.textHeading} flex items-center flex-wrap gap-2 min-w-0`}>
                        <span className="truncate">{typeLabel || (type === 'table' ? (order.tableId?.tableNumber ? `Table ${order.tableId.tableNumber}` : 'Table') : order.platform || 'Online')}</span>
                        {categoryName && (
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border shrink-0 ${
                                themeName === 'dark' 
                                    ? 'bg-indigo-900/40 border-indigo-800/50 text-indigo-300' 
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            }`}>
                                {categoryName}
                            </span>
                        )}
                        {(isAdditional || order.isAddon) && (
                            <span className="shrink-0 text-[10px] bg-red-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-red-500 shadow-md flex items-center gap-1">
                                🔥 ADDON KOT {order.addonIndex ? `#${order.addonIndex}` : ''}
                            </span>
                        )}
                        {totalItemsCount > 1 && !isServed && (
                            <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                isAllPrepared
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            }`}>
                                {preparedItemsCount}/{totalItemsCount} Ready
                            </span>
                        )}
                        {isDirectServed && (
                            <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center gap-1.5 font-black">
                                <ShoppingBag size={12} className="shrink-0" /> Direct Served
                            </span>
                        )}
                    </h3>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-tighter">
                            Order: {orderNumber}
                        </span>
                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>
                            KOT ID: {displayId}
                        </span>
                        {/* Staff info */}
                        {placedBy && (
                            <span className={`text-[10px] font-bold ${theme.textMuted} flex items-center gap-1`}>
                                <User size={9} /> Placed by: {placedBy}
                            </span>
                        )}
                        {preparedBy && (
                            <span className={`text-[10px] font-bold ${theme.textMuted}`}>
                                Prep: {preparedBy}
                            </span>
                        )}
                        {servedBy && (
                            <span className={`text-[10px] font-bold ${theme.textMuted}`}>
                                Served by: {servedBy}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`px-3 py-2 rounded-2xl text-xs font-black flex flex-col items-center justify-center min-w-[75px] ${getTimeColor(timeAgo)}`}>
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo}m
                    </div>
                    {/* The estimated time runs for total until all items are prepared */}
                    {(!isAllPrepared && !isServed && order.estimatedTime > 0) && (
                        <div className="text-[8px] opacity-80 mt-0.5 tracking-tight font-black">
                            {timeAgo >= order.estimatedTime ? (
                                <span className="text-red-500 font-black">+{timeAgo - order.estimatedTime}m over</span>
                            ) : (
                                <span>Est: {order.estimatedTime}m</span>
                            )}
                        </div>
                    )}
                    {isAllPrepared && !isServed && (
                        <div className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 mt-0.5">
                            All Ready
                        </div>
                    )}
                </div>
            </div>

            {/* Items List with per-item Ready & Serve Actions */}
            <div className="p-3 md:p-4 flex-1 overflow-y-auto max-h-64 space-y-2">
                {items.map((item, idx) => (
                    <div
                        key={item._id || idx}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-2xl transition-all border ${
                            item.status === 'SERVED'
                                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-900/40 opacity-80'
                                : item.status === 'READY'
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 shadow-sm'
                                : `${theme.borderLight} bg-transparent hover:${theme.pageBg}`
                        }`}
                    >
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-black ${
                                    item.status === 'SERVED'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                        : item.status === 'READY'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : `${theme.inputBg} ${theme.inputText}`
                                }`}>
                                    {item.quantity}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <span className={`font-black text-sm block truncate ${
                                        item.status === 'SERVED'
                                            ? 'text-blue-700 dark:text-blue-400 line-through opacity-70'
                                            : item.status === 'READY'
                                            ? 'text-emerald-700 dark:text-emerald-400'
                                            : theme.textPrimary
                                    }`}>
                                        {item.itemId?.name || item.itemName || "Item"}
                                        {item.variant && (
                                            <span className="ml-1 text-[11px] font-bold opacity-75">
                                                ({item.variant})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            {item.notes && (
                                <div className={`text-[10px] italic mt-1 ml-9 px-2 py-0.5 rounded-md inline-block font-medium ${
                                    themeName === 'dark' ? 'text-orange-400 bg-orange-900/30' : 'text-orange-500 bg-orange-50'
                                }`}>
                                    {item.notes}
                                </div>
                            )}
                        </div>

                        {/* Per-Product Actions: Mark Ready & Serve */}
                        <div className="shrink-0 flex items-center gap-1.5">
                            {/* If already served */}
                            {item.status === 'SERVED' && (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                    <Check size={12} strokeWidth={3} /> Served
                                </span>
                            )}

                            {/* If Ready: Show Ready tag and individual Serve button */}
                            {item.status === 'READY' && (
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                        <Check size={12} strokeWidth={3} /> Ready
                                    </span>
                                    {canServe && typeof onUpdateItemStatus === 'function' && (
                                        <button
                                            type="button"
                                            onClick={() => onUpdateItemStatus(order._id, item._id, 'SERVED')}
                                            title="Serve this item"
                                            className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            Serve
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* If Pending or Preparing: Show Ready button to mark this product ready */}
                            {(item.status === 'PREPARING' || item.status === 'PENDING' || !item.status) && (
                                (status === 'PREPARING' || status === 'PENDING') && canManage && typeof onUpdateItemStatus === 'function' ? (
                                    <button
                                        type="button"
                                        onClick={() => onUpdateItemStatus(order._id, item._id, 'READY')}
                                        title="Mark this item Ready"
                                        className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                        <Check size={12} strokeWidth={3} /> Ready
                                    </button>
                                ) : status === 'PENDING' ? (
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} px-2 py-0.5`}>
                                        Pending
                                    </span>
                                ) : null
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Overall Card Actions */}
            {!isDirectServed && !isAllServed && (
                <div className={`p-4 ${theme.pageBg} border-t ${theme.borderLight} flex flex-col gap-2`}>
                    {/* If PENDING: Start Prep Button */}
                    {status === 'PENDING' && canManage && (
                        <button
                            type="button"
                            onClick={handleStart}
                            className="w-full py-3.5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Play size={18} fill="currentColor" /> Start Prep
                        </button>
                    )}

                    {/* If PREPARING: 
                        1. Mark All Remaining items ready (for full-batch prep)
                        2. Or Serve all ready items if waitstaff is picking up all ready items */}
                    {status === 'PREPARING' && (
                        <div className="flex gap-2">
                            {canManage && !isAllPrepared && (
                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(order._id, 'READY')}
                                    title="Mark all items in this KOT as Ready"
                                    className="flex-1 py-3 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-md hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Check size={16} strokeWidth={3} /> Mark All Ready
                                </button>
                            )}
                            {canServe && readyItemsCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        items.filter(it => it.status === 'READY').forEach(it => {
                                            if (typeof onUpdateItemStatus === 'function') {
                                                onUpdateItemStatus(order._id, it._id, 'SERVED');
                                            }
                                        });
                                    }}
                                    title="Serve all items that are currently ready"
                                    className="flex-1 py-3 bg-orange-600 text-white text-xs font-black rounded-xl shadow-md hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Check size={16} strokeWidth={3} /> Serve Ready ({readyItemsCount})
                                </button>
                            )}
                        </div>
                    )}

                    {/* If ALL items are READY: Serve Order Button */}
                    {isAllPrepared && canServe && (
                        <button
                            type="button"
                            onClick={() => onUpdateStatus(order._id, 'SERVED')}
                            className="w-full py-3.5 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Check size={20} strokeWidth={3} /> Serve Order
                        </button>
                    )}

                    {isAllPrepared && !canServe && (
                        <div className="w-full py-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-black rounded-xl flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800">
                            <Check size={18} strokeWidth={3} /> All Items Ready
                        </div>
                    )}
                </div>
            )}

            {/* Served footer */}
            {isAllServed && !isDirectServed && (
                <div className={`p-4 ${themeName === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} flex items-center justify-center gap-2`}>
                    <Check className="text-blue-500" size={16} />
                    <span className={`text-xs font-black ${themeName === 'dark' ? 'text-blue-400' : 'text-blue-700'} uppercase tracking-widest`}>
                        All Items Served
                    </span>
                </div>
            )}

            {/* Direct served footer */}
            {isDirectServed && (
                <div className={`p-4 ${themeName === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-50'} flex items-center justify-center gap-2`}>
                    <ShoppingBag className="text-emerald-600" size={16} />
                    <span className={`text-xs font-black ${themeName === 'dark' ? 'text-emerald-400' : 'text-emerald-700'} uppercase tracking-widest`}>
                        Directly Served at Checkout
                    </span>
                </div>
            )}
        </div>
    );
};

export default KDSCard;
