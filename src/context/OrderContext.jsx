import React, { createContext, useContext, useState } from "react";
import { formatCurrency } from "../utils/format";

const OrderContext = createContext();

export const useOrder = () => useContext(OrderContext);

const COUPONS = [
    { code: "SAVE10", type: "percent", value: 10, description: "10% Off" },
    { code: "FLAT100", type: "flat", value: 100, description: "Flat ₹100 Off" },
    {
        code: "FESTIVE20",
        type: "percent",
        value: 20,
        description: "Festive Season Offer",
    },
];

export const OrderProvider = ({ children }) => {
    // Billing Flow State
    const [billingStage, setBillingStage] = useState("review"); // 'review' | 'payment'
    const [billDiscount, setBillDiscount] = useState({ type: "flat", value: 0 });
    const [isAutoRoundOff, setIsAutoRoundOff] = useState(true);

    // Coupon State
    const [couponCode, setCouponCode] = useState("");
    const [couponStatus, setCouponStatus] = useState(null);

    // Helpers
    const calculateItemTotal = (item) => {
        let basePrice = item.price;
        if (item.selectedVariant) {
            basePrice = item.selectedVariant.price;
        } else if (item.sellingType === "Weight") {
            basePrice = item.pricePerUnit;
        }
        const itemBaseCost = basePrice * item.quantity;
        const extrasCost = (item.selectedExtras || []).reduce(
            (acc, e) => acc + e.price * e.quantity,
            0
        );
        return itemBaseCost + extrasCost;
    };

    const calculateBillDetails = (
        orderItems,
        discount = { type: "flat", value: 0 },
        taxPercent = 5,
        autoRound = true
    ) => {
        if (!orderItems || orderItems.length === 0)
            return {
                subtotal: 0,
                discountAmount: 0,
                taxableAmount: 0,
                taxAmount: 0,
                total: 0,
                roundOff: 0,
                finalTotal: 0,
            };

        const subtotal = orderItems.reduce(
            (acc, i) => acc + calculateItemTotal(i),
            0
        );

        let discountAmount = 0;
        if (discount.type === "flat") {
            discountAmount = discount.value;
        } else {
            discountAmount = (subtotal * discount.value) / 100;
        }
        // Cap discount at subtotal
        if (discountAmount > subtotal) discountAmount = subtotal;

        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * taxPercent) / 100;
        const total = taxableAmount + taxAmount;

        let roundOff = 0;
        let finalTotal = total;

        if (autoRound) {
            finalTotal = Math.round(total);
            roundOff = finalTotal - total;
        }

        return {
            subtotal,
            discountAmount,
            taxableAmount,
            taxAmount,
            total,
            roundOff,
            finalTotal,
        };
    };

    const calculateTotal = (order) => {
        if (!order || !order.items) return 0;
        const details = calculateBillDetails(
            order.items,
            { type: "flat", value: 0 },
            5,
            false
        );
        return details.total;
    };

    const applyCoupon = () => {
        if (!couponCode.trim()) {
            setCouponStatus(null);
            return;
        }
        const coupon = COUPONS.find((c) => c.code === couponCode.toUpperCase());
        if (coupon) {
            setBillDiscount({ type: coupon.type, value: coupon.value });
            setCouponStatus({
                type: "success",
                msg: `${coupon.description} Applied!`,
            });
        } else {
            setCouponStatus({ type: "error", msg: "Invalid Coupon" });
            setBillDiscount({ type: "flat", value: 0 });
        }
    };

    const resetBillingState = () => {
        setBillingStage("review");
        setBillDiscount({ type: "flat", value: 0 });
        setCouponCode("");
        setCouponStatus(null);
    };

    return (
        <OrderContext.Provider
            value={{
                billingStage,
                setBillingStage,
                billDiscount,
                setBillDiscount,
                isAutoRoundOff,
                setIsAutoRoundOff,
                couponCode,
                setCouponCode,
                couponStatus,
                setCouponStatus,
                calculateItemTotal,
                calculateBillDetails,
                calculateTotal,
                applyCoupon,
                COUPONS,
                resetBillingState
            }}
        >
            {children}
        </OrderContext.Provider>
    );
};
