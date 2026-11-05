import React, { useState, useEffect, useMemo } from "react";
import { 
    X, CreditCard, Coins, Smartphone, Building2,  
    CheckCircle2, Clock, AlertCircle, User, ArrowRight, Check, RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import { customerService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { formatCurrency as defaultFormatCurrency } from "../../utils/format";
import CommonSelect from "../ui/CommonSelect";

const CustomerPaymentCollectModal = ({ isOpen, onClose, customer, allCustomers = [], onSuccess }) => {
    const { theme } = useTheme();
    const { formatCurrency, currencySymbol } = useApp();
    const fmt = formatCurrency || defaultFormatCurrency || ((val) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    const symbol = currencySymbol || '₹';

    const [selectedCustomer, setSelectedCustomer] = useState(customer || null);
    const [dueOrders, setDueOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Active customer resolution: prop customer has priority when explicitly provided, else selectedCustomer
    const activeCustomer = customer || selectedCustomer || null;

    useEffect(() => {
        if (isOpen) {
            const current = customer || null;
            setSelectedCustomer(current);
            setSelectedOrderId("");
            setReferenceNumber("");
            setNotes("");
            setPaymentMethod("CASH");

            if (current) {
                const initialDue = current.totalDue !== undefined ? current.totalDue : (current.balance || current.outstandingBalance || 0);
                setAmount(Number(initialDue) > 0 ? String(initialDue) : "");
                loadDueOrders(current._id || current.id);
            } else {
                setAmount("");
                setDueOrders([]);
            }
        }
    }, [isOpen, customer]);

    const loadDueOrders = async (custId) => {
        if (!custId) return;
        setLoadingOrders(true);
        try {
            const res = await customerService.getDueOrders(custId);
            setDueOrders(res.dueOrders || []);
            if (res.totalDue !== undefined && Number(res.totalDue) > 0) {
                setAmount(String(res.totalDue));
            }
        } catch (e) {
            console.warn("Could not load due orders:", e);
            setDueOrders([]);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleCustomerSelect = (custId) => {
        const found = allCustomers.find(c => String(c._id || c.id) === String(custId));
        setSelectedCustomer(found || null);
        setSelectedOrderId("");
        if (found) {
            const due = found.totalDue !== undefined ? found.totalDue : (found.balance || 0);
            setAmount(Number(due) > 0 ? String(due) : "");
            loadDueOrders(found._id || found.id);
        } else {
            setDueOrders([]);
            setAmount("");
        }
    };

    const customerName = activeCustomer?.name || 'Customer';
    const customerPhone = activeCustomer?.phone || '';
    const customerCode = activeCustomer?.customerCode || '';
    const currentDue = activeCustomer 
        ? Number(activeCustomer.totalDue !== undefined ? activeCustomer.totalDue : (activeCustomer.balance || 0))
        : 0;

    const payAmount = Number(amount) || 0;
    const remainingBalance = Math.max(0, currentDue - payAmount);

    // Options for Customer CommonSelect
    const customerOptions = useMemo(() => {
        return (allCustomers || []).map(c => {
            const due = Number(c.totalDue !== undefined ? c.totalDue : (c.balance || 0));
            return {
                value: String(c._id || c.id),
                label: `${c.name || 'Unnamed'} ${c.phone ? `(${c.phone})` : ''} - Due: ${fmt(due)}`,
                name: c.name || 'Unnamed',
                phone: c.phone || '',
                code: c.customerCode || '',
                due: due,
                raw: c
            };
        });
    }, [allCustomers, fmt]);

    // Options for Due Orders CommonSelect
    const orderOptions = useMemo(() => {
        const list = [
            {
                value: "",
                label: `Overall Due Balance (Oldest Invoices First) — ${fmt(currentDue)}`,
                due: currentDue
            }
        ];
        (dueOrders || []).forEach(o => {
            list.push({
                value: String(o._id),
                label: `Invoice #${o.invoiceNumber || o.orderNumber} (Gross: ${fmt(o.grandTotal)}, Due: ${fmt(o.due)})`,
                invoiceNumber: o.invoiceNumber || o.orderNumber,
                due: o.due,
                grandTotal: o.grandTotal
            });
        });
        return list;
    }, [dueOrders, currentDue, fmt]);

    // Payment method options for CommonSelect
    const paymentMethodOptions = [
        { value: "CASH", label: "Cash" },
        { value: "UPI", label: "UPI / QR Payment" },
        { value: "CARD", label: "Card (Debit / Credit)" },
        { value: "BANK", label: "Bank Transfer / NEFT" },
    ];

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeCustomer) {
            toast.error("Please select a customer.");
            return;
        }

        if (payAmount <= 0) {
            toast.error("Please enter a valid payment amount greater than 0.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                amount: payAmount,
                paymentMethod,
                referenceNumber: referenceNumber.trim(),
                notes: notes.trim(),
                orderId: selectedOrderId || undefined
            };

            const targetId = activeCustomer._id || activeCustomer.id;
            const result = await customerService.collectPayment(targetId, payload);
            toast.success(result?.message || `Payment of ${fmt(payAmount)} collected successfully!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to collect payment:", error);
            toast.error(error?.message || "Failed to collect payment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Slide-in Drawer */}
            <div className={`relative w-full max-w-lg h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 ${theme.surfaceBg}`}>
                {/* Header */}
                <div className={`px-6 py-5 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Coins size={22} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${theme.textHeading}`}>Collect Payment</h2>
                            <p className={`text-xs font-bold ${theme.textMuted}`}>Receive due payment from customer</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${theme.inputBg} ${theme.textMuted} hover:text-rose-500`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Customer Selection or Banner */}
                    {!customer ? (
                        <div className="space-y-1.5">
                            <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                                Customer <span className="text-rose-500">*</span>
                            </label>
                            <CommonSelect
                                options={customerOptions}
                                value={activeCustomer ? String(activeCustomer._id || activeCustomer.id) : ""}
                                onChange={(val) => handleCustomerSelect(val)}
                                placeholder="Select a customer..."
                                searchPlaceholder="Search customer by name, mobile, code..."
                                searchable={true}
                                required={true}
                                renderOption={(opt) => (
                                    <div className="flex items-center justify-between w-full py-1">
                                        <div>
                                            <span className="font-bold text-sm block">{opt.name}</span>
                                            <span className={`text-xs block ${theme.textMuted}`}>{opt.phone || opt.code || ''}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-xs text-rose-600 dark:text-rose-400 block">{fmt(opt.due)}</span>
                                            <span className="text-[9px] uppercase tracking-wider text-gray-400">Due</span>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    ) : (
                        <div className={`p-4 rounded-2xl border ${theme.borderLight} bg-gradient-to-br from-emerald-50/50 to-indigo-50/30 dark:from-emerald-950/20 dark:to-indigo-950/10 flex items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                                    {customerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className={`font-black text-sm ${theme.textHeading}`}>{customerName}</h3>
                                    <p className={`text-xs font-medium ${theme.textMuted}`}>{customerPhone || customerCode || 'Registered Customer'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">Total Due</span>
                                <span className="text-lg font-black text-rose-600 dark:text-rose-400">{fmt(currentDue)}</span>
                            </div>
                        </div>
                    )}

                    {/* Pending Order Invoices (Using CommonSelect) */}
                    {activeCustomer && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between mb-1">
                                <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                                    Apply To Invoice / Order
                                </label>
                                {loadingOrders && <span className="text-[10px] font-bold text-gray-400">Loading invoices...</span>}
                            </div>
                            <CommonSelect
                                options={orderOptions}
                                value={selectedOrderId}
                                onChange={(val) => {
                                    setSelectedOrderId(val);
                                    const match = dueOrders.find(o => String(o._id) === String(val));
                                    if (match) {
                                        setAmount(String(match.due));
                                    } else {
                                        setAmount(currentDue > 0 ? String(currentDue) : "");
                                    }
                                }}
                                placeholder="Overall Due Balance (Oldest First)"
                                searchPlaceholder="Search invoice #..."
                                searchable={orderOptions.length > 5}
                            />
                        </div>
                    )}

                    {/* Amount to Collect Input */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Amount To Collect ({symbol}) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-base font-black text-gray-400">{symbol}</span>
                            <input
                                type="number"
                                step="any"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-xl font-black outline-none focus:border-emerald-500 transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                required
                            />
                        </div>
                        {/* Quick fill buttons */}
                        {currentDue > 0 && (
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(currentDue))}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${theme.borderLight} text-emerald-600 hover:bg-emerald-50`}
                                >
                                    Full Due: {fmt(currentDue)}
                                </button>
                                {currentDue > 200 && (
                                    <button
                                        type="button"
                                        onClick={() => setAmount(String(Math.round(currentDue / 2)))}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${theme.borderLight} text-gray-600 hover:bg-gray-50`}
                                    >
                                        Half: {fmt(Math.round(currentDue / 2))}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Payment Mode Selector using CommonSelect */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Payment Mode <span className="text-rose-500">*</span>
                        </label>
                        <CommonSelect
                            options={paymentMethodOptions}
                            value={paymentMethod}
                            onChange={(val) => setPaymentMethod(val)}
                            placeholder="Select Payment Mode..."
                            searchable={false}
                        />
                    </div>

                    {/* Reference / Transaction ID */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Reference / UPI Txn ID / Note (Optional)
                        </label>
                        <input
                            type="text"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="e.g. UPI Ref, Cheque No, Bank Txn..."
                            className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:border-emerald-500 ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                        />
                    </div>

                    {/* Live Financial Summary */}
                    <div className={`p-4 rounded-2xl border ${theme.borderLight} bg-gray-50/60 dark:bg-slate-900/40 space-y-2`}>
                        <div className="flex justify-between items-center text-xs">
                            <span className={theme.textMuted}>Current Customer Due:</span>
                            <span className="font-bold text-rose-500">{fmt(currentDue)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className={theme.textMuted}>Amount Collecting Now:</span>
                            <span className="font-black text-emerald-600">+{fmt(payAmount)}</span>
                        </div>
                        <div className={`pt-2 border-t ${theme.borderLight} flex justify-between items-center text-sm font-black`}>
                            <span className={theme.textHeading}>Remaining Balance:</span>
                            <span className={remainingBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                                {fmt(remainingBalance)}
                            </span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting || payAmount <= 0}
                            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-xl shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Coins size={18} />
                                    <span>Collect {fmt(payAmount)}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerPaymentCollectModal;
