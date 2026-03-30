import React from 'react';
import { AlertTriangle, CreditCard, ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionNoticeModal = ({ isOpen, onClose, user, isStaff = false }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl border dark:border-gray-700 overflow-hidden group">
                {/* Background Accent */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-700"></div>
                
                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <AlertTriangle className="text-red-500" size={40} />
                    </div>
                    
                    <h2 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">
                        Subscription Required
                    </h2>
                    
                    <p className="text-gray-500 dark:text-gray-400 font-bold mb-8 leading-relaxed">
                        {isStaff 
                            ? "Your shop's subscription has ended. Some features are restricted. Please contact your manager or shop owner to renew." 
                            : "Your active plan has expired or no plan is active. To continue using all features, please subscribe to a plan."}
                    </p>

                    <div className="w-full space-y-3">
                        {!isStaff ? (
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/organization');
                                }}
                                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl"
                            >
                                <CreditCard size={20} />
                                View Plans & Subscribe
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                                <ShieldAlert size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 text-left uppercase tracking-tight">
                                    Feature Restricted: Please ask the owner to renew the subscription to unlock this feature.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                        >
                            {isStaff ? "Understood" : "I'll do it later"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionNoticeModal;
