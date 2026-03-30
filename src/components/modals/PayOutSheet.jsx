import React, { useState, useEffect } from "react";
import { 
    X, CreditCard, Banknote, Smartphone, Receipt, CheckCircle2 
} from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { PurchaseService } from "../../services/PurchaseService";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";

const PayOutSheet = ({ isOpen, onClose, purchase, onSuccess }) => {
    const { theme } = useTheme();
    const { formatCurrency, organization } = useApp();
    const currency = organization?.defaultCurrency || 'USD';
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [amount, setAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when opening/closing or changing purchase
    useEffect(() => {
        if (isOpen && purchase) {
            setAmount(String(purchase.balanceAmount));
            setSelectedMethod(null);
            setIsSubmitting(false);
        }
    }, [isOpen, purchase]);

    if (!isOpen || !purchase) return null;

    const balanceAmount = purchase.balanceAmount;

    const handleSubmit = async () => {
        if (!selectedMethod) return alert("Please select a payment method.");
        const payAmount = Number(amount);
        if (payAmount <= 0) return alert("Please enter a valid amount greater than 0.");
        if (payAmount > balanceAmount) return alert(`Amount cannot exceed the balance amount of ${formatCurrency(balanceAmount)}`);

        setIsSubmitting(true);
        try {
            await PurchaseService.addPayment({
                purchaseId: purchase.id,
                paymentMethod: selectedMethod.id.toUpperCase(),
                amount: payAmount,
                paymentDate: new Date()
            });

            onSuccess(); // Refresh the parent table
            onClose(); // Close the sheet
        } catch (error) {
            console.error("Failed to add payment:", error);
            alert(error.response?.data?.message || error.message || "Failed to process payment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const paymentMethods = [
        { id: "cash", label: "Cash", icon: Banknote, color: theme.mode === 'dark' ? "text-emerald-400 bg-emerald-900/30" : "text-emerald-600 bg-emerald-50" },
        { id: "bank_transfer", label: "Bank", icon: CreditCard, color: theme.mode === 'dark' ? "text-blue-400 bg-blue-900/30" : "text-blue-600 bg-blue-50" },
        { id: "upi", label: "UPI", icon: Smartphone, color: theme.mode === 'dark' ? "text-orange-400 bg-orange-900/30" : "text-orange-600 bg-orange-50" },
        { id: "card", label: "Card", icon: CreditCard, color: theme.mode === 'dark' ? "text-indigo-400 bg-indigo-900/30" : "text-indigo-600 bg-indigo-50" },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Sliding Sheet */}
            <div className={`relative w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ${theme.surfaceBg}`}>
                {/* Header */}
                <div className={`px-6 py-5 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div>
                        <h2 className={`text-xl font-black ${theme.textHeading}`}>Record Payment</h2>
                        <p className={`text-sm font-medium ${theme.textMuted}`}>{purchase.purchaseNumber}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${theme.mode === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Summary */}
                    <div className={`${theme.pageBg} rounded-2xl p-5 border ${theme.borderLight} space-y-3`}>
                        <div className="flex justify-between items-center text-sm">
                            <span className={`${theme.textMuted} font-medium`}>Supplier</span>
                            <span className={`font-bold ${theme.textHeading}`}>
                                {purchase.supplierName || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className={`${theme.textMuted} font-medium`}>Total Bill</span>
                            <span className={`font-bold ${theme.textHeading}`}>{formatCurrency(purchase.grandTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className={`${theme.textMuted} font-medium`}>Already Paid</span>
                            <span className="font-bold text-green-600">{formatCurrency(purchase.totalPaid)}</span>
                        </div>
                        <div className={`pt-3 border-t ${theme.borderLight} flex justify-between items-center`}>
                            <span className={`${theme.textHeading} font-black`}>Balance Due</span>
                            <span className="text-xl font-black text-red-600">{formatCurrency(balanceAmount)}</span>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                        <label className={`text-sm font-bold block ${theme.textHeading}`}>Select Payment Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedMethod(method)}
                                    className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${selectedMethod?.id === method.id
                                        ? `border-red-500 bg-red-500/10`
                                        : `border-transparent ${theme.mode === 'dark' ? 'hover:border-slate-700 bg-slate-800/50' : 'hover:border-gray-200 bg-gray-50'}`
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${method.color}`}>
                                        <method.icon size={20} />
                                    </div>
                                    <span className={`font-bold text-sm ${selectedMethod?.id === method.id ? 'text-red-400' : theme.textHeading}`}>
                                        {method.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input */}
                    {selectedMethod && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <label className={`text-sm font-bold flex justify-between ${theme.textHeading}`}>
                                <span>Amount to Pay Now</span>
                                {Number(amount) === balanceAmount && (
                                    <span className="text-green-600 text-xs flex items-center gap-1">
                                        <CheckCircle2 size={14} /> Full amount
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg ${theme.textMuted}`}>{currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency)}</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`w-full p-4 pl-10 rounded-xl border outline-none focus:ring-2 focus:ring-red-500 font-black text-xl ${theme.surfaceBg} ${theme.textHeading} ${theme.borderLight}`}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Action */}
                <div className={`p-6 border-t stretch ${theme.borderLight} ${theme.pageBg}`}>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedMethod || !amount || Number(amount) <= 0 || isSubmitting}
                        className="w-full py-4 rounded-xl text-white font-black text-lg transition-all flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            <>
                                <CheckCircle2 size={24} />
                                Confirm Payment
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PayOutSheet;
