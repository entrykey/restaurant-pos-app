import React from "react";
import { X, Tag, CreditCard, Banknote, Smartphone, Receipt, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { useOrder } from "../../context/OrderContext";

const PaymentModal = ({
    isOpen,
    onClose,
    isTakeaway,
    activeTableId,
    orderItems,
    settings,
    onFinalizePayment,
    hasPermission,
    hasPermissionFor,
}) => {
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
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-gray-800">
                            {billingStage === "review" ? "Review Bill" : "Payment"}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {isTakeaway ? "Takeaway" : `Table ${activeTableId}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white rounded-full shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {billingStage === "review" && (
                        <>
                            {/* Item List Compact */}
                            <div className="space-y-3">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    Items
                                </p>
                                {orderItems.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex justify-between items-start text-sm border-b border-dashed pb-2 last:border-0"
                                    >
                                        <div className="flex gap-3">
                                            <span className="font-bold text-gray-500">
                                                {item.quantity}x
                                            </span>
                                            <div>
                                                <span className="font-bold text-gray-800">{item.name}</span>
                                                {item.selectedExtras?.length > 0 && (
                                                    <div className="text-xs text-gray-400">+ Extras</div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-medium">
                                            {formatCurrency(calculateItemTotal(item))}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Coupon Code Section */}
                            {(hasPermissionFor?.( "pos", "order", "apply_discount") || (hasPermission && hasPermission("APPLY_DISCOUNTS"))) && (
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
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: "cash", label: "Cash", icon: Banknote, color: "text-green-600 bg-green-50" },
                                { id: "card", label: "Card", icon: CreditCard, color: "text-blue-600 bg-blue-50" },
                                { id: "upi", label: "UPI", icon: Smartphone, color: "text-orange-600 bg-orange-50" },
                                { id: "other", label: "Other", icon: Receipt, color: "text-gray-600 bg-gray-100" },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => onFinalizePayment(method.id, billDetails)}
                                    className={`p-6 rounded-3xl border-2 border-transparent hover:border-indigo-100 hover:shadow-lg transition-all flex flex-col items-center gap-3 ${method.color}`}
                                >
                                    <method.icon size={32} />
                                    <span className="font-bold text-lg">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Bill Summary */}
                    <div className="bg-gray-50 p-6 rounded-3xl space-y-2">
                        <div className="flex justify-between text-gray-500 text-sm">
                            <span>Subtotal</span>
                            <span>{formatCurrency(billDetails.subtotal)}</span>
                        </div>
                        {billDetails.discountAmount > 0 && (
                            <div className="flex justify-between text-green-600 text-sm font-bold">
                                <span>Discount</span>
                                <span>-{formatCurrency(billDetails.discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-500 text-sm">
                            <span>Tax ({settings.defaultTaxPercent}%)</span>
                            <span>{formatCurrency(billDetails.taxAmount)}</span>
                        </div>
                        {billDetails.roundOff !== 0 && (
                            <div className="flex justify-between text-gray-400 text-xs italic">
                                <span>Round Off</span>
                                <span>{formatCurrency(billDetails.roundOff)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-2xl font-black text-indigo-900 pt-4 border-t border-gray-200 mt-2">
                            <span>Total Pay</span>
                            <span>{formatCurrency(billDetails.finalTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-gray-50">
                    {billingStage === "review" ? (
                        <button
                            onClick={() => setBillingStage("payment")}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-indigo-700 flex justify-between px-8 items-center"
                        >
                            <span>Proceed to Pay</span>
                            <span className="bg-indigo-500 px-3 py-1 rounded-lg text-sm">
                                {formatCurrency(billDetails.finalTotal)}
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setBillingStage("review")}
                            className="w-full py-4 bg-white text-gray-500 border-2 border-gray-200 rounded-2xl font-bold hover:bg-gray-100"
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
