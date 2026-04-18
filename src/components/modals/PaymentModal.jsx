import React, { useState, useEffect } from "react";
import { X, Tag, CreditCard, Banknote, Smartphone, Receipt, CheckCircle2, ChevronLeft, Plus, Trash2 } from "lucide-react";
import ThemeLoader from "../ui/ThemeLoader";
import { formatCurrency } from "../../utils/format";
import { useOrder } from "../../context/OrderContext";
import { customerService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";

const PaymentModal = ({
    isOpen,
    onClose,
    isTakeaway,
    activeTableId,
    tableName,
    orderItems,
    settings,
    onFinalizePayment,
    onPrintBill,
    hasPermission,
    hasPermissionFor,
    custName,
    setCustName,
    custPhone,
    setCustPhone,
    existingCustomerId,
    exchangeCredit = 0,
    originalOrderId = null
}) => {
    const { theme } = useTheme();
    const {
        billingStage,
        setBillingStage,
        billDiscount,
        isAutoRoundOff,
        couponCode,
        setCouponCode,
        couponStatus,
        setCouponStatus,
        calculateItemTotal,
        calculateBillDetails,
        applyCoupon
    } = useOrder();
    const { activeBranchId, branches } = useApp();
    const activeBranch = branches.find(b => b._id === activeBranchId);
    const branchStateCode = activeBranch?.address?.state?.code;
    const [customerStateCode, setCustomerStateCode] = useState(null);

    useEffect(() => {
        if (isOpen && (existingCustomerId || custPhone)) {
            // Try to find customer state code if possible
            // This could be an API call or passed in
        }
    }, [isOpen, existingCustomerId, custPhone]);

    const [selectedPayments, setSelectedPayments] = useState([]); // Array of { method: {id, label, icon, color}, amount: number, ref: string }
    const [printFormat, setPrintFormat] = useState("thermal"); // thermal | a4

    // Local state for customer details to prevent parent AppContent re-renders on every keystroke
    const [localCustName, setLocalCustName] = useState(custName || "");
    const [localCustPhone, setLocalCustPhone] = useState(custPhone || "");
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [noCustomerFound, setNoCustomerFound] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalCustName(custName || "");
            setLocalCustPhone(custPhone || "");
            setSearchPerformed(false);
            setNoCustomerFound(false);
            setPrintFormat("thermal");
            setSelectedPayments([]); // Reset on open
        }
    }, [isOpen, custName, custPhone]);

    // Handle early return after hooks
    if (!isOpen) return null;

    // Derived Data
    const billDetails = calculateBillDetails(
        orderItems,
        billDiscount,
        settings?.defaultTaxPercent || 5,
        isAutoRoundOff,
        exchangeCredit,
        branchStateCode,
        customerStateCode
    );

    // Helper: Get remaining balance
    const getRemainingBalance = () => {
        const paid = selectedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        return Math.max(0, billDetails.finalTotal - paid);
    };

    const remainingBalance = getRemainingBalance();

    const PAYMENT_METHODS = [
        { id: "cash", label: "Cash", icon: Banknote, color: "text-green-600 bg-green-50" },
        { id: "card", label: "Card", icon: CreditCard, color: "text-blue-600 bg-blue-50" },
        { id: "upi", label: "UPI", icon: Smartphone, color: "text-orange-600 bg-orange-50" },
        { id: "other", label: "Other", icon: Receipt, color: "text-gray-600 bg-gray-100" },
    ];

    const addPaymentMethod = (method) => {
        const balance = getRemainingBalance();
        if (balance <= 0) return;
        
        setSelectedPayments(prev => [
            ...prev,
            { method, amount: balance, ref: "" }
        ]);
    };

    const removePaymentMethod = (index) => {
        setSelectedPayments(prev => prev.filter((_, i) => i !== index));
    };

    const updatePaymentAmount = (index, value) => {
        setSelectedPayments(prev => {
            const next = [...prev];
            next[index].amount = value;
            return next;
        });
    };

    const updatePaymentRef = (index, value) => {
        setSelectedPayments(prev => {
            const next = [...prev];
            next[index].ref = value;
            return next;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className={`${theme.surfaceBg} w-full max-w-lg xl:max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300`}>
                {/* Header */}
                <div className={`p-6 ${theme.pageBg} border-b ${theme.borderLight} flex justify-between items-center shrink-0`}>
                    <div>
                        <h3 className={`text-2xl font-black ${theme.textHeading}`}>
                            {selectedPayments.length > 0 ? "Confirm Payment" : (billingStage === "review" ? "Review Bill" : "Payment Method")}
                        </h3>
                        <p className={`text-sm ${theme.textMuted}`}>
                            {isTakeaway ? "Takeaway" : (tableName ? `Table ${tableName}` : `Table ${activeTableId}`)}
                        </p>
                    </div>
                    {selectedPayments.length > 0 ? (
                        <button
                            onClick={() => setSelectedPayments([])}
                            className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className={`p-2 ${theme.surfaceBg} rounded-full shadow-sm hover:${theme.pageBg} transition-colors ${theme.textPrimary}`}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {billingStage === "review" && (
                        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0">
                            {/* Left Side: Items (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar xl:border-r xl:border-dashed border-gray-200 dark:border-white/10">
                                <section className="space-y-4">
                                    <p className={`text-xs font-black ${theme.textMuted} uppercase tracking-[0.2em]`}>
                                        Items to Bill
                                    </p>
                                    <div className="space-y-3">
                                        {orderItems.map((item, i) => (
                                            <div
                                                key={i}
                                                className={`flex justify-between items-start text-sm border-b border-dashed ${theme.borderLight} pb-3 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/2 p-2 rounded-xl transition-colors`}
                                            >
                                                <div className="flex gap-4 min-w-0">
                                                    <span className={`font-black ${theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} shrink-0`}>
                                                        {item.quantity}x
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-col">
                                                            <span className={`font-black ${theme.textPrimary} leading-tight text-base truncate`}>
                                                                {item.name}
                                                                <span className={`ml-2 text-[10px] ${theme.textMuted} font-bold opacity-60`}>
                                                                    ({(item.taxPercent !== undefined && item.taxPercent !== null) ? item.taxPercent : (settings?.defaultTaxPercent || 0)}%)
                                                                </span>
                                                            </span>
                                                            {item.selectedVariant && (
                                                                <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">{item.selectedVariant.name}</span>
                                                            )}
                                                        </div>
                                                        {item.selectedExtras?.length > 0 && (
                                                            <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider mt-1 text-orange-500`}>+ Extras</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`font-black ${theme.textPrimary} text-base shrink-0 ml-4`}>
                                                    {formatCurrency(calculateItemTotal(item))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Right Side: Discounts & Summary (Fixed height or smaller scroll) */}
                            <div className="w-full xl:w-[450px] flex flex-col p-6 space-y-6 shrink-0 bg-gray-50/30 dark:bg-white/2">
                                {/* Coupon Code Section */}
                                {(hasPermissionFor?.("pos", "order", "apply_discount") || (hasPermission && hasPermission("APPLY_DISCOUNTS"))) && (
                                    <section className={`${theme.mode === 'dark' ? 'bg-orange-900/10' : 'bg-orange-50'} p-5 rounded-[32px] border ${theme.mode === 'dark' ? 'border-orange-900/40' : 'border-orange-100'} space-y-4`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-orange-600 text-xs flex items-center gap-2 uppercase tracking-widest">
                                                <Tag size={16} /> Have a Coupon?
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                value={couponCode}
                                                onChange={(e) => {
                                                    setCouponCode(e.target.value.toUpperCase());
                                                    setCouponStatus(null);
                                                }}
                                                placeholder="Enter Code"
                                                className={`flex-1 p-3 rounded-2xl border outline-none uppercase font-black text-sm ${theme.mode === 'dark' ? 'bg-black/20 border-orange-900/40' : 'bg-white border-orange-200'}`}
                                            />
                                            <button
                                                onClick={applyCoupon}
                                                className="bg-orange-600 text-white px-6 rounded-2xl font-black text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98]"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        {couponStatus && (
                                            <p
                                                className={`text-[10px] font-black uppercase tracking-widest ${couponStatus.type === "success"
                                                    ? "text-emerald-500"
                                                    : "text-red-500"
                                                    }`}
                                            >
                                                {couponStatus.msg}
                                            </p>
                                        )}
                                    </section>
                                )}

                                {/* Bill Summary (Compact/Fixed visibility) */}
                                <div className={`${theme.surfaceBg} p-8 rounded-[40px] border ${theme.borderLight} shadow-xl shadow-black/5 space-y-4`}>
                                    <div className="space-y-3">
                                        <div className={`flex justify-between ${theme.textMuted} text-sm font-bold`}>
                                            <span>Subtotal</span>
                                            <span className={theme.textPrimary}>{formatCurrency(billDetails.subtotal)}</span>
                                        </div>
                                        
                                        {billDetails.appliedOffers && billDetails.appliedOffers.length > 0 && (
                                            <div className="space-y-2 py-1">
                                                {billDetails.appliedOffers.map((offer, oIdx) => (
                                                    <div key={oIdx} className="flex justify-between items-center text-xs text-emerald-600 font-black bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                                                        <span className="uppercase tracking-tight">{offer.name}</span>
                                                        <span>-{formatCurrency(offer.discount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {billDetails.discountAmount > 0 && (
                                            <div className="flex justify-between text-emerald-600 text-sm font-black italic">
                                                <span>Coupon Discount</span>
                                                <span>-{formatCurrency(billDetails.discountAmount)}</span>
                                            </div>
                                        )}

                                        <div className={`flex flex-col gap-2 pt-2 border-t border-dashed ${theme.borderLight}`}>
                                            <div className={`flex justify-between ${theme.textMuted} text-sm font-bold`}>
                                                <span>Total Tax</span>
                                                <span className={theme.textPrimary}>{formatCurrency(billDetails.taxAmount)}</span>
                                            </div>
                                            
                                            {billDetails.taxBreakdown && (billDetails.taxBreakdown.cgst > 0 || billDetails.taxBreakdown.sgst > 0) && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                                        <p className={`text-[8px] font-black uppercase text-gray-400 mb-0.5`}>CGST</p>
                                                        <p className={`text-xs font-black ${theme.textPrimary}`}>{formatCurrency(billDetails.taxBreakdown.cgst)}</p>
                                                    </div>
                                                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                                        <p className={`text-[8px] font-black uppercase text-gray-400 mb-0.5`}>SGST</p>
                                                        <p className={`text-xs font-black ${theme.textPrimary}`}>{formatCurrency(billDetails.taxBreakdown.sgst)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {billDetails.roundOff !== 0 && (
                                            <div className={`flex justify-between ${theme.textMuted} text-xs font-bold italic`}>
                                                <span>Round Off</span>
                                                <span>{formatCurrency(billDetails.roundOff)}</span>
                                            </div>
                                        )}

                                        {exchangeCredit > 0 && (
                                            <div className="flex justify-between text-orange-600 text-sm font-black border-t border-dashed mt-2 pt-3">
                                                <span>Exchange Credit</span>
                                                <span>-{formatCurrency(exchangeCredit)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`flex justify-between items-end pt-4 border-t-4 border-double ${theme.borderLight}`}>
                                        <span className={`text-sm font-black ${theme.textMuted} uppercase tracking-widest pb-1`}>Amount Due</span>
                                        <span className={`text-4xl font-black ${theme.textHeading}`}>{formatCurrency(billDetails.finalTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {billingStage === "payment" && (
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-8 custom-scrollbar">
                            <div className="max-w-2xl mx-auto w-full">
                                {/* Current Method Selection / Inputs */}
                                <div className="space-y-8">
                                    {/* Copy existing behavior but centered for narrow width within wide modal */}
                                    {selectedPayments.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-xs font-black ${theme.textMuted} uppercase tracking-[0.2em]`}>Active Payment Methods</span>
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black ${remainingBalance > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600 ring-4 ring-emerald-500/10"}`}>
                                                    {remainingBalance > 0 ? `Unpaid: ${formatCurrency(remainingBalance)}` : "All Clear to Proceed"}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {selectedPayments.map((p, idx) => (
                                                    <div key={idx} className={`p-6 rounded-[32px] border ${theme.borderLight} ${theme.surfaceBg} shadow-sm relative group animate-in slide-in-from-bottom-2 duration-300`}>
                                                        <button 
                                                            onClick={() => removePaymentMethod(idx)}
                                                            className="absolute -top-3 -right-3 p-2 bg-white text-red-500 rounded-full border border-red-100 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <div className="flex items-center gap-6">
                                                            <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center ${p.method.color} shadow-inner`}>
                                                                <p.method.icon size={28} />
                                                            </div>
                                                            <div className="flex-1 grid grid-cols-2 gap-6">
                                                                <div className="space-y-2">
                                                                    <label className={`text-[10px] font-black ${theme.textMuted} tracking-widest uppercase`}>{p.method.label} Amount</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                                                                        <input
                                                                            type="number"
                                                                            value={p.amount}
                                                                            onChange={(e) => updatePaymentAmount(idx, e.target.value)}
                                                                            className={`w-full pl-8 pr-4 py-3 ${theme.pageBg} rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-xl text-indigo-600`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className={`text-[10px] font-black ${theme.textMuted} tracking-widest uppercase`}>Note / Ref</label>
                                                                    <input
                                                                        placeholder="Transaction reference..."
                                                                        value={p.ref}
                                                                        onChange={(e) => updatePaymentRef(idx, e.target.value)}
                                                                        className={`w-full p-3 ${theme.pageBg} rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm ${theme.textPrimary}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {remainingBalance > 0 && (
                                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10 text-center">
                                                        <p className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.2em]">Add Balance Method</p>
                                                        <div className="flex flex-wrap justify-center gap-3">
                                                            {PAYMENT_METHODS.map((m) => (
                                                                <button
                                                                    key={m.id}
                                                                    onClick={() => addPaymentMethod(m)}
                                                                    className={`px-5 py-3 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} hover:border-indigo-400 hover:shadow-lg transition-all flex items-center gap-2 group active:scale-95`}
                                                                >
                                                                    <m.icon size={18} className={m.color.split(' ')[0]} />
                                                                    <span className={`text-[10px] font-black ${theme.textMuted} group-hover:text-indigo-600 uppercase tracking-widest`}>{m.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPayments.length === 0 && (
                                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                                            {PAYMENT_METHODS.map((method) => (
                                                <button
                                                    key={method.id}
                                                    onClick={() => addPaymentMethod(method)}
                                                    className={`p-6 md:p-10 rounded-[30px] md:rounded-[40px] border-2 border-transparent hover:border-indigo-200 hover:shadow-2xl transition-all flex flex-col items-center gap-3 md:gap-4 bg-white dark:bg-white/5 active:scale-95 group`}
                                                >
                                                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[32px] ${method.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                        <method.icon size={32} />
                                                    </div>
                                                    <span className={`font-black text-lg md:text-xl ${theme.textPrimary}`}>{method.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Logic for credit/customer same as before but styled */}
                                    {selectedPayments.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                            {remainingBalance > 0 && (
                                                <div className={`p-8 rounded-[40px] border ${(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ? "bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/40" : "bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/40"}`}>
                                                    {!(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ? (
                                                        <p className="text-sm font-black text-red-500 text-center uppercase tracking-widest">
                                                            Credit disabled. Total must be paid.
                                                        </p>
                                                    ) : !(billDetails.customerId || existingCustomerId) ? (
                                                        <div className="space-y-6">
                                                            <div className="text-center">
                                                                <h4 className="text-orange-600 font-black text-sm uppercase tracking-widest block mb-1">Partial Payment / Credit</h4>
                                                                <p className="text-xs font-bold text-orange-900/60 dark:text-orange-400/60">
                                                                    Identify customer to record remaining {formatCurrency(remainingBalance)} as credit.
                                                                </p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] uppercase font-black text-orange-400 tracking-widest flex justify-between">
                                                                        <span>Phone Number *</span>
                                                                        {isSearchingCustomer && <ThemeLoader size="xs" />}
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={localCustPhone}
                                                                        onChange={(e) => setLocalCustPhone(e.target.value)}
                                                                        placeholder="Search number..."
                                                                        className={`w-full p-4 rounded-3xl border outline-none font-black text-lg ${theme.mode === 'dark' ? 'bg-black/20 border-orange-900/40 text-orange-400' : 'bg-white border-orange-200 text-orange-700'} focus:ring-4 focus:ring-orange-500/20`}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] uppercase font-black text-orange-400 tracking-widest">Full Name *</label>
                                                                    <input
                                                                        type="text"
                                                                        value={localCustName}
                                                                        onChange={(e) => setLocalCustName(e.target.value)}
                                                                        placeholder="Customer name..."
                                                                        className={`w-full p-4 rounded-3xl border outline-none font-black text-lg ${theme.mode === 'dark' ? 'bg-black/20 border-orange-900/40 text-orange-400' : 'bg-white border-orange-200 text-orange-700'} focus:ring-4 focus:ring-orange-500/20`}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {searchPerformed && noCustomerFound && !isSearchingCustomer && (
                                                                <div className="text-center py-2 px-4 rounded-full bg-orange-600/10 border border-orange-600/20 text-[10px] text-orange-600 font-black uppercase tracking-widest italic">
                                                                    Creating new customer record
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <p className="text-sm font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Credit Linked</p>
                                                            <p className="text-xs font-bold text-gray-500">
                                                                Balance {formatCurrency(remainingBalance)} will be added to ledger.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="pt-8">
                                                <button
                                                    onClick={() => {
                                                        // Validate Customer details on credit/partial payment
                                                        if (remainingBalance > 0) {
                                                            if (!localCustName.trim() || !localCustPhone.trim()) {
                                                                if (!billDetails.customerId && !existingCustomerId) {
                                                                    alert("Customer Name and Phone are required for partial/credit payments.");
                                                                    return;
                                                                }
                                                            }
                                                        }

                                                        // Prepare combined payment payload
                                                        const totalPaidAmount = selectedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
                                                        const paymentsPayload = selectedPayments.map(p => ({
                                                            paymentMethod: p.method.id.toUpperCase(),
                                                            amount: Number(p.amount),
                                                            referenceNumber: p.ref
                                                        }));

                                                        setCustName(localCustName);
                                                        setCustPhone(localCustPhone);

                                                        onFinalizePayment(
                                                            selectedPayments[0].method.id, 
                                                            billDetails, 
                                                            totalPaidAmount, 
                                                            localCustName, 
                                                            localCustPhone,
                                                            paymentsPayload
                                                        );
                                                    }}
                                                    disabled={
                                                        selectedPayments.length === 0 ||
                                                        (remainingBalance > 0 && (
                                                            !(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ||
                                                            (!billDetails.customerId && !localCustName?.trim() && !existingCustomerId) ||
                                                            (!billDetails.customerId && !localCustPhone?.trim() && !existingCustomerId)
                                                        ))
                                                    }
                                                    className={`w-full py-5 rounded-[32px] text-white font-black text-2xl transition-all shadow-2xl flex items-center justify-center gap-4 group active:scale-95 ${remainingBalance <= 0 ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
                                                >
                                                    <CheckCircle2 size={28} className="group-hover:scale-110 transition-transform" />
                                                    {remainingBalance > 0 ? "Finalize Credit Purchase" : "Pay & Close Order"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions (Compact) */}
                <div className={`p-6 border-t ${theme.borderLight} ${theme.pageBg} shrink-0`}>
                    {billingStage === "review" && (
                        <div className="flex flex-col md:flex-row gap-6 max-w-5xl mx-auto w-full">
                            <div className="flex flex-1 gap-4">
                                <button
                                    type="button"
                                    onClick={() => onPrintBill?.(printFormat)}
                                    className="flex-1 py-4 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-white/10 rounded-3xl font-black text-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center gap-3 transition-colors active:scale-95"
                                >
                                    <Receipt size={24} className="text-gray-400" />
                                    <span className="flex flex-col items-start leading-tight">
                                        <span>Print Bill</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">To {printFormat} printer</span>
                                    </span>
                                </button>
                                <div className={`px-6 py-4 ${theme.surfaceBg} border ${theme.borderLight} rounded-3xl flex items-center gap-4`}>
                                    <span className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>Format</span>
                                    <select
                                        value={printFormat}
                                        onChange={(e) => setPrintFormat(e.target.value)}
                                        className={`text-sm font-black px-3 py-1 rounded-xl bg-transparent ${theme.textPrimary} outline-none cursor-pointer`}
                                    >
                                        <option value="thermal">Thermal</option>
                                        <option value="a4">PDF / A4</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setBillingStage("payment");
                                    setSelectedPayments([]);
                                }}
                                className="w-full md:w-auto md:min-w-[400px] py-4 bg-indigo-600 text-white rounded-3xl font-black text-2xl shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 flex justify-between px-8 items-center group active:scale-95 transition-all"
                            >
                                <span className="group-hover:translate-x-1 transition-transform">Proceed to Checkout</span>
                                <span className="bg-white/20 px-4 py-1.5 rounded-2xl text-lg backdrop-blur-md">
                                    {formatCurrency(billDetails.finalTotal)}
                                </span>
                            </button>
                        </div>
                    )}
                    
                    {billingStage === "payment" && selectedPayments.length === 0 && (
                        <div className="max-w-2xl mx-auto w-full">
                            <button
                                onClick={() => {
                                    setBillingStage("review");
                                    setSelectedPayments([]);
                                }}
                                className={`w-full py-4 ${theme.surfaceBg} ${theme.textMuted} border-2 border-dashed ${theme.borderLight} rounded-3xl font-black uppercase tracking-widest hover:text-indigo-600 hover:border-indigo-600 transition-all active:scale-95`}
                            >
                                Re-Review Bill Details
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
