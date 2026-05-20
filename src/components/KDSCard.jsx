import { Clock, Check, Play, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const KDSCard = ({ order, type = 'table', isAdditional = false, onUpdateStatus, onStartPrep, currentTime, canManage, canServe }) => {
    const { theme, themeName } = useTheme();
    const status = order.status || 'PENDING';
    const referenceTime = status === 'PREPARING' ? order.startedAt : order.createdAt;
    const timeAgo = referenceTime ? Math.floor((currentTime - new Date(referenceTime).getTime()) / 60000) : 0;

    // Color based on status and waiting time
    const getStatusColor = () => {
        if (status === 'READY') return 'border-green-400';
        if (status === 'PREPARING') return 'border-orange-400';
        return 'border-indigo-400';
    };

    const getTimeColor = (mins) => {
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

    return (
        <div className={`${theme.surfaceBg} rounded-3xl shadow-xl overflow-hidden flex flex-col border-l-8 ${getStatusColor()} transition-all hover:shadow-2xl border-t border-r border-b ${theme.borderLight}`}>
            {/* Card Header */}
            <div className={`p-4 ${theme.pageBg} border-b ${theme.borderLight} flex justify-between items-center`}>
                <div className="min-w-0 flex-1">
                    <h3 className={`text-xl font-black ${theme.textHeading} truncate flex items-center`}>
                        <span>{type === 'table' ? (order.tableId?.tableNumber ? `Table ${order.tableId.tableNumber}` : 'Table') : order.platform || 'Online'}</span>
                        {isAdditional && (
                            <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-200 shadow-sm align-middle">Add-on</span>
                        )}
                    </h3>
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-tighter">
                            Order: {orderNumber}
                        </span>
                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>
                            KOT ID: {displayId}
                        </span>
                    </div>
                </div>
                <div className={`px-3 py-2 rounded-2xl text-xs font-black flex flex-col items-center justify-center min-w-[70px] ${getTimeColor(timeAgo)}`}>
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo}m
                    </div>
                    {status === 'PREPARING' && order.estimatedTime > 0 && (
                        <div className="text-[8px] opacity-70 mt-0.5">
                            Est: {order.estimatedTime}m
                        </div>
                    )}
                </div>
            </div>

            {/* Items List */}
            <div className="p-4 flex-1 overflow-y-auto max-h-60 space-y-3">
                {order.items?.map((item, idx) => (
                    <div key={idx} className={`flex justify-between items-start border-b border-dashed ${theme.borderLight} pb-2 last:border-0`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 ${theme.inputBg} rounded-lg flex items-center justify-center text-xs font-black ${theme.inputText}`}>
                                    {item.quantity}
                                </span>
                                <span className={`font-bold ${item.status === 'READY' ? 'text-green-600 line-through opacity-50' : theme.textPrimary}`}>
                                    {item.itemId?.name || item.itemName || "Item"}
                                </span>
                            </div>
                            {item.notes && (
                                <div className={`text-[10px] ${themeName === 'dark' ? 'text-orange-400 bg-orange-900/30' : 'text-orange-500 bg-orange-50'} italic mt-1 ml-9 px-2 py-0.5 rounded-md inline-block font-medium`}>
                                    {item.notes}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            {status !== 'SERVED' && (
                <div className={`p-4 ${theme.pageBg} border-t ${theme.borderLight} flex gap-2`}>
                    {status === 'PENDING' && canManage && (
                        <button
                            onClick={handleStart}
                            className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Play size={20} fill="currentColor" /> Start Prep
                        </button>
                    )}

                    {status === 'PREPARING' && canManage && (
                        <button
                            onClick={() => onUpdateStatus(order._id, 'READY')}
                            className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-100 hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={20} /> Mark Ready
                        </button>
                    )}

                    {status === 'READY' && canServe && (
                        <button
                            onClick={() => onUpdateStatus(order._id, 'SERVED')}
                            className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={20} /> Serve Order
                        </button>
                    )}

                    {/* Visual Status Indicators for unauthorized users or transition states */}
                    {status === 'READY' && !canServe && (
                        <div className="flex-1 py-4 bg-green-50 text-green-700 font-black rounded-2xl flex items-center justify-center gap-2 border border-green-100">
                            <Check size={20} /> KOT Ready
                        </div>
                    )}
                </div>
            )}

            {status === 'SERVED' && (
                <div className={`p-4 ${themeName === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} flex items-center justify-center gap-2`}>
                    <Check className="text-blue-500" size={16} />
                    <span className={`text-xs font-black ${themeName === 'dark' ? 'text-blue-400' : 'text-blue-700'} uppercase tracking-widest`}>Served</span>
                </div>
            )}
        </div>
    );
};

export default KDSCard;
