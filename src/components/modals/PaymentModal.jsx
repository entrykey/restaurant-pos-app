import React, { useState, useEffect } from "react";
import { X, Tag, CreditCard, Banknote, Smartphone, Receipt, CheckCircle2, ChevronLeft } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { useOrder } from "../../context/OrderContext";
import { customerService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

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

    const [selectedMethod, setSelectedMethod] = useState(null);
    const [cashGiven, setCashGiven] = useState("");
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
        }
    }, [isOpen, custName, custPhone]);

    useEffect(() => {
        const searchCustomer = async () => {
            if (localCustPhone && localCustPhone.length >= 4) {
                setIsSearchingCustomer(true);
                setSearchPerformed(true);
                try {
                    const customers = await customerService.getCustomers({ search: localCustPhone });
                    if (customers && customers.length > 0) {
                        // Find an exact match or just use the first close match
                        const match = customers.find(c => c.phone === localCustPhone) || customers[0];
                        if (match) {
                            setLocalCustName(match.name);
                            setNoCustomerFound(false);
                        } else {
                            setNoCustomerFound(true);
                        }
                    } else {
                        setNoCustomerFound(true);
                    }
                } catch (error) {
                    console.error("Error searching customes:", error);
                    setNoCustomerFound(true);
                } finally {
                    setIsSearchingCustomer(false);
                }
            } else {
                setSearchPerformed(false);
                setNoCustomerFound(false);
            }
        };

        const timeoutId = setTimeout(searchCustomer, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [localCustPhone]);


    if (!isOpen) return null;

    // Calculate bill details
    const billDetails = calculateBillDetails(
        orderItems,
        billDiscount,
        settings?.defaultTaxPercent || 5,
        isAutoRoundOff
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className={`${theme.surfaceBg} w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className={`p-6 ${theme.pageBg} border-b ${theme.borderLight} flex justify-between items-center`}>
                    <div>
                        <h3 className={`text-2xl font-black ${theme.textHeading}`}>
                            {selectedMethod ? "Confirm Payment" : (billingStage === "review" ? "Review Bill" : "Payment Method")}
                        </h3>
                        <p className={`text-sm ${theme.textMuted}`}>
                            {isTakeaway ? "Takeaway" : (tableName ? `Table ${tableName}` : `Table ${activeTableId}`)}
                        </p>
                    </div>
                    {selectedMethod ? (
                        <button
                            onClick={() => {
                                setSelectedMethod(null);
                                setCashGiven("");
                            }}
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
                            {!selectedMethod ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: "cash", label: "Cash", icon: Banknote, color: "text-green-600 bg-green-50" },
                                        { id: "card", label: "Card", icon: CreditCard, color: "text-blue-600 bg-blue-50" },
                                        { id: "upi", label: "UPI", icon: Smartphone, color: "text-orange-600 bg-orange-50" },
                                        { id: "other", label: "Other", icon: Receipt, color: "text-gray-600 bg-gray-100" },
                                    ].map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedMethod(method)}
                                            className={`p-6 rounded-3xl border-2 border-transparent hover:border-indigo-100 hover:shadow-lg transition-all flex flex-col items-center gap-3 ${method.color}`}
                                        >
                                            <method.icon size={32} />
                                            <span className="font-bold text-lg">{method.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-indigo-50 p-8 rounded-[32px] border border-indigo-100 flex flex-col items-center text-center space-y-4">
                                    <div className={`p-4 rounded-full bg-white shadow-sm text-indigo-600`}>
                                        <selectedMethod.icon size={48} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-gray-800">Confirm {selectedMethod.label} Payment</h4>
                                        <p className="text-sm text-gray-500 mt-1">Are you sure you want to finalize the order with this payment method?</p>
                                    </div>
                                    <div className="w-full pt-4 space-y-3">
                                        <div className="flex flex-col gap-2 w-full text-left">
                                            <label className={`text-sm font-bold ${theme.textSecondary}`}>
                                                {selectedMethod.id === 'cash' ? "Cash Given Amount" : "Paid Amount"}
                                            </label>
                                            <input
                                                type="number"
                                                value={cashGiven}
                                                onChange={(e) => setCashGiven(e.target.value)}
                                                className={`w-full p-4 rounded-2xl border ${theme.borderLight} outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${theme.inputBg} ${theme.textPrimary} text-lg`}
                                                placeholder={selectedMethod.id === 'cash' ? "Enter cash given" : "Enter amount paid"}
                                            />
                                            {selectedMethod.id === 'cash' && cashGiven && Number(cashGiven) >= billDetails.finalTotal && (
                                                <div className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100 mt-2">
                                                    <span className="text-sm font-bold text-green-700">Balance to return:</span>
                                                    <span className="text-xl font-black text-green-800">
                                                        {formatCurrency(Number(cashGiven) - billDetails.finalTotal)}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Credit Validation Note */}
                                            {cashGiven && Number(cashGiven) < billDetails.finalTotal && (
                                                <div className="space-y-4 mt-2">
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
                                                                        Remaining {formatCurrency(billDetails.finalTotal - Number(cashGiven))} will be kept as customer credit.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs font-bold text-orange-600">
                                                                Remaining {formatCurrency(billDetails.finalTotal - Number(cashGiven))} will be kept as customer credit.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                // Validate Customer details on credit/partial payment
                                                if (selectedMethod.id === 'cash' && cashGiven && Number(cashGiven) < billDetails.finalTotal) {
                                                    if (!localCustName.trim() || !localCustPhone.trim()) {
                                                        // Fallback logic check if customerId or activeTableId makes this unnecessary
                                                        if (!billDetails.customerId && !existingCustomerId) {
                                                            alert("Customer Name and Phone are required for partial/credit payments.");
                                                            return;
                                                        }
                                                    }
                                                }

                                                // Update taking parent context right before finalizing
                                                setCustName(localCustName);
                                                setCustPhone(localCustPhone);

                                                onFinalizePayment(selectedMethod.id, billDetails, Number(cashGiven), localCustName, localCustPhone);
                                            }}
                                            disabled={
                                                !cashGiven ||
                                                (Number(cashGiven) < billDetails.finalTotal && (
                                                    !(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ||
                                                    (!billDetails.customerId && !localCustName?.trim() && !existingCustomerId) ||
                                                    (!billDetails.customerId && !localCustPhone?.trim() && !existingCustomerId)
                                                ))
                                            }
                                            className={`w-full py-4 rounded-2xl text-white font-black text-lg transition-all flex items-center justify-center gap-2 ${cashGiven && Number(cashGiven) >= billDetails.finalTotal ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                        >
                                            <CheckCircle2 size={20} />
                                            {cashGiven && Number(cashGiven) < billDetails.finalTotal ? "Confirm Partial Payment" : "Confirm & Complete"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedMethod(null);
                                                setCashGiven("");
                                            }}
                                            className={`w-full py-4 ${theme.surfaceBg} ${theme.textMuted} border ${theme.borderLight} rounded-2xl font-bold hover:${theme.pageBg} transition-all`}
                                        >
                                            Change Method
                                        </button>
                                    </div>
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
                        {billDetails.roundOff !== 0 && (
                            <div className={`flex justify-between ${theme.textMuted} text-xs italic`}>
                                <span>Round Off</span>
                                <span>{formatCurrency(billDetails.roundOff)}</span>
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
                                    setSelectedMethod(null);
                                    setCashGiven("");
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
                    ) : !selectedMethod && (
                        <button
                            onClick={() => {
                                setBillingStage("review");
                                setSelectedMethod(null);
                                setCashGiven("");
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
