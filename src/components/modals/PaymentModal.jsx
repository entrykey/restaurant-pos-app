import React, { useState, useEffect } from "react";
import { X, Tag, CreditCard, Banknote, Smartphone, Receipt, CheckCircle2, ChevronLeft, Plus, Trash2 } from "lucide-react";
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
            <div className={`${theme.surfaceBg} w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className={`p-6 ${theme.pageBg} border-b ${theme.borderLight} flex justify-between items-center`}>
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
                            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {billingStage === "review" && (
                        <>
                            {/* Item List Compact */}
                            <div className="space-y-3">
                                <p className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>
                                    Items
                                </p>
                                {orderItems.map((item, i) => (
                                    <div
                                        key={i}
                                        className={`flex justify-between items-start text-sm border-b border-dashed ${theme.borderLight} pb-2 last:border-0`}
                                    >
                                        <div className="flex gap-3">
                                            <span className={`font-bold ${theme.textMuted}`}>
                                                {item.quantity}x
                                            </span>
                                            <div>
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${theme.textPrimary}`}>
                                                        {item.name}
                                                        <span className={`ml-1 text-[10px] ${theme.textMuted} font-medium`}>
                                                            ({(item.taxPercent !== undefined && item.taxPercent !== null) ? item.taxPercent : (settings?.defaultTaxPercent || 0)}%)
                                                        </span>
                                                    </span>
                                                    {item.selectedVariant && (
                                                        <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider">{item.selectedVariant.name}</span>
                                                    )}
                                                </div>
                                                {item.selectedExtras?.length > 0 && (
                                                    <div className={`text-xs ${theme.textMuted}`}>+ Extras</div>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`font-medium ${theme.textPrimary}`}>
                                            {formatCurrency(calculateItemTotal(item))}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Coupon Code Section */}
                            {(hasPermissionFor?.("pos", "order", "apply_discount") || (hasPermission && hasPermission("APPLY_DISCOUNTS"))) && (
                                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-orange-900 text-sm flex items-center gap-2">
                                            <Tag size={16} /> Apply Coupon
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
                                            className="flex-1 p-2 rounded-xl border border-orange-200 outline-none uppercase font-bold text-sm"
                                        />
                                        <button
                                            onClick={applyCoupon}
                                            className="bg-orange-500 text-white px-4 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                    {couponStatus && (
                                        <p
                                            className={`text-xs font-bold ${couponStatus.type === "success"
                                                ? "text-green-600"
                                                : "text-red-500"
                                                }`}
                                        >
                                            {couponStatus.msg}
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {billingStage === "payment" && (
                        <div className="space-y-6">
                            {/* --- COMBINED PAYMENT UI --- */}
                            {selectedPayments.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>Added Payments</span>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black ${remainingBalance > 0 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                                            {remainingBalance > 0 ? `Unpaid: ${formatCurrency(remainingBalance)}` : "Fully Covered"}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {selectedPayments.map((p, idx) => (
                                            <div key={idx} className={`p-4 rounded-3xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm relative group`}>
                                                <button 
                                                    onClick={() => removePaymentMethod(idx)}
                                                    className="absolute -top-2 -right-2 p-1.5 bg-red-50 text-red-500 rounded-full border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                >
                                                    <X size={12} />
                                                </button>
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-2xl ${p.method.color}`}>
                                                        <p.method.icon size={20} />
                                                    </div>
                                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-gray-400 tracking-widest uppercase">{p.method.label} Amount</label>
                                                            <input
                                                                type="number"
                                                                value={p.amount}
                                                                onChange={(e) => updatePaymentAmount(idx, e.target.value)}
                                                                className={`w-full p-2 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-400 outline-none font-black text-lg text-indigo-600`}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-gray-400 tracking-widest uppercase">Ref. (Optional)</label>
                                                            <input
                                                                placeholder="Txn ID..."
                                                                value={p.ref}
                                                                onChange={(e) => updatePaymentRef(idx, e.target.value)}
                                                                className={`w-full p-2 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-400 outline-none font-bold text-sm`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {remainingBalance > 0 && (
                                            <div className="pt-2 border-t border-dashed border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase text-center">Add another method for the remaining {formatCurrency(remainingBalance)}</p>
                                                <div className="flex justify-center gap-3">
                                                    {PAYMENT_METHODS.map((m) => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => addPaymentMethod(m)}
                                                            className={`p-3 rounded-2xl border ${theme.borderLight} hover:border-indigo-200 hover:bg-white transition-all flex items-center gap-2 group`}
                                                        >
                                                            <m.icon size={16} className={m.color.split(' ')[0]} />
                                                            <span className="text-xs font-black text-gray-500 group-hover:text-indigo-600 uppercase tracking-tight">{m.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedPayments.length === 0 && (
                                <div className="grid grid-cols-2 gap-4">
                                    {PAYMENT_METHODS.map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => addPaymentMethod(method)}
                                            className={`p-6 rounded-3xl border-2 border-transparent hover:border-indigo-100 hover:shadow-lg transition-all flex flex-col items-center gap-3 ${method.color}`}
                                        >
                                            <method.icon size={32} />
                                            <span className="font-bold text-lg">{method.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* --- CREDIT / CUSTOMER VALIDATION --- */}
                            {selectedPayments.length > 0 && (
                                <div className="space-y-4">
                                    {remainingBalance > 0 && (
                                        <div className="space-y-4">
                                            <div className={`p-4 rounded-2xl border ${(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ? "bg-orange-50 border-orange-100" : "bg-red-50 border-red-100"}`}>
                                                {!(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ? (
                                                    <p className="text-xs font-bold text-red-500">
                                                        Credit payments are disabled. Please enter the full amount.
                                                    </p>
                                                ) : !(billDetails.customerId || existingCustomerId) ? (
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold text-orange-600">
                                                            Customer information is required for credit/partial payments.
                                                        </p>
                                                        <div className="space-y-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase font-black text-orange-400 flex justify-between items-center">
                                                                    <span>Phone *</span>
                                                                    {isSearchingCustomer && <span className="text-[8px] italic animate-pulse">Searching...</span>}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={localCustPhone}
                                                                    onChange={(e) => setLocalCustPhone(e.target.value)}
                                                                    placeholder="Search by Number"
                                                                    className="w-full p-3 rounded-xl border border-orange-200 outline-none focus:ring-2 focus:ring-orange-400 font-bold"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase font-black text-orange-400">Cust. Name *</label>
                                                                <input
                                                                    type="text"
                                                                    value={localCustName}
                                                                    onChange={(e) => setLocalCustName(e.target.value)}
                                                                    placeholder="Enter Name"
                                                                    className="w-full p-3 rounded-xl border border-orange-200 outline-none focus:ring-2 focus:ring-orange-400 font-bold"
                                                                />
                                                                {searchPerformed && noCustomerFound && !isSearchingCustomer && (
                                                                    <p className="text-[10px] text-orange-600 font-bold mt-1 italic">
                                                                        No customer found for this number. Please enter name to create new.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {localCustName?.trim() && localCustPhone?.trim() && (
                                                            <p className="text-xs font-bold text-orange-600 mt-2">
                                                                Remaining {formatCurrency(remainingBalance)} will be kept as customer credit.
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-bold text-orange-600">
                                                        Remaining {formatCurrency(remainingBalance)} will be kept as customer credit.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

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

                                            // Update taking parent context right before finalizing
                                            setCustName(localCustName);
                                            setCustPhone(localCustPhone);

                                            // Call onFinalize with the first payment method as fallback but pass full payments array if possible
                                            // The backend now supports "payments" array
                                            onFinalizePayment(
                                                selectedPayments[0].method.id, 
                                                billDetails, 
                                                totalPaidAmount, 
                                                localCustName, 
                                                localCustPhone,
                                                paymentsPayload // Pass entire payload
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
                                        className={`w-full py-4 rounded-2xl text-white font-black text-lg transition-all flex items-center justify-center gap-2 ${remainingBalance <= 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                    >
                                        <CheckCircle2 size={20} />
                                        {remainingBalance > 0 ? "Confirm Partial Payment" : "Confirm & Complete"}
                                    </button>
                                    
                                    <button
                                        onClick={() => setSelectedPayments([])}
                                        className={`w-full py-4 ${theme.surfaceBg} ${theme.textMuted} border ${theme.borderLight} rounded-2xl font-bold hover:${theme.pageBg} transition-all`}
                                    >
                                        Back to Methods
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bill Summary */}
                    <div className={`${theme.pageBg} p-6 rounded-3xl space-y-2`}>
                        <div className={`flex justify-between ${theme.textMuted} text-sm`}>
                            <span>Subtotal</span>
                            <span className={theme.textPrimary}>{formatCurrency(billDetails.subtotal)}</span>
                        </div>
                        {billDetails.appliedOffers && billDetails.appliedOffers.length > 0 && (
                            <div className="space-y-1 py-2">
                                <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Applied Offers</div>
                                {billDetails.appliedOffers.map((offer, oIdx) => (
                                    <div key={oIdx} className="flex justify-between items-center text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-xl">
                                        <span>{offer.name}</span>
                                        <span>-{formatCurrency(offer.discount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {billDetails.discountAmount > 0 && (
                            <div className="flex justify-between text-green-600 text-sm font-bold">
                                <span>Coupon Discount</span>
                                <span>-{formatCurrency(billDetails.discountAmount)}</span>
                            </div>
                        )}
                        <div className={`flex justify-between ${theme.textMuted} text-sm`}>
                            <span>Tax</span>
                            <span className={theme.textPrimary}>{formatCurrency(billDetails.taxAmount)}</span>
                        </div>
                        
                        {billDetails.taxBreakdown && (billDetails.taxBreakdown.cgst > 0 || billDetails.taxBreakdown.sgst > 0) && (
                            <div className="pl-4 space-y-1">
                                <div className={`flex justify-between ${theme.textMuted} text-[10px] uppercase font-bold`}>
                                    <span>CGST</span>
                                    <span>{formatCurrency(billDetails.taxBreakdown.cgst)}</span>
                                </div>
                                <div className={`flex justify-between ${theme.textMuted} text-[10px] uppercase font-bold`}>
                                    <span>SGST</span>
                                    <span>{formatCurrency(billDetails.taxBreakdown.sgst)}</span>
                                </div>
                            </div>
                        )}
                        {billDetails.taxBreakdown && billDetails.taxBreakdown.igst > 0 && (
                            <div className="pl-4">
                                <div className={`flex justify-between ${theme.textMuted} text-[10px] uppercase font-bold`}>
                                    <span>IGST</span>
                                    <span>{formatCurrency(billDetails.taxBreakdown.igst)}</span>
                                </div>
                            </div>
                        )}
                        {billDetails.roundOff !== 0 && (
                            <div className={`flex justify-between ${theme.textMuted} text-xs italic`}>
                                <span>Round Off</span>
                                <span>{formatCurrency(billDetails.roundOff)}</span>
                            </div>
                        )}
                        {exchangeCredit > 0 && (
                            <div className="flex justify-between text-orange-600 text-sm font-black border-t border-dashed mt-2 pt-2">
                                <span>Exchange Credit</span>
                                <span>-{formatCurrency(exchangeCredit)}</span>
                            </div>
                        )}
                        <div className={`flex justify-between text-2xl font-black ${theme.textHeading} pt-4 border-t ${theme.borderLight} mt-2`}>
                            <span>Total Pay</span>
                            <span>{formatCurrency(billDetails.finalTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={`p-6 border-t ${theme.borderLight} ${theme.pageBg}`}>
                    {billingStage === "review" ? (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onPrintBill?.(printFormat)}
                                className="w-full py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-100 flex items-center justify-center gap-2"
                            >
                                <Receipt size={18} />
                                <span className="flex flex-col items-start leading-tight">
                                    <span>Print Bill</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {printFormat === "a4" ? "A4 Invoice" : "Thermal"}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setBillingStage("payment");
                                    setSelectedPayments([]);
                                }}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-indigo-700 flex justify-between px-6 items-center"
                            >
                                <span>Proceed to Pay</span>
                                <span className="bg-indigo-500 px-3 py-1 rounded-lg text-sm">
                                    {formatCurrency(billDetails.finalTotal)}
                                </span>
                            </button>
                            <div className="col-span-2">
                                <div className={`flex items-center justify-between ${theme.surfaceBg} border ${theme.borderLight} rounded-2xl px-4 py-3`}>
                                    <span className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>
                                        Print format
                                    </span>
                                    <select
                                        value={printFormat}
                                        onChange={(e) => setPrintFormat(e.target.value)}
                                        className={`text-sm font-bold px-3 py-2 rounded-xl border ${theme.borderLight} ${theme.pageBg} ${theme.textPrimary} outline-none`}
                                    >
                                        <option value="thermal">Thermal (Default)</option>
                                        <option value="a4">A4 Invoice</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : selectedPayments.length === 0 && (
                        <button
                            onClick={() => {
                                setBillingStage("review");
                                setSelectedPayments([]);
                            }}
                            className={`w-full py-4 ${theme.surfaceBg} ${theme.textMuted} border-2 ${theme.borderLight} rounded-2xl font-bold hover:${theme.pageBg}`}
                        >
                            Back to Review
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
