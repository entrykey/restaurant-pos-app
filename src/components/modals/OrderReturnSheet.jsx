import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, RotateCcw } from 'lucide-react';
import OrderReturnForm from '../returns/OrderReturnForm';

const OrderReturnSheet = ({ isOpen, onClose, order, onSuccess }) => {
    const { theme } = useTheme();

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden ${theme.surfaceBg}`}>
                <div className={`p-6 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black ${theme.textHeading}`}>Process Return / Exchange</h2>
                            <p className={`text-sm font-medium ${theme.textMuted}`}>Order #{order.orderNumber} • {order.customerId?.name || 'Walk-in'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 ${theme.textMuted}`}>
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <OrderReturnForm
                        order={order}
                        onSuccess={() => {
                            onSuccess?.();
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default OrderReturnSheet;
