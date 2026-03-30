import React from 'react';
import { Store, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const MultipleShopsModal = ({ isOpen, onClose, onSwitch, shops = [], currentShopName }) => {
    const { theme } = useTheme();
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`${theme.surfaceBg} w-full max-w-lg rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border ${theme.borderLight} animate-in zoom-in-95 duration-300`}>
                
                {/* Header */}
                <div className="p-8 pb-4 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
                        <Store size={32} className="text-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <h3 className={`text-2xl font-black ${theme.textHeading}`}>Your Shops</h3>
                        <p className={`text-sm font-bold ${theme.textMuted}`}>
                            Select a shop to manage. Some shops may require an active subscription.
                        </p>
                    </div>
                </div>

                {/* Shop List */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3 custom-scrollbar">
                    {shops.map((shop) => (
                        <div 
                            key={shop.id}
                            className={`group p-5 rounded-3xl border transition-all ${
                                shop.name === currentShopName 
                                ? `bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800`
                                : `${theme.inputBg} ${theme.borderLight} hover:border-blue-400 dark:hover:border-blue-500`
                            } flex items-center justify-between gap-4`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                    shop.isSubscribed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                }`}>
                                    {shop.isSubscribed ? (
                                        <CheckCircle size={24} className="text-green-500" />
                                    ) : (
                                        <AlertCircle size={24} className="text-red-500" />
                                    )}
                                </div>
                                <div>
                                    <h4 className={`font-black ${theme.textHeading}`}>{shop.name}</h4>
                                    <div className="flex items-center gap-2">
                                        {shop.name === currentShopName && (
                                            <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Current</span>
                                        )}
                                        <span className={`text-xs font-bold ${shop.isSubscribed ? 'text-green-500' : 'text-red-500'}`}>
                                            {shop.isSubscribed ? 'Active Subscription' : 'Subscription Required'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => onSwitch(shop.id, shop.isSubscribed)}
                                disabled={shop.name === currentShopName}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                                    shop.name === currentShopName
                                    ? 'opacity-30 cursor-not-allowed bg-gray-200 dark:bg-gray-800'
                                    : shop.isSubscribed
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                                }`}
                            >
                                {shop.isSubscribed ? 'Switch' : 'Subscribe'}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 space-y-3">
                    <button 
                        onClick={onClose}
                        className={`w-full py-4 ${theme.inputBg} ${theme.textPrimary} rounded-2xl font-black transition-all border ${theme.borderLight} hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center gap-2`}
                    >
                        Continue with {currentShopName}
                    </button>
                    <p className={`text-center text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>
                        Admin Panel Shop Selection
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MultipleShopsModal;
