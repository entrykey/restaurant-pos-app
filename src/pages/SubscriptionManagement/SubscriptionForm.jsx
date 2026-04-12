import React, { useState, useEffect } from 'react';
import { subscriptionService } from '../../services/api/subscriptions';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, Save, CreditCard, Calendar, FileText } from 'lucide-react';

const SubscriptionForm = ({ subscriptionToEdit, onBack }) => {
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    // We only allow editing a few specific top-level fields like status, next_billing_date, end_date
    const [formData, setFormData] = useState({
        status: 'pending_payment',
        end_date: '',
        next_billing_date: '',
        amount: 0,
        final_amount: 0,
        payment_status: 'pending'
    });

    useEffect(() => {
        if (subscriptionToEdit) {
            setFormData({
                status: subscriptionToEdit.status || 'pending_payment',
                end_date: subscriptionToEdit.end_date ? new Date(subscriptionToEdit.end_date).toISOString().split('T')[0] : '',
                next_billing_date: subscriptionToEdit.next_billing_date ? new Date(subscriptionToEdit.next_billing_date).toISOString().split('T')[0] : '',
                amount: subscriptionToEdit.amount || 0,
                final_amount: subscriptionToEdit.final_amount || 0,
                payment_status: subscriptionToEdit.payment_status || 'pending'
            });
        }
    }, [subscriptionToEdit]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (subscriptionToEdit) {
                await subscriptionService.updateSubscription(subscriptionToEdit._id, formData);
                onBack();
            }
        } catch (error) {
            console.error("Error saving subscription:", error);
            alert("Failed to save subscription details");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="w-full mx-auto space-y-8 max-w-4xl">

                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className={`p-2 ${theme.surfaceBg} border ${theme.borderLight} rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                    >
                        <ArrowLeft className={`w-5 h-5 ${theme.textPrimary}`} />
                    </button>
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                        <button onClick={onBack} className={`${theme.textSecondary} hover:${theme.textPrimary} transition-colors`}>
                            Subscriptions
                        </button>
                        <span className={theme.textMuted}>/</span>
                        <span className={theme.textPrimary}>
                            Edit Subscription
                        </span>
                    </div>
                </div>

                {subscriptionToEdit && (
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <FileText size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Subscription Context</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className={`text-[10px] uppercase font-black tracking-widest ${theme.textSecondary}`}>Shop Name</p>
                                <p className={`font-bold mt-1 ${theme.textPrimary}`}>{subscriptionToEdit.shop_id?.name || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className={`text-[10px] uppercase font-black tracking-widest ${theme.textSecondary}`}>Plan Name</p>
                                <p className={`font-bold mt-1 ${theme.textPrimary}`}>{subscriptionToEdit.plan_id?.name || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className={`text-[10px] uppercase font-black tracking-widest ${theme.textSecondary}`}>Billing Cycle</p>
                                <p className={`font-bold mt-1 capitalize ${theme.textPrimary}`}>{subscriptionToEdit.billing_cycle}</p>
                            </div>
                            <div>
                                <p className={`text-[10px] uppercase font-black tracking-widest ${theme.textSecondary}`}>Transaction ID</p>
                                <p className={`font-bold mt-1 ${theme.textPrimary}`}>{subscriptionToEdit.transaction_id || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <Calendar size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Dates & Status</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Subscription Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                >
                                    <option value="pending_payment">Pending Payment</option>
                                    <option value="active">Active</option>
                                    <option value="trial">Trial</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Payment Status</label>
                                <select
                                    name="payment_status"
                                    value={formData.payment_status}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>End Date</label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Next Billing Date</label>
                                <input
                                    type="date"
                                    name="next_billing_date"
                                    value={formData.next_billing_date}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`${theme.surfaceBg} p-8 rounded-[32px] border ${theme.borderLight} shadow-sm space-y-6`}>
                        <div className={`flex items-center gap-3 border-b ${theme.borderLight} pb-4`}>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                <CreditCard size={20} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Billing Totals</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Base Amount</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Final Charged Amount</label>
                                <input
                                    type="number"
                                    name="final_amount"
                                    value={formData.final_amount}
                                    onChange={handleChange}
                                    className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-8 pb-12">
                        <button
                            type="button"
                            onClick={onBack}
                            className={`px-8 py-4 ${theme.surfaceBg} border ${theme.borderLight} ${theme.textPrimary} rounded-2xl font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-colors uppercase tracking-widest text-xs`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLoading ? 'Saving...' : 'Save Updates'}
                            {!isLoading && <Save size={16} strokeWidth={3} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubscriptionForm;
