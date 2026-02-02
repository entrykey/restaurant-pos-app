import React from 'react';
import { User, Phone, MapPin, Clock, ExternalLink } from 'lucide-react';

const OnlineOrderCard = ({
    order,
    tab,
    onPreview,
    onAccept,
    onReject,
    onComplete,
    formatCurrency
}) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-orange-100 text-orange-600';
            case 'accepted':
            case 'preparing':
            case 'ready': return 'bg-green-100 text-green-600';
            case 'rejected': return 'bg-red-100 text-red-600';
            case 'completed': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-400';
        }
    };

    const getPlatformColor = (platform) => {
        switch (platform) {
            case 'Zomato': return 'bg-red-50 text-red-600 border-red-100';
            case 'Swiggy': return 'bg-orange-50 text-orange-600 border-orange-100';
            default: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        }
    };

    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${getPlatformColor(order.platform)}`}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black shadow-sm">
                        {order.platform?.[0] || 'O'}
                    </div>
                    <span className="font-black uppercase tracking-tight">{order.platform || 'Online'}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black opacity-50 uppercase">{order.id}</span>
                    <span className="text-xs font-bold">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Customer Info */}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <User size={16} className="text-gray-400" />
                        <span className="font-bold text-gray-800">{order.customer}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Phone size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">{order.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-500 truncate max-w-[200px]" title={order.address}>
                            {order.address}
                        </span>
                    </div>
                </div>

                {/* Order Items Summary */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">
                                <span className="font-black text-indigo-600 mr-2">{item.quantity}x</span>
                                {item.name}
                            </span>
                            {idx === 0 && order.items.length > 1 && (
                                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border font-bold text-gray-400">
                                    +{order.items.length - 1} more
                                </span>
                            )}
                        </div>
                    ))}
                    <div className="pt-2 border-t border-dashed flex justify-between items-center mt-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                        <span className="font-black text-lg text-indigo-900">{formatCurrency(order.total)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {tab === 'pending' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPreview(order)}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => onAccept(order)}
                            className="flex-2 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all"
                        >
                            Accept
                        </button>
                    </div>
                )}

                {tab === 'accepted' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm font-bold bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <span className="text-indigo-400 uppercase text-[10px] tracking-widest">KOT Status</span>
                            <span className={`uppercase flex items-center gap-2 ${order.kotStatus === 'ready' ? 'text-green-600' : 'text-orange-500'}`}>
                                <Clock size={12} className={order.kotStatus !== 'ready' ? 'animate-pulse' : ''} />
                                {order.kotStatus || 'Preparing'}
                            </span>
                        </div>
                        {order.kotStatus === 'ready' && (
                            <button
                                onClick={() => onComplete(order.id)}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                            >
                                Mark Out for Delivery
                            </button>
                        )}
                    </div>
                )}

                {tab === 'history' && (
                    <div className="flex items-center justify-center p-2 rounded-xl border border-dashed border-gray-200">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
                            {order.status}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnlineOrderCard;
