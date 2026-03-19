import React, { createContext, useContext, useState, useEffect } from "react";
import { formatCurrency } from "../utils/format";
import { offerService } from "../services/api";

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

    // Offers State
    const [offers, setOffers] = useState([]);
    const [appliedOffers, setAppliedOffers] = useState([]);

    // Helpers
    const calculateItemTotal = (item) => {
        let basePrice = item.sellingPrice || item.price || 0;
        if (item.selectedVariant) {
            basePrice = item.selectedVariant.price;
        } else if (item.sellingType === "Weight") {
            basePrice = item.pricePerUnit || item.sellingPrice || item.price || 0;
        }
        const itemBaseCost = basePrice * item.quantity;
        const extrasCost = (item.selectedExtras || []).reduce(
            (acc, e) => acc + e.price * e.quantity,
            0
        );
        return itemBaseCost + extrasCost;
    };

    const fetchActiveOffers = async (shopId, branchId) => {
        try {
            const data = await offerService.getOffers({ shopId, branchId, isActive: true });
            setOffers(data || []);
        } catch (error) {
            console.error("Failed to fetch offers:", error);
        }
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
                offerDiscountTotal: 0,
                appliedOffers: [],
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

        // --- Start Offer Calculation ---
        let offerDiscountTotal = 0;
        const currentAppliedOffers = [];

        if (offers.length > 0) {
            offers.forEach(offer => {
                const condition = offer.condition;
                const reward = offer.reward;
                if (!condition || !reward) return;

                let isApplicable = false;
                let potentialDiscount = 0;

                if (condition.applyOn === "ITEM") {
                    const matchingItems = orderItems.filter(i => condition.itemIds.includes(i.id || i._id));
                    const totalQty = matchingItems.reduce((acc, i) => acc + i.quantity, 0);

                    if (totalQty >= (condition.minQuantity || 1)) {
                        isApplicable = true;
                        const itemsAmount = matchingItems.reduce((acc, i) => acc + calculateItemTotal(i), 0);

                        if (reward.rewardType === "PERCENT_DISCOUNT") {
                            potentialDiscount = (itemsAmount * reward.discountPercent) / 100;
                        } else if (reward.rewardType === "FLAT_DISCOUNT") {
                            potentialDiscount = reward.discountAmount;
                        }
                    }
                } else if (condition.applyOn === "CATEGORY") {
                    const matchingItems = orderItems.filter(i => condition.categoryIds.includes(i.categoryId || i.category_id));
                    const totalQty = matchingItems.reduce((acc, i) => acc + i.quantity, 0);

                    if (totalQty >= (condition.minQuantity || 1)) {
                        isApplicable = true;
                        const itemsAmount = matchingItems.reduce((acc, i) => acc + calculateItemTotal(i), 0);

                        if (reward.rewardType === "PERCENT_DISCOUNT") {
                            potentialDiscount = (itemsAmount * reward.discountPercent) / 100;
                        } else if (reward.rewardType === "FLAT_DISCOUNT") {
                            potentialDiscount = reward.discountAmount;
                        }
                    }
                } else if (condition.applyOn === "BILL") {
                    if (subtotal >= (condition.minBillAmount || 0)) {
                        isApplicable = true;
                        if (reward.rewardType === "PERCENT_DISCOUNT") {
                            potentialDiscount = (subtotal * reward.discountPercent) / 100;
                        } else if (reward.rewardType === "FLAT_DISCOUNT") {
                            potentialDiscount = reward.discountAmount;
                        }
                    }
                }

                if (isApplicable && potentialDiscount > 0) {
                    offerDiscountTotal += potentialDiscount;
                    currentAppliedOffers.push({
                        name: offer.name,
                        discount: potentialDiscount
                    });
                }
            });
        }
        // --- End Offer Calculation ---

        let discountAmount = 0;
        if (discount.type === "flat") {
            discountAmount = discount.value;
        } else {
            discountAmount = (subtotal * discount.value) / 100;
        }

        // Total discount = Manual/Coupon Discount + Offer Discount
        const totalDiscount = discountAmount + offerDiscountTotal;

        // Cap discount at subtotal
        let finalDiscount = totalDiscount;
        if (finalDiscount > subtotal) finalDiscount = subtotal;

        const taxableAmount = subtotal - finalDiscount;

        // If items carry their own taxPercent, compute tax per line.
        // Otherwise fall back to the global taxPercent argument.
        const taxAmount = orderItems.reduce((acc, item) => {
            const lineTotal = calculateItemTotal(item);
            const lineRate = (item.taxPercent !== undefined && item.taxPercent !== null)
                ? Number(item.taxPercent)
                : taxPercent;
            return acc + (lineTotal * lineRate) / 100;
        }, 0);
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
            offerDiscountTotal,
            appliedOffers: currentAppliedOffers,
            taxableAmount,
            taxAmount,
            total,
            roundOff,
            finalTotal,
        };
    };

    const calculateTotal = (order, defaultTax = 0) => {
        if (!order || !order.items) return 0;
        const details = calculateBillDetails(
            order.items,
            { type: "flat", value: 0 },
            defaultTax,
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
                fetchActiveOffers,
                offers,
                COUPONS,
                resetBillingState
            }}
        >
            {children}
        </OrderContext.Provider>
    );
};
