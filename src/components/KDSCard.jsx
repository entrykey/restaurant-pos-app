import React from 'react';
import { Clock, Check } from 'lucide-react';

const KDSCard = ({ order, type = 'table', onMarkReady, currentTime, formatCurrency }) => {
    const kotSentAt = type === 'table' ? order.order?.kotSentAt : order.kotSentAt;
    const timeAgo = Math.floor((currentTime - kotSentAt) / 60000);

    // Color based on waiting time
    const getTimeColor = (mins) => {
        if (mins >= 30) return 'text-red-500 bg-red-50';
        if (mins >= 15) return 'text-orange-500 bg-orange-50';
        return 'text-green-600 bg-green-50';
    };

    const items = type === 'table' ? order.order?.items : order.items;
    const waiter = type === 'table' ? 'John' : 'Online Platform'; // Mock waiter for table

    return (
        <div className={`bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col border-l-8 ${type === 'online' ? 'border-indigo-400' : 'border-orange-400'} transition-all hover:shadow-2xl`}>
            {/* Card Header */}
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-gray-800">
                        {type === 'table' ? order.name : `${order.platform}: ${order.customer}`}
                    </h3>
                    <span className="text-xs font-bold text-gray-400">
                        {type === 'table' ? `Waiter: ${waiter}` : `Order ID: ${order.id}`}
                    </span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${getTimeColor(timeAgo)}`}>
                    <Clock size={12} />
                    {timeAgo} mins
                </div>
            </div>

            {/* Items List */}
            <div className="p-4 flex-1 overflow-y-auto max-h-60 space-y-3">
                {items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-dashed border-gray-100 pb-2 last:border-0">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center text-xs font-black text-gray-500">
                                    {item.quantity}
                                </span>
                                <span className="font-bold text-gray-800">{item.name}</span>
                            </div>
                            {item.selectedVariant && (
                                <div className="text-[10px] text-indigo-500 font-black uppercase ml-8 mt-0.5">
                                    {item.selectedVariant.name}
                                </div>
                            )}
                            {item.selectedExtras?.map((ex, i) => (
                                <div key={i} className="text-[10px] text-gray-400 ml-8">
                                    + {ex.name}
                                </div>
                            ))}
                            {item.suggestion && (
                                <div className="text-[10px] text-orange-500 italic mt-1 ml-8 bg-orange-50 px-2 py-0.5 rounded-md inline-block">
                                    Note: {item.suggestion}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-50 border-t">
                <button
                    onClick={() => onMarkReady(order.id, type)}
                    className="w-full py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-100 hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Check size={20} /> Mark Ready
                </button>
            </div>
        </div>
    );
};

export default KDSCard;
