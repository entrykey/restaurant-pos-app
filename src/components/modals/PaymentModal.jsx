import React, { useState, useEffect } from "react";
import { X, Tag, CreditCard, Coins, Smartphone, ReceiptText, CheckCircle2, ChevronLeft, Plus, Trash2, Printer, Loader2, Maximize2 } from "lucide-react";
import ThemeLoader from "../ui/ThemeLoader";
import { formatCurrency } from "../../utils/format";
import { useOrder } from "../../context/OrderContext";
import { customerService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { QRCodeSVG } from "qrcode.react";
import CommonSelect from "../ui/CommonSelect";


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
    originalOrderId = null,
    loyaltyDiscount = { points: 0, amount: 0 },
    billDiscount = { type: 'flat', value: 0 }
}) => {
    const { theme } = useTheme();
    const {
        billingStage,
        setBillingStage,
        // billDiscount removed from here - now using prop
        isAutoRoundOff,
        couponCode,
        setCouponCode,
        couponStatus,
        setCouponStatus,
        calculateItemTotal,
        calculateBillDetails,
        applyCoupon,
        dismissOffer
    } = useOrder();
    const { activeBranchId, branches, organization } = useApp();
    const activeBranch = branches.find(b => b._id === activeBranchId);
    const resolvedUpiId = activeBranch?.upiId || organization?.defaultUpiId;
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
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [expandedQR, setExpandedQR] = useState(null); // { upiString, amount } when expanded

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
            setIsProcessingPayment(false);
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

    // Apply loyalty discount to final total
    const finalBillDetails = loyaltyDiscount.amount > 0 ? {
        ...billDetails,
        finalTotal: Math.max(0, billDetails.finalTotal - loyaltyDiscount.amount)
    } : billDetails;

    // Helper: Get remaining balance
    const getRemainingBalance = () => {
        const paid = selectedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        return Math.max(0, finalBillDetails.finalTotal - paid);
    };

    const remainingBalance = getRemainingBalance();

    const PAYMENT_METHODS = [
        { id: "cash", label: "Cash", icon: Coins, color: "text-green-600 bg-green-50" },
        { id: "card", label: "Card", icon: CreditCard, color: "text-blue-600 bg-blue-50" },
        { id: "upi", label: "UPI", icon: Smartphone, color: "text-orange-600 bg-orange-50" },
        { id: "other", label: "Other", icon: ReceiptText, color: "text-gray-600 bg-gray-100" },
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
        <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-4">
            <div className={`${theme.surfaceBg} w-full h-full sm:h-auto sm:w-full sm:max-w-lg lg:max-w-4xl xl:max-w-6xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col sm:max-h-[95vh] animate-in zoom-in-95 duration-300`}>
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
                <div className="flex-1 overflow-y-auto min-h-0">
                    {billingStage === "review" && (
                        <div className="flex flex-col lg:flex-row h-full">
                            {/* Left Side: Items (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 custom-scrollbar lg:border-r lg:border-dashed lg:border-gray-200 dark:lg:border-white/10">
                                <section className="space-y-3 sm:space-y-4">
                                    <p className={`text-[10px] sm:text-xs font-black ${theme.textMuted} uppercase tracking-[0.2em]`}>
                                        Items to Bill
                                    </p>
                                    <div className="space-y-2 sm:space-y-2.5">
                                        {orderItems.map((item, i) => (
                                            <div
                                                key={i}
                                                className={`flex justify-between items-start text-xs sm:text-sm border-b border-dashed ${theme.borderLight} pb-2 sm:pb-2.5 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/2 p-1.5 sm:p-2 rounded-lg transition-colors`}
                                            >
                                                <div className="flex gap-2 sm:gap-3 min-w-0">
                                                    <span className={`font-black ${theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} shrink-0 text-xs sm:text-sm`}>
                                                        {item.quantity}x
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-col">
                                                            <span className={`font-black ${theme.textPrimary} leading-tight text-xs sm:text-sm truncate`}>
                                                                {item.name}
                                                                <span className={`ml-1.5 text-[9px] sm:text-[10px] ${theme.textMuted} font-bold opacity-60`}>
                                                                    ({(item.taxPercent !== undefined && item.taxPercent !== null) ? item.taxPercent : (settings?.defaultTaxPercent || 0)}%)
                                                                </span>
                                                            </span>
                                                            {item.selectedVariant && (
                                                                <span className="text-[9px] sm:text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">{item.selectedVariant.name}</span>
                                                            )}
                                                        </div>
                                                        {item.selectedExtras?.length > 0 && (
                                                            <div className={`text-[9px] sm:text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider mt-0.5 text-orange-500`}>+ Extras</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`font-black ${theme.textPrimary} text-xs sm:text-sm lg:text-base shrink-0 ml-3`}>
                                                    {formatCurrency(calculateItemTotal(item))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Right Side: Discounts & Summary (Fixed height or smaller scroll) */}
                            <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 shrink-0 bg-gray-50/30 dark:bg-white/2 lg:overflow-y-auto custom-scrollbar">
                                {/* Coupon Code Section */}
                                {(hasPermissionFor?.("pos", "order", "apply_discount") || (hasPermission && hasPermission("APPLY_DISCOUNTS"))) && (
                                    <section className={`${theme.mode === 'dark' ? 'bg-orange-900/10' : 'bg-orange-50'} p-4 md:p-5 rounded-2xl md:rounded-[32px] border ${theme.mode === 'dark' ? 'border-orange-900/40' : 'border-orange-100'} space-y-3 md:space-y-4`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-orange-600 text-[10px] md:text-xs flex items-center gap-2 uppercase tracking-widest">
                                                <Tag size={14} mdSize={16} /> Have a Coupon?
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
                                                className={`flex-1 p-2 md:p-3 rounded-xl md:rounded-2xl border outline-none uppercase font-black text-xs md:text-sm ${theme.mode === 'dark' ? 'bg-black/20 border-orange-900/40' : 'bg-white border-orange-200'}`}
                                            />
                                            <button
                                                onClick={applyCoupon}
                                                className="bg-orange-600 text-white px-4 md:px-6 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98]"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        {couponStatus && (
                                            <p
                                                className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${couponStatus.type === "success"
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
                                <div className={`${theme.surfaceBg} p-3 sm:p-4 lg:p-5 rounded-2xl lg:rounded-[30px] border ${theme.borderLight} shadow-xl shadow-black/5 space-y-2 sm:space-y-2.5 lg:space-y-3`}>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <div className={`flex justify-between ${theme.textMuted} text-[11px] sm:text-xs lg:text-sm font-bold`}>
                                            <span>Subtotal</span>
                                            <span className={theme.textPrimary}>{formatCurrency(billDetails.subtotal)}</span>
                                        </div>
                                        
                                        {billDetails.appliedOffers && billDetails.appliedOffers.length > 0 && (
                                            <div className="space-y-1 sm:space-y-1.5">
                                                {billDetails.appliedOffers.map((offer, oIdx) => (
                                                    <div key={offer.offerId || oIdx} className="flex justify-between items-center text-[9px] sm:text-[10px] lg:text-xs text-emerald-600 font-black bg-emerald-50 dark:bg-emerald-900/20 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 gap-2">
                                                        <span className="uppercase tracking-tight truncate">{offer.name}</span>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <span>-{formatCurrency(offer.discount)}</span>
                                                            {offer.offerId && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => dismissOffer(offer.offerId)}
                                                                    className="p-0.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                                                    title="Remove offer"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {billDiscount && billDiscount.value > 0 && (
                                            <div className="flex justify-between text-emerald-600 text-[11px] sm:text-xs lg:text-sm font-black bg-emerald-50 dark:bg-emerald-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                                                <div className="flex flex-col">
                                                    <span>Customer Discount</span>
                                                    {billDiscount.type === 'percent' && (
                                                        <span className="text-[9px] sm:text-[10px] opacity-70 uppercase tracking-wider">{billDiscount.value}% OFF</span>
                                                    )}
                                                </div>
                                                <span>-{formatCurrency(billDetails.discountAmount)}</span>
                                            </div>
                                        )}

                                        {billDetails.discountAmount > 0 && !billDiscount?.value && (
                                            <div className="flex justify-between text-emerald-600 text-[11px] sm:text-xs lg:text-sm font-black italic">
                                                <span>Coupon Discount</span>
                                                <span>-{formatCurrency(billDetails.discountAmount)}</span>
                                            </div>
                                        )}

                                        <div className={`flex flex-col gap-1 sm:gap-1.5 pt-1.5 sm:pt-2 border-t border-dashed ${theme.borderLight}`}>
                                            <div className={`flex justify-between ${theme.textMuted} text-[11px] sm:text-xs lg:text-sm font-bold`}>
                                                <span>Total Tax</span>
                                                <span className={theme.textPrimary}>{formatCurrency(billDetails.taxAmount)}</span>
                                            </div>
                                            
                                            {billDetails.taxBreakdown && (billDetails.taxBreakdown.cgst > 0 || billDetails.taxBreakdown.sgst > 0) && (
                                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                                    <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                                        <p className={`text-[7px] sm:text-[8px] font-black uppercase text-gray-400 mb-0.5`}>CGST</p>
                                                        <p className={`text-[10px] sm:text-xs font-black ${theme.textPrimary}`}>{formatCurrency(billDetails.taxBreakdown.cgst)}</p>
                                                    </div>
                                                    <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                                        <p className={`text-[7px] sm:text-[8px] font-black uppercase text-gray-400 mb-0.5`}>SGST</p>
                                                        <p className={`text-[10px] sm:text-xs font-black ${theme.textPrimary}`}>{formatCurrency(billDetails.taxBreakdown.sgst)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {billDetails.roundOff !== 0 && (
                                            <div className={`flex justify-between ${theme.textMuted} text-[10px] sm:text-xs font-bold italic`}>
                                                <span>Round Off</span>
                                                <span>{formatCurrency(billDetails.roundOff)}</span>
                                            </div>
                                        )}

                                        {exchangeCredit > 0 && (
                                            <div className="flex justify-between text-orange-600 text-[11px] sm:text-xs lg:text-sm font-black border-t border-dashed mt-1.5 pt-1.5 sm:pt-2">
                                                <span>Exchange Credit</span>
                                                <span>-{formatCurrency(exchangeCredit)}</span>
                                            </div>
                                        )}

                                        {loyaltyDiscount.amount > 0 && (
                                            <div className="flex justify-between text-amber-600 text-[11px] sm:text-xs lg:text-sm font-black bg-amber-50 dark:bg-amber-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-amber-200 dark:border-amber-800">
                                                <div className="flex flex-col">
                                                    <span>Loyalty Points Redeemed</span>
                                                    <span className="text-[9px] sm:text-[10px] opacity-70 uppercase tracking-wider">{loyaltyDiscount.points} pts</span>
                                                </div>
                                                <span>-{formatCurrency(loyaltyDiscount.amount)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`flex justify-between items-end pt-2 sm:pt-2.5 lg:pt-3 border-t-4 border-double ${theme.borderLight}`}>
                                        <span className={`text-[9px] sm:text-[10px] lg:text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>Amount Due</span>
                                        <span className={`text-xl sm:text-2xl lg:text-3xl font-black ${theme.textHeading}`}>{formatCurrency(finalBillDetails.finalTotal)}</span>
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
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between items-start gap-3 sm:gap-0">
                                                <span className={`text-xs font-black ${theme.textMuted} uppercase tracking-[0.2em]`}>Active Payment Methods</span>
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black ${remainingBalance > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600 ring-4 ring-emerald-500/10"}`}>
                                                    {remainingBalance > 0 ? `Unpaid: ${formatCurrency(remainingBalance)}` : "All Clear to Proceed"}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {selectedPayments.map((p, idx) => (
                                                    <div key={idx} className={`p-4 md:p-6 rounded-[24px] md:rounded-[32px] border ${theme.borderLight} ${theme.surfaceBg} shadow-sm relative group animate-in slide-in-from-bottom-2 duration-300`}>
                                                        <button 
                                                            onClick={() => removePaymentMethod(idx)}
                                                            className="absolute -top-3 -right-3 p-2 bg-white text-red-500 rounded-full border border-red-100 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
                                                            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-[24px] flex shrink-0 items-center justify-center ${p.method.color} shadow-inner self-start sm:self-auto`}>
                                                                <p.method.icon className="w-6 h-6 md:w-7 md:h-7" />
                                                            </div>
                                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full">
                                                                <div className="space-y-2">
                                                                    <label className={`text-[10px] font-black ${theme.textMuted} tracking-widest uppercase`}>{p.method.label} Amount</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-400 flex items-center">
                                                                            <Coins size={14} />
                                                                        </span>
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
                                                        {p.method.id === "upi" ? (
                                                            <div className={`mt-6 p-5 md:p-5 rounded-[24px] ${theme.mode === 'dark' ? 'bg-indigo-900/10 border-indigo-900/30' : 'bg-indigo-50/70 border-indigo-100'} border flex flex-col md:flex-row items-center justify-between gap-5 transition-all`}>
                                                                <div className="flex flex-col gap-1 text-center md:text-left w-full md:w-auto">
                                                                    <span className={`text-sm md:text-base font-black ${theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-700'} uppercase tracking-wider flex items-center justify-center md:justify-start gap-2`}><Smartphone size={18} /> Scan to Pay</span>
                                                                    <span className={`text-[10px] md:text-xs font-bold ${theme.mode === 'dark' ? 'text-indigo-400/70' : 'text-indigo-900/60'} tracking-widest uppercase`}>Secure UPI Payment</span>
                                                                    <span className={`text-xl md:text-2xl font-black ${theme.textPrimary} mt-1`}>{formatCurrency(p.amount)}</span>
                                                                    {!resolvedUpiId && (
                                                                        <span className="text-[10px] text-red-500 font-black uppercase py-1.5 bg-red-50 dark:bg-red-900/20 px-3 rounded-xl mt-2 self-center md:self-start border border-red-100 dark:border-red-900/40">Missing UPI ID</span>
                                                                    )}
                                                                </div>
                                                                {resolvedUpiId && p.amount > 0 ? (
                                                                    <div className="relative shrink-0 mt-2 md:mt-0">
                                                                        <div className="bg-white p-3 md:p-2 rounded-[20px] md:rounded-2xl shadow-xl shadow-indigo-600/10 border border-white w-40 h-40 md:w-28 md:h-28 flex items-center justify-center">
                                                                            <QRCodeSVG 
                                                                                value={`upi://pay?pa=${resolvedUpiId}&pn=${encodeURIComponent(activeBranch?.name || organization?.name || organization?.businessName || 'Shop')}&am=${p.amount}&cu=INR`} 
                                                                                style={{ width: "100%", height: "100%" }}
                                                                            />
                                                                        </div>
                                                                        {/* Expand button */}
                                                                        <button
                                                                            onClick={() => setExpandedQR({
                                                                                upiString: `upi://pay?pa=${resolvedUpiId}&pn=${encodeURIComponent(activeBranch?.name || organization?.name || organization?.businessName || 'Shop')}&am=${p.amount}&cu=INR`,
                                                                                amount: p.amount
                                                                            })}
                                                                            className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90"
                                                                            title="Expand QR"
                                                                        >
                                                                            <Maximize2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-40 h-40 md:w-28 md:h-28 bg-white/50 dark:bg-white/5 rounded-[20px] md:rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 shrink-0 mt-2 md:mt-0">
                                                                        <Smartphone size={40} className="text-gray-400 dark:text-gray-600 opacity-50" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : null}
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
                                                    onClick={async () => {
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

                                                        setIsProcessingPayment(true);
                                                        try {
                                                            await onFinalizePayment(
                                                                selectedPayments[0].method.id, 
                                                                billDetails, 
                                                                totalPaidAmount, 
                                                                localCustName, 
                                                                localCustPhone,
                                                                paymentsPayload
                                                            );
                                                        } catch (error) {
                                                            console.error("Payment failed", error);
                                                            setIsProcessingPayment(false);
                                                        }
                                                    }}
                                                    disabled={
                                                        isProcessingPayment ||
                                                        selectedPayments.length === 0 ||
                                                        (remainingBalance > 0 && (
                                                            !(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ||
                                                            (!billDetails.customerId && !localCustName?.trim() && !existingCustomerId) ||
                                                            (!billDetails.customerId && !localCustPhone?.trim() && !existingCustomerId)
                                                        ))
                                                    }
                                                    className={`w-full py-4 md:py-5 rounded-[24px] md:rounded-[32px] text-white font-black text-lg md:text-2xl transition-all shadow-2xl flex items-center justify-center gap-2 md:gap-4 group ${isProcessingPayment ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'} ${remainingBalance <= 0 ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
                                                >
                                                    {isProcessingPayment ? (
                                                        <Loader2 className="w-6 h-6 md:w-7 md:h-7 animate-spin shrink-0" />
                                                    ) : (
                                                        <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform shrink-0" />
                                                    )}
                                                    <span className="truncate">
                                                        {isProcessingPayment ? "Processing..." : (remainingBalance > 0 ? "Finalize Credit Purchase" : "Pay & Close Order")}
                                                    </span>
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
                <div className={`p-3 sm:p-4 md:p-5 border-t ${theme.borderLight} ${theme.pageBg} shrink-0`}>
                    {billingStage === "review" && (
                        <div className="flex flex-col gap-2.5 sm:gap-3 max-w-5xl mx-auto w-full">
                            <div className="flex flex-col sm:flex-row flex-1 gap-2 sm:gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => onPrintBill?.(printFormat)}
                                    className={`flex-1 py-2.5 sm:py-3 md:py-3.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-100 dark:border-indigo-900/40 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm touch-manipulation`}
                                >
                                    <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                                    <span className="font-black uppercase tracking-tight">Print Bill</span>
                                </button>
                                <div className={`px-3 sm:px-4 py-2.5 sm:py-3 ${theme.surfaceBg} border ${theme.borderLight} rounded-xl sm:rounded-2xl flex items-center justify-between sm:justify-start gap-2 sm:gap-3`}>
                                    <span className={`text-[9px] sm:text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>Format</span>
                                    <CommonSelect
                                        options={[
                                            { label: "Thermal", value: "thermal" },
                                            { label: "PDF / A4", value: "a4" }
                                        ]}
                                        value={printFormat}
                                        onChange={(val) => setPrintFormat(val)}
                                        className="w-24 sm:w-28"
                                        triggerClassName="!px-2.5 sm:!px-3 !py-1 !rounded-lg sm:!rounded-xl !bg-transparent !border-none !shadow-none !text-xs"
                                        labelKey="label"
                                        valueKey="value"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setBillingStage("payment");
                                    setSelectedPayments([]);
                                }}
                                className="w-full py-3 sm:py-3.5 md:py-4 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg md:text-xl shadow-2xl shadow-indigo-500/30 hover:from-indigo-700 hover:to-indigo-800 flex justify-center px-4 items-center group active:scale-95 transition-all touch-manipulation"
                            >
                                <span className="group-hover:translate-x-1 transition-transform">Proceed to Checkout</span>
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
                                className={`w-full py-3 sm:py-3.5 ${theme.surfaceBg} ${theme.textMuted} border-2 border-dashed ${theme.borderLight} rounded-xl sm:rounded-2xl font-black text-sm sm:text-base uppercase tracking-widest hover:text-indigo-600 hover:border-indigo-600 transition-all active:scale-95 touch-manipulation`}
                            >
                                Re-Review Bill Details
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Fullscreen QR Overlay */}
        {expandedQR && (
            <div
                className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={() => setExpandedQR(null)}
            >
                <div
                    className="flex flex-col items-center gap-6 p-8 bg-white rounded-[40px] shadow-2xl max-w-xs w-full mx-4"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-1">Scan to Pay</p>
                        <p className="text-3xl font-black text-gray-900">{formatCurrency(expandedQR.amount)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-3xl shadow-inner border-4 border-indigo-50 w-64 h-64 flex items-center justify-center">
                        <QRCodeSVG
                            value={expandedQR.upiString}
                            style={{ width: "100%", height: "100%" }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 font-bold text-center">Point your camera at the QR code to pay via UPI</p>
                    <button
                        onClick={() => setExpandedQR(null)}
                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all text-sm uppercase tracking-widest"
                    >
                        Close
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

export default PaymentModal;
