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
    
    // Exchange Flow State (Generalized for all modes)
    const [isExchange, setIsExchange] = useState(false);
    const [exchangeCredit, setExchangeCredit] = useState(0);
    const [originalOrderId, setOriginalOrderId] = useState(null);
    const [returnedItems, setReturnedItems] = useState([]);

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
        return parseFloat((itemBaseCost + extrasCost).toFixed(4));
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
        autoRound = true,
        exchangeCredit = 0,
        branchStateCode = null,
        customerStateCode = null
    ) => {
        if (!orderItems || orderItems.length === 0)
            return {
                subtotal: 0,
                discountAmount: 0,
                offerDiscountTotal: 0,
                appliedOffers: [],
                taxableAmount: 0,
                taxAmount: 0,
                taxBreakdown: { cgst: 0, sgst: 0, igst: 0 },
                total: 0,
                roundOff: 0,
                finalTotal: 0,
                exchangeCredit: exchangeCredit
            };

        const getBaseLineTotal = (i) => {
            const lineTotal = calculateItemTotal(i);
            const rate = (i.taxPercent !== undefined && i.taxPercent !== null) ? Number(i.taxPercent) : taxPercent;
            const isExclusive = i.isExclusiveTax !== undefined ? i.isExclusiveTax : false;
            return isExclusive ? lineTotal : lineTotal / (1 + rate / 100);
        };

        const subtotal = parseFloat(orderItems.reduce(
            (acc, i) => acc + getBaseLineTotal(i),
            0
        ).toFixed(4));

        // ... existing offer logic ...
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
                        const itemsAmount = matchingItems.reduce((acc, i) => acc + getBaseLineTotal(i), 0);

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
                        const itemsAmount = matchingItems.reduce((acc, i) => acc + getBaseLineTotal(i), 0);

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

        let discountAmount = 0;
        if (discount.type === "flat") {
            discountAmount = discount.value;
        } else {
            discountAmount = parseFloat(((subtotal * discount.value) / 100).toFixed(4));
        }

        const totalDiscount = discountAmount + offerDiscountTotal;
        let finalDiscount = totalDiscount;
        if (finalDiscount > subtotal) finalDiscount = subtotal;

        const taxableAmount = subtotal - finalDiscount;

        // GST Logic: Compare states
        const isIntraState = !branchStateCode || !customerStateCode || branchStateCode === customerStateCode;

        const taxBreakdown = { cgst: 0, sgst: 0, igst: 0 };

        const totalTaxAmount = parseFloat(orderItems.reduce((acc, item) => {
            const lineTotal = calculateItemTotal(item);
            const lineRate = (item.taxPercent !== undefined && item.taxPercent !== null)
                ? Number(item.taxPercent)
                : taxPercent;
            const isExclusive = item.isExclusiveTax !== undefined ? item.isExclusiveTax : false;

            let itemTax = 0;
            if (isExclusive) {
                itemTax = (lineTotal * lineRate) / 100;
            } else {
                const baseLine = lineTotal / (1 + lineRate / 100);
                itemTax = (lineTotal - baseLine);
            }

            // Split tax based on components if taxSystem is GST
            if (item.taxSystem === 'GST' || true) { 
                if (isIntraState) {
                    const cgstRate = item.components?.cgst;
                    const sgstRate = item.components?.sgst;
                    
                    if (cgstRate !== undefined && sgstRate !== undefined && (cgstRate + sgstRate) > 0) {
                        const totalCompRate = cgstRate + sgstRate;
                        taxBreakdown.cgst += parseFloat(((itemTax * cgstRate) / totalCompRate).toFixed(4));
                        taxBreakdown.sgst += parseFloat(((itemTax * sgstRate) / totalCompRate).toFixed(4));
                    } else {
                        taxBreakdown.cgst += parseFloat((itemTax / 2).toFixed(4));
                        taxBreakdown.sgst += parseFloat((itemTax / 2).toFixed(4));
                    }
                } else {
                    taxBreakdown.igst += parseFloat(itemTax.toFixed(4));
                }
            }

            return acc + itemTax;
        }, 0).toFixed(4));

        // Deduct exchange credit from total
        const totalBeforeCredit = parseFloat((taxableAmount + totalTaxAmount).toFixed(4));
        const total = parseFloat((totalBeforeCredit - exchangeCredit).toFixed(4));

        let roundOff = 0;
        let finalTotal = total;

        if (autoRound) {
            finalTotal = Math.round(total);
            roundOff = parseFloat((finalTotal - total).toFixed(4));
        }

        return {
            subtotal,
            discountAmount,
            offerDiscountTotal,
            appliedOffers: currentAppliedOffers,
            taxableAmount,
            taxAmount: totalTaxAmount,
            taxBreakdown,
            total,
            roundOff,
            finalTotal,
            exchangeCredit
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

    const resetExchange = () => {
        setIsExchange(false);
        setExchangeCredit(0);
        setOriginalOrderId(null);
        setReturnedItems([]);
    };

    const resetBillingState = () => {
        setBillingStage("review");
        setBillDiscount({ type: "flat", value: 0 });
        setCouponCode("");
        setCouponStatus(null);
        setAppliedOffers([]);
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
                resetBillingState,
                // Exchange states
                isExchange,
                setIsExchange,
                exchangeCredit,
                setExchangeCredit,
                originalOrderId,
                setOriginalOrderId,
                returnedItems,
                setReturnedItems,
                resetExchange
            }}
        >
            {children}
        </OrderContext.Provider>
    );
};
