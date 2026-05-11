import React, { useState, useEffect } from "react";
import { 
    X, CreditCard, Coins, Smartphone, ReceiptText, CheckCircle2 
} from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { orderService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";

const PayInSheet = ({ isOpen, onClose, order, onSuccess }) => {
    const { theme } = useTheme();
    const { formatCurrency, organization } = useApp();
    const currency = organization?.defaultCurrency || 'USD';
    const [payments, setPayments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const balanceAmount = order ? (order.balanceAmount || (order.grandTotal - order.totalPaid)) : 0;
    const totalPaying = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const remaining = Math.max(0, balanceAmount - totalPaying);

    // Reset state when opening/closing or changing order
    useEffect(() => {
        if (isOpen && order) {
            setPayments([{ id: Date.now(), method: 'CASH', amount: String(balanceAmount) }]);
            setIsSubmitting(false);
        }
    }, [isOpen, order]);

    if (!isOpen || !order) return null;

    const addPaymentRow = () => {
        if (remaining <= 0) return;
        setPayments([...payments, { id: Date.now(), method: 'CASH', amount: String(remaining) }]);
    };

    const removeRow = (id) => {
        if (payments.length === 1) return;
        setPayments(payments.filter(p => p.id !== id));
    };

    const updateRow = (id, field, value) => {
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSubmit = async () => {
        if (totalPaying <= 0) return alert("Please enter a valid amount.");
        if (totalPaying > balanceAmount + 0.01) return alert(`Total exceeds balance of ${formatCurrency(balanceAmount)}`);

        setIsSubmitting(true);
        try {
            await orderService.addPayment(order.id || order._id, {
                payments: payments.map(p => ({
                    paymentMethod: p.method,
                    amount: Number(p.amount)
                })),
                paymentMethod: payments.length > 1 ? "COMBINED" : payments[0].method,
                amount: totalPaying,
                customerName: order.customerName || order.customerId?.name || "",
                customerPhone: order.customerPhone || order.customerId?.phone || ""
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to add payment:", error);
            alert(error.message || "Failed to process payment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const METHODS = [
        { id: "CASH", label: "Cash", icon: Coins, color: "text-emerald-500 bg-emerald-50" },
        { id: "CARD", label: "Card", icon: CreditCard, color: "text-blue-500 bg-blue-50" },
        { id: "UPI", label: "UPI", icon: Smartphone, color: "text-orange-500 bg-orange-50" },
        { id: "OTHER", label: "Other", icon: ReceiptText, color: "text-slate-500 bg-slate-50" },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className={`relative w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ${theme.surfaceBg}`}>
                {/* Header */}
                <div className={`px-8 py-6 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div>
                        <h2 className={`text-xl font-black ${theme.textHeading}`}>Add Payment</h2>
                        <p className={`text-sm font-bold opacity-70 ${theme.textHeading}`}>{order.orderNumber} · Balance: <span className="text-orange-600">{formatCurrency(balanceAmount)}</span></p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${theme.mode === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="space-y-4">
                        {payments.map((p, idx) => (
                            <div key={p.id} className={`p-5 rounded-2xl border-2 ${theme.borderLight} bg-gray-50/50 space-y-4 relative group`}>
                                {payments.length > 1 && (
                                    <button onClick={() => removeRow(p.id)} className="absolute -top-2 -right-2 p-1.5 bg-red-50 text-red-500 rounded-full border border-red-100 shadow-sm hover:bg-red-500 hover:text-white transition-all scale-0 group-hover:scale-100">
                                        <X size={12} />
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${theme.textMuted}`}>Method</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {METHODS.map(m => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => updateRow(p.id, 'method', m.id)}
                                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${p.method === m.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-white hover:border-gray-200'}`}
                                                >
                                                    <m.icon size={16} className={m.color.split(' ')[0]} />
                                                    <span className={`text-[10px] font-black ${p.method === m.id ? 'text-indigo-600' : 'text-gray-500'}`}>{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 flex flex-col justify-end">
                                        <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${theme.textMuted}`}>Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 flex items-center">
                                                <Coins size={16} />
                                            </span>
                                            <input
                                                type="number"
                                                value={p.amount}
                                                onChange={(e) => updateRow(p.id, 'amount', e.target.value)}
                                                className={`w-full p-4 pl-10 rounded-xl border-2 outline-none font-black text-xl transition-all ${theme.surfaceBg} ${theme.textHeading} ${p.method === 'CASH' ? 'focus:border-emerald-400 border-emerald-50' : 'focus:border-indigo-400 border-indigo-50/30'}`}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {remaining > 0 && (
                            <button
                                type="button"
                                onClick={addPaymentRow}
                                className="w-full py-5 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-black text-[11px] uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={16} className="rotate-45" /> Split Payment
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-8 border-t space-y-6 ${theme.borderLight} ${theme.pageBg}`}>
                    <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paying</p>
                            <p className="text-2xl font-black text-indigo-600">{formatCurrency(totalPaying)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remaining</p>
                            <p className={`text-2xl font-black ${remaining > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                                {remaining > 0 ? formatCurrency(remaining) : "FULLY PAID"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={totalPaying <= 0 || isSubmitting || totalPaying > balanceAmount + 0.01}
                        className="w-full py-5 rounded-2xl text-white font-black text-lg transition-all flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-100 uppercase tracking-widest"
                    >
                        {isSubmitting ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 size={24} />
                                Record Payments
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayInSheet;
