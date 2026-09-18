import React, { useState, useEffect, useMemo } from "react";
import {
    ArrowLeft,
    Search,
    Plus,
    Minus,
    Printer,
    Coins,
    CreditCard,
    Smartphone,
    ReceiptText,
    User,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    X,
    Loader2,
    UserPlus,
    UserCheck,
    Gift,
    Tag,
    Award
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { useOrder } from "../../context/OrderContext";
import { useTakeaway } from "../../pages/Takeaway/TakeawayContext";
import { customerService, orderService, loyaltyService } from "../../services/api";
import { sanitizePhoneInput, normalizePhoneNumber } from "../../utils/validation";
import { getBingImage, DEFAULT_ITEM_IMAGE } from "../../utils/getImage";
import { toast } from "react-hot-toast";

const InlineReviewBill = ({
    onBack,
    isTakeaway,
    activeTableId,
    tableName,
    orderItems = [],
    settings,
    onFinalizePayment,
    onPrintBill,
    hasPermission = () => true,
    hasPermissionFor = () => false,
    takeawayCustName = "",
    setTakeawayCustName = () => {},
    takeawayCustPhone = "",
    setTakeawayCustPhone = () => {},
    updateItemQuantity,
    removeItemFromCart,
    calculateItemTotal,
    calculateBillDetails,
    formatCurrency,
    orderType = "DIRECT_SALE",
}) => {
    const { theme } = useTheme();
    const { activeBranchId, branches, organization, user, settings: appSettings } = useApp();
    const activeSettings = settings || appSettings;
    const showAiImage = activeSettings?.SHOW_AI_IMAGE_IN_SALE !== false && String(activeSettings?.SHOW_AI_IMAGE_IN_SALE).toLowerCase() !== 'false';
    const {
        isExchange, exchangeCredit, originalOrderId, returnedItems,
        couponCode, setCouponCode,
        couponStatus, setCouponStatus,
        applyCoupon, dismissOffer
    } = useOrder();

    const takeawayContext = useTakeaway();
    const {
        selectedCustomer, setSelectedCustomer,
        tabs, activeTabId, setActiveTabId,
        addNewTab, closeTab,
        billDiscount: takeawayBillDiscount, setBillDiscount: setTakeawayBillDiscount,
        loyaltyDiscount: takeawayLoyaltyDiscount, setLoyaltyDiscount: setTakeawayLoyaltyDiscount
    } = takeawayContext || {};

    const activeBillDiscount = takeawayBillDiscount || { type: "flat", value: 0 };
    const activeSetBillDiscount = setTakeawayBillDiscount || (() => {});
    const activeLoyaltyDiscountProp = takeawayLoyaltyDiscount || { points: 0, amount: 0 };

    const activeBranch = branches.find(b => b._id === activeBranchId);
    const resolvedUpiId = activeBranch?.upiId || organization?.defaultUpiId;
    const branchStateCode = activeBranch?.address?.state?.code;

    // Local Customer State
    const [localCustName, setLocalCustName] = useState(takeawayCustName || "");
    const [localCustPhone, setLocalCustPhone] = useState(takeawayCustPhone || "");
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customerSearchResult, setCustomerSearchResult] = useState(null);
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

    // Payment & Print State
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [activeMethodId, setActiveMethodId] = useState("cash"); // 'cash' | 'card' | 'upi' | 'split'
    const [cashTendered, setCashTendered] = useState("");
    const [cardRefNo, setCardRefNo] = useState("");
    const [upiRefNo, setUpiRefNo] = useState("");
    const [splitAmounts, setSplitAmounts] = useState({ cash: 0, card: 0, upi: 0 });
    const [printFormat, setPrintFormat] = useState("thermal"); // 'thermal' | 'a4'
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    
    // Collapsible Bill Breakdown (Default FALSE = Collapsed for maximum items height!)
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

    // Loyalty State
    const [customerLoyalty, setCustomerLoyalty] = useState({ points: 0, value: 0, settings: null, loading: false });
    const [appliedLoyaltyDiscount, setAppliedLoyaltyDiscount] = useState({ points: 0, amount: 0 });

    const activeCustomerObj = customerSearchResult?.customer || (selectedCustomer && typeof selectedCustomer === 'object' ? selectedCustomer : null);
    const activeCustomerId =
        (activeCustomerObj && (activeCustomerObj._id || activeCustomerObj.id)) ||
        (typeof selectedCustomer === 'string' ? selectedCustomer : null);

    const shopId = activeBranch?.shopId || user?.shopId || user?.shop_id || organization?.shopId || organization?._id;

    // Synchronize local customer name/phone with parent
    useEffect(() => {
        if (typeof setTakeawayCustName === "function") setTakeawayCustName(localCustName);
    }, [localCustName, setTakeawayCustName]);

    useEffect(() => {
        if (typeof setTakeawayCustPhone === "function") setTakeawayCustPhone(localCustPhone);
    }, [localCustPhone, setTakeawayCustPhone]);

    // Customer search effect
    useEffect(() => {
        const normPhone = normalizePhoneNumber(localCustPhone);
        const cleanName = (localCustName || "").trim();
        const searchQuery = normPhone.length >= 5 ? normPhone : (cleanName.length >= 2 ? cleanName : "");

        if (searchQuery) {
            setIsSearchingCustomer(true);
            const timer = setTimeout(async () => {
                try {
                    const res = await customerService.getCustomers({ search: searchQuery, branchId: activeBranchId });
                    const list = res?.data || res?.customers || (Array.isArray(res) ? res : []);

                    let found = null;
                    if (normPhone.length >= 5) {
                        found = list.find(c => {
                            const cPhoneNorm = normalizePhoneNumber(c.phone || c.mobile || "");
                            const rawPhone = String(c.phone || c.mobile || "").replace(/\D/g, "");
                            return (cPhoneNorm && cPhoneNorm === normPhone) ||
                                (rawPhone && rawPhone.endsWith(normPhone)) ||
                                (normPhone.length >= 10 && cPhoneNorm.endsWith(normPhone.slice(-10)));
                        });
                    }
                    if (!found && cleanName.length >= 2) {
                        found = list.find(c => String(c.name || c.customerName || "").toLowerCase().includes(cleanName.toLowerCase()));
                    }

                    if (found) {
                        const name = found.name || found.customerName || "";
                        const phone = found.phone || found.mobile || "";
                        if (name && !localCustName) setLocalCustName(name);

                        let creditDue = 0;
                        try {
                            const searchTerm = phone || name;
                            if (searchTerm) {
                                const ordersRes = await orderService.getOrders({ search: searchTerm, branchId: activeBranchId });
                                const ordersList = ordersRes?.orders || ordersRes?.data || (Array.isArray(ordersRes) ? ordersRes : []);
                                const pendingOrders = ordersList.filter(o => o.paymentStatus === 'PARTIAL' || o.paymentStatus === 'PENDING');
                                creditDue = pendingOrders.reduce((sum, o) => {
                                    const paid = Number(o.totalPaid || o.paidAmount || 0);
                                    const total = Number(o.finalTotal || o.totalAmount || o.amount || 0);
                                    return sum + Math.max(0, total - paid);
                                }, 0);
                            }
                        } catch (oErr) {
                            console.warn("Error fetching customer credit due balance:", oErr);
                        }

                        setCustomerSearchResult({ found: true, customer: found, name, phone, creditDue });
                        if (setSelectedCustomer) setSelectedCustomer(found);
                    } else {
                        setCustomerSearchResult({ found: false, searchQuery });
                    }
                } catch (err) {
                    console.error("Error searching customer:", err);
                    setCustomerSearchResult({ found: false, searchQuery });
                } finally {
                    setIsSearchingCustomer(false);
                }
            }, 350);
            return () => clearTimeout(timer);
        } else {
            setCustomerSearchResult(null);
            setIsSearchingCustomer(false);
        }
    }, [localCustPhone, localCustName, activeBranchId, setSelectedCustomer]);

    // Loyalty Points Fetch
    useEffect(() => {
        if (activeCustomerId) {
            const ptsFromObj = Number(activeCustomerObj?.loyaltyPoints ?? activeCustomerObj?.points ?? 0) || 0;
            setCustomerLoyalty(prev => ({
                ...prev,
                points: Math.max(prev.points || 0, ptsFromObj),
                value: Math.max(prev.points || 0, ptsFromObj) * (prev.settings?.redemptionValue || 1),
                loading: true
            }));

            Promise.all([
                loyaltyService.getCustomerPoints(activeCustomerId).catch(err => {
                    console.warn("Error fetching customer points:", err);
                    return null;
                }),
                shopId ? loyaltyService.getSettings(shopId).catch(err => {
                    console.warn("Error fetching loyalty settings:", err);
                    return null;
                }) : Promise.resolve(null)
            ]).then(([ptsRes, settingsRes]) => {
                const ptsFromResNum = (ptsRes?.loyaltyPoints !== undefined && ptsRes?.loyaltyPoints !== null)
                    ? Number(ptsRes.loyaltyPoints)
                    : ((ptsRes?.points !== undefined && ptsRes?.points !== null) ? Number(ptsRes.points) : null);

                const ptsFromObjNum = (activeCustomerObj?.loyaltyPoints !== undefined && activeCustomerObj?.loyaltyPoints !== null)
                    ? Number(activeCustomerObj.loyaltyPoints)
                    : ((activeCustomerObj?.points !== undefined && activeCustomerObj?.points !== null) ? Number(activeCustomerObj.points) : null);

                let finalPts = 0;
                if (ptsFromResNum !== null && ptsFromObjNum !== null) {
                    finalPts = Math.max(ptsFromResNum, ptsFromObjNum);
                } else if (ptsFromResNum !== null) {
                    finalPts = ptsFromResNum;
                } else if (ptsFromObjNum !== null) {
                    finalPts = ptsFromObjNum;
                }

                const pts = Math.max(0, Number(finalPts) || 0);
                const redemptionVal = Number(settingsRes?.redemptionValue) || 1;

                setCustomerLoyalty({
                    points: pts,
                    value: pts * redemptionVal,
                    settings: settingsRes,
                    loading: false
                });
            }).catch(err => {
                console.warn("Could not fetch customer loyalty:", err);
                setCustomerLoyalty(prev => ({ ...prev, loading: false }));
            });
        } else {
            setCustomerLoyalty({ points: 0, value: 0, settings: null, loading: false });
            setAppliedLoyaltyDiscount({ points: 0, amount: 0 });
        }
    }, [activeCustomerId, shopId, activeCustomerObj]);

    // Deduplicate items for display
    const deduplicatedItems = useMemo(() => {
        if (!orderItems || orderItems.length === 0) return [];
        const itemMap = new Map();

        orderItems.forEach((item, originalIdx) => {
            const itemId = String(item._id || item.id);
            const extrasKey = (item.selectedExtras || [])
                .map(e => `${e.name}-${e.quantity}`)
                .sort()
                .join("|");
            const variantKey = item.selectedVariant ? item.selectedVariant.name : "std";
            const groupKey = `${itemId}|${variantKey}|${extrasKey}`;

            if (itemMap.has(groupKey)) {
                const existing = itemMap.get(groupKey);
                existing.quantity += item.quantity;
                existing.originalIndices.push(originalIdx);
            } else {
                itemMap.set(groupKey, { ...item, originalIndices: [originalIdx] });
            }
        });

        return Array.from(itemMap.values());
    }, [orderItems]);

    const totalItemTypes = deduplicatedItems.length;
    const totalItemQuantity = (orderItems || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

    // Bill Calculations
    const rawBillDetails = typeof calculateBillDetails === "function" ? calculateBillDetails(
        orderItems,
        activeBillDiscount,
        settings?.defaultTaxPercent || 5,
        true,
        exchangeCredit || 0,
        branchStateCode,
        null
    ) : null;

    const billDetails = rawBillDetails || { subtotal: 0, discountAmount: 0, taxAmount: 0, finalTotal: 0 };

    const activeLoyaltyDiscount = (appliedLoyaltyDiscount && Number(appliedLoyaltyDiscount.amount) > 0)
        ? appliedLoyaltyDiscount
        : activeLoyaltyDiscountProp;
    const loyaltyDiscountAmt = Number(activeLoyaltyDiscount?.amount || 0);

    const finalBillDetails = loyaltyDiscountAmt > 0 ? {
        ...billDetails,
        finalTotal: Math.max(0, (billDetails.finalTotal || 0) - loyaltyDiscountAmt)
    } : billDetails;

    const zeroPriceItem = deduplicatedItems.find(item => {
        const lineTotal = calculateItemTotal(item);
        const baseUnitPrice = item.selectedVariant
            ? item.selectedVariant.price
            : (item.sellingType === "Weight" ? (item.pricePerUnit || item.sellingPrice || item.price || 0) : (item.sellingPrice || item.price || 0));
        return lineTotal <= 0 || baseUnitPrice <= 0;
    });

    // Auto-fill cash tendered with grand total whenever final total changes or screen opens
    useEffect(() => {
        if (finalBillDetails.finalTotal !== undefined && finalBillDetails.finalTotal !== null) {
            setCashTendered(finalBillDetails.finalTotal.toString());
        }
    }, [finalBillDetails.finalTotal]);

    // Setup selected payments & calculate total paid amount vs remaining balance (matching PaymentModal.jsx)
    useEffect(() => {
        const grandTotal = finalBillDetails.finalTotal;
        if (activeMethodId === 'cash') {
            const paid = cashTendered !== "" ? parseFloat(cashTendered) || 0 : grandTotal;
            setSelectedPayments([{ method: { id: "cash", label: "Cash", icon: Coins }, amount: paid, ref: "" }]);
        } else if (activeMethodId === 'card') {
            setSelectedPayments([{ method: { id: "card", label: "Card", icon: CreditCard }, amount: grandTotal, ref: cardRefNo }]);
        } else if (activeMethodId === 'upi') {
            setSelectedPayments([{ method: { id: "upi", label: "UPI", icon: Smartphone }, amount: grandTotal, ref: upiRefNo }]);
        } else if (activeMethodId === 'credit') {
            setSelectedPayments([{ method: { id: "credit", label: "Credit", icon: UserCheck }, amount: 0, ref: "" }]);
        } else if (activeMethodId === 'split') {
            const splitList = [];
            if (splitAmounts.cash > 0) splitList.push({ method: { id: "cash", label: "Cash", icon: Coins }, amount: splitAmounts.cash, ref: cashTendered });
            if (splitAmounts.card > 0) splitList.push({ method: { id: "card", label: "Card", icon: CreditCard }, amount: splitAmounts.card, ref: cardRefNo });
            if (splitAmounts.upi > 0) splitList.push({ method: { id: "upi", label: "UPI", icon: Smartphone }, amount: splitAmounts.upi, ref: upiRefNo });
            setSelectedPayments(splitList);
        }
    }, [activeMethodId, finalBillDetails.finalTotal, cashTendered, cardRefNo, upiRefNo, splitAmounts]);

    // Remaining balance & credit calculation (exact logic from PaymentModal.jsx)
    const totalPaidAmount = selectedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const remainingBalance = Math.max(0, finalBillDetails.finalTotal - totalPaidAmount);
    const isCreditPurchase = remainingBalance > 0;

    // Cash return change calculation (when cash tendered exceeds grand total)
    const tenderedVal = parseFloat(cashTendered) || 0;
    const returnChange = (activeMethodId === 'cash' && tenderedVal > finalBillDetails.finalTotal)
        ? Math.max(0, tenderedVal - finalBillDetails.finalTotal)
        : 0;

    const setQuickCash = (amt) => {
        setCashTendered(amt.toString());
    };

    // UPI payment string generator
    const upiPaymentString = useMemo(() => {
        if (!resolvedUpiId) return "";
        const shopNameClean = (settings?.shopName || "Store").replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const amt = finalBillDetails.finalTotal.toFixed(2);
        return `upi://pay?pa=${encodeURIComponent(resolvedUpiId)}&pn=${encodeURIComponent(shopNameClean)}&am=${amt}&cu=INR`;
    }, [resolvedUpiId, settings?.shopName, finalBillDetails.finalTotal]);

    // Handle Quick Customer Add
    const handleQuickAddCustomer = async () => {
        const cleanName = localCustName.trim();
        const cleanPhone = localCustPhone.replace(/\D/g, "");
        if (!cleanName && !cleanPhone) {
            toast.error("Please enter customer name or mobile number");
            return;
        }
        setIsCreatingCustomer(true);
        try {
            const newCustData = {
                name: cleanName || `Customer ${cleanPhone}`,
                phone: cleanPhone || "0000000000",
                branchId: activeBranchId,
                shopId: shopId
            };
            const res = await customerService.createCustomer(newCustData);
            const created = res?.customer || res?.data || res;
            if (created) {
                setCustomerSearchResult({ found: true, customer: created, name: created.name, phone: created.phone, creditDue: 0 });
                if (setSelectedCustomer) setSelectedCustomer(created);
                toast.success(`Customer "${created.name || cleanName}" added!`);
            }
        } catch (err) {
            console.error("Error creating customer:", err);
            toast.error(err?.response?.data?.message || "Failed to create customer");
        } finally {
            setIsCreatingCustomer(false);
            setIsAddCustomerOpen(false);
        }
    };

    // Redeem Loyalty Points Handler
    const handleRedeemLoyaltyPoints = () => {
        if (!customerLoyalty || customerLoyalty.points <= 0) return;
        const ptsSettings = customerLoyalty.settings || {};
        const minPoints = ptsSettings.minRedemptionPoints || 0;
        if (minPoints > 0 && customerLoyalty.points < minPoints) {
            toast.error(`Minimum ${minPoints} points required to redeem.`);
            return;
        }
        const redemptionVal = ptsSettings.redemptionValue || 1;
        let maxAmount = billDetails.finalTotal;
        if (ptsSettings.maxRedemptionPercentage > 0) {
            maxAmount = (billDetails.finalTotal * ptsSettings.maxRedemptionPercentage) / 100;
        }
        const maxPointsByBill = Math.floor(maxAmount / redemptionVal);
        const pointsToRedeem = Math.min(customerLoyalty.points, maxPointsByBill);
        const discountAmt = pointsToRedeem * redemptionVal;
        if (discountAmt > 0) {
            setAppliedLoyaltyDiscount({ points: pointsToRedeem, amount: discountAmt });
            if (setTakeawayLoyaltyDiscount) {
                setTakeawayLoyaltyDiscount({ points: pointsToRedeem, amount: discountAmt });
            }
            toast.success(`Redeemed ${pointsToRedeem} points for ${formatCurrency(discountAmt)} discount!`);
        } else {
            toast.error("Bill total is 0 or points cannot be redeemed for this bill amount.");
        }
    };

    // Handle Final Checkout Execution (Exact validation logic from PaymentModal.jsx)
    const handleCheckoutSubmit = async () => {
        if (zeroPriceItem) {
            toast.error(`Cannot checkout: "${zeroPriceItem.name}" has 0 price. Please set price to proceed.`);
            return;
        }

        if (isCreditPurchase) {
            const hasAllowCredit = settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true";
            if (!hasAllowCredit) {
                toast.error("Credit payment is disabled in Shop Settings. Full amount must be paid.");
                return;
            }

            const cleanPhone = localCustPhone.replace(/\D/g, "");
            const hasCustomer = activeCustomerId || customerSearchResult?.found || (localCustName.trim().length >= 2 && cleanPhone.length === 10);
            
            if (!hasCustomer) {
                toast.error("Valid customer details (Name & 10-digit Mobile Number) are required to complete a Credit purchase.");
                return;
            }
        }

        setIsProcessingPayment(true);
        try {
            const paymentsPayload = selectedPayments.map(p => ({
                paymentMethod: p.method.id.toUpperCase(),
                amount: Number(p.amount) || 0,
                referenceNo: p.ref || ""
            }));

            const finalBillWithCustomer = {
                ...finalBillDetails,
                customerId: activeCustomerId,
                appliedLoyaltyDiscount,
                isExchange,
                originalOrderId,
                returnedItems
            };

            const primaryMethod = selectedPayments[0]?.method?.id?.toUpperCase() || activeMethodId.toUpperCase();

            await onFinalizePayment(
                primaryMethod,
                finalBillWithCustomer,
                totalPaidAmount,
                localCustName,
                localCustPhone,
                paymentsPayload
            );

            toast.success(isCreditPurchase ? "Credit Purchase Finalized!" : "Order Checkout Completed Successfully!");
        } catch (err) {
            console.error("Checkout failed:", err);
            toast.error(err?.message || "Failed to process payment");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    return (
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${theme.pageBg} select-none font-sans`}>
            {/* Top Sub-Header for Review Bill Page */}
            <div className={`px-4 xl:px-6 py-3 border-b ${theme.borderLight} ${theme.surfaceBg} flex items-center justify-between gap-4 shrink-0 shadow-2xs`}>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        title="Back to Order Menu"
                        className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-400 transition-all active:scale-95 border border-indigo-200/50 dark:border-indigo-800/50"
                    >
                        <ArrowLeft size={20} className="stroke-[2.5]" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className={`text-xl xl:text-2xl font-black ${theme.textPrimary} tracking-tight`}>
                                Review Bill
                            </h2>
                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-black tracking-wider shadow-xs">
                                {tabs?.find(t => t.id === activeTabId)?.orderName || `ORD-${String(activeTabId || 1).padStart(5, '0')}`}
                            </span>
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-black tracking-wider shadow-2xs">
                                {totalItemTypes} Items • {totalItemQuantity} Qty
                            </span>
                        </div>
                        <p className={`text-xs font-semibold ${theme.textMuted}`}>
                            {isTakeaway ? (orderType || "Direct Sale") : (tableName ? `Table ${tableName}` : `Table ${activeTableId}`)}
                        </p>
                    </div>
                </div>

                {/* Tabs & Multi-Order Pills (matching PosTabBar style) */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar max-w-md xl:max-w-lg py-1">
                    {tabs && tabs.map((tab, index) => {
                        const isActive = tab.id === activeTabId;
                        const tabLabel = tab.orderName || `ORD-${String(tab.id).slice(-5)}`;
                        const isMain = index === 0;

                        return (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId && setActiveTabId(tab.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all shrink-0 border ${
                                    isActive
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                                        : `${theme.surfaceBg} ${theme.textPrimary} ${theme.borderLight} hover:border-indigo-300`
                                }`}
                            >
                                <span className="font-extrabold text-[11px] opacity-80">({index + 1})</span>
                                <span className="truncate max-w-[90px]">{tabLabel}</span>
                                {!isMain && tabs.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeTab && closeTab(tab.id);
                                        }}
                                        className="p-0.5 hover:bg-black/20 rounded-full transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {addNewTab && (
                        <button
                            type="button"
                            onClick={addNewTab}
                            title="Open New Order Tab"
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200/50 shrink-0 transition-all active:scale-95"
                        >
                            <Plus size={16} className="stroke-[3]" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Split: Left (Customer + Items + Collapsible Breakdown) & Right (Settlement + Action Buttons) */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT PANEL: Customer Selection (Fixed) + Items To Bill (Scrollable) + Bill Breakdown (Collapsible) */}
                <div className="flex-1 flex flex-col h-full overflow-hidden p-4 xl:p-6 space-y-4 xl:space-y-6">
                    
                    {/* CUSTOMER SELECTION CONTAINER (Fixed at top / shrink-0) */}
                    <div className={`shrink-0 ${theme.surfaceBg} p-4 xl:p-5 rounded-2xl shadow-sm border ${theme.borderLight} space-y-3`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <User size={14} /> Customer Selection
                            </span>
                            {customerSearchResult?.found && (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    ✓ Linked Customer
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className={`absolute left-3.5 top-3 ${theme.textMuted}`} />
                                <input
                                    type="text"
                                    value={localCustPhone || localCustName}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^\d+$/.test(val)) {
                                            setLocalCustPhone(sanitizePhoneInput(val));
                                        } else {
                                            setLocalCustName(val);
                                        }
                                    }}
                                    placeholder="Search mobile number or customer name..."
                                    className={`w-full pl-10 pr-9 py-2.5 ${theme.pageBg} border ${theme.borderLight} ${theme.textPrimary} placeholder:text-gray-400 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all`}
                                />
                                {isSearchingCustomer && (
                                    <Loader2 size={14} className="animate-spin text-indigo-500 absolute right-3 top-3" />
                                )}
                                {(localCustPhone || localCustName) && !isSearchingCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLocalCustPhone("");
                                            setLocalCustName("");
                                            setCustomerSearchResult(null);
                                            setAppliedLoyaltyDiscount({ points: 0, amount: 0 });
                                        }}
                                        className={`absolute right-3 top-3 ${theme.textMuted} hover:text-red-500`}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsAddCustomerOpen(prev => !prev)}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
                            >
                                <Plus size={15} className="stroke-[3]" /> Add
                            </button>
                        </div>

                        {/* Quick Add Customer Drawer */}
                        {isAddCustomerOpen && (
                            <div className={`p-3 ${theme.pageBg} rounded-xl border ${theme.borderLight} space-y-2.5 animate-in fade-in duration-200`}>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={localCustName}
                                        onChange={(e) => setLocalCustName(e.target.value)}
                                        placeholder="Full Name"
                                        className={`px-3 py-2 ${theme.surfaceBg} border ${theme.borderLight} ${theme.textPrimary} text-xs font-bold rounded-lg outline-none focus:border-indigo-500`}
                                    />
                                    <input
                                        type="tel"
                                        value={localCustPhone}
                                        onChange={(e) => setLocalCustPhone(sanitizePhoneInput(e.target.value))}
                                        placeholder="10-digit Phone"
                                        className={`px-3 py-2 ${theme.surfaceBg} border ${theme.borderLight} ${theme.textPrimary} text-xs font-bold rounded-lg outline-none focus:border-indigo-500`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleQuickAddCustomer}
                                    disabled={isCreatingCustomer}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                >
                                    {isCreatingCustomer ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Save Customer
                                </button>
                            </div>
                        )}

                        {/* Customer Info, Credit Due & Loyalty Points */}
                        {customerSearchResult?.found && (
                            <div className={`pt-2 border-t border-dashed ${theme.borderLight} space-y-2 text-xs`}>
                                <div className="flex flex-wrap items-center justify-between">
                                    <div>
                                        <span className={`font-bold ${theme.textPrimary}`}>{customerSearchResult.name || "Customer"}</span>
                                        <span className={`${theme.textMuted} ml-2`}>({customerSearchResult.phone})</span>
                                    </div>
                                    {customerSearchResult.creditDue > 0 && (
                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full font-black text-[11px] flex items-center gap-1">
                                            <AlertTriangle size={12} /> Credit Due: {formatCurrency(customerSearchResult.creditDue)}
                                        </span>
                                    )}
                                </div>

                                {/* Loyalty Points Redemption Box */}
                                {customerLoyalty.points > 0 && (
                                    <div className="p-3 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                                <Award size={14} /> {customerLoyalty.points} Loyalty Points Available ({formatCurrency(customerLoyalty.value)} value)
                                            </span>
                                        </div>

                                        {appliedLoyaltyDiscount.amount <= 0 ? (
                                            <button
                                                type="button"
                                                onClick={handleRedeemLoyaltyPoints}
                                                className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-black text-xs shadow-xs flex items-center justify-center gap-1.5 uppercase tracking-wider transition-all active:scale-95"
                                            >
                                                <Gift size={14} /> Redeem {customerLoyalty.points} Pts (-{formatCurrency(customerLoyalty.value)})
                                            </button>
                                        ) : (
                                            <div className="flex justify-between items-center text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg border border-amber-300 dark:border-amber-700">
                                                <span className="flex items-center gap-1.5">
                                                    <Gift size={14} /> Redeemed {appliedLoyaltyDiscount.points} Pts (-{formatCurrency(appliedLoyaltyDiscount.amount)})
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAppliedLoyaltyDiscount({ points: 0, amount: 0 });
                                                        if (setTakeawayLoyaltyDiscount) setTakeawayLoyaltyDiscount({ points: 0, amount: 0 });
                                                    }}
                                                    className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800/60 rounded text-amber-800 dark:text-amber-200"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ITEMS TO BILL SECTION (Middle section - ONLY section that scrolls!) */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-2">
                        <div className="flex items-center justify-between shrink-0 pb-1">
                            <h3 className={`text-xs font-black uppercase tracking-widest ${theme.textMuted}`}>
                                Items to Bill
                            </h3>
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-full">
                                {totalItemTypes} Items • {totalItemQuantity} Total Qty
                            </span>
                        </div>

                        {deduplicatedItems.length === 0 ? (
                            <div className={`p-10 text-center rounded-2xl border-2 border-dashed ${theme.borderLight} ${theme.surfaceBg} space-y-2`}>
                                <p className={`text-sm font-bold ${theme.textMuted}`}>No items in cart</p>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                                {deduplicatedItems.map((item, idx) => {
                                    const lineTotal = calculateItemTotal(item);
                                    const baseUnitPrice = item.selectedVariant
                                        ? item.selectedVariant.price
                                        : (item.sellingType === "Weight" ? (item.pricePerUnit || item.sellingPrice || item.price || 0) : (item.sellingPrice || item.price || 0));
                                    const isZeroPrice = lineTotal <= 0 || baseUnitPrice <= 0;
                                    const primaryIndex = item.originalIndices[0];

                                    return (
                                        <div
                                            key={(item.id || item._id) + "_" + idx}
                                            className={`p-2 sm:p-2.5 rounded-xl border transition-all shadow-2xs ${
                                                isZeroPrice
                                                    ? "border-amber-400 dark:border-amber-600 bg-transparent ring-1 ring-amber-400/40"
                                                    : `${theme.surfaceBg} ${theme.borderLight} hover:border-indigo-300`
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                {/* Left: Thumbnail & Details */}
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    {showAiImage ? (
                                                        <div className="relative shrink-0">
                                                            <img
                                                                src={getBingImage(item?.name, { w: 48, h: 48 })}
                                                                alt={item?.name || "Item"}
                                                                loading="lazy"
                                                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shadow-2xs"
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                                                                }}
                                                            />
                                                            <span className="absolute -top-1 -left-1 bg-indigo-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-2xs">
                                                                {item.quantity}x
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="bg-indigo-600 text-white font-black text-[10px] px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                                                            {item.quantity}x
                                                        </span>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className={`font-bold text-xs sm:text-sm leading-tight truncate ${theme.textPrimary}`}>
                                                                {item.name}
                                                            </h4>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px]">
                                                            {item.selectedVariant && (
                                                                <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                                                    {item.selectedVariant.name}
                                                                </span>
                                                            )}
                                                            <span className={`${theme.textMuted} font-medium`}>
                                                                ({item.taxPercent || settings?.defaultTaxPercent || 0}% Tax)
                                                            </span>
                                                            {isZeroPrice && (
                                                                <span className="text-[9px] bg-amber-500 text-white px-1 py-0.2 rounded font-black uppercase">
                                                                    Zero Price
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Quantity Controls, Line Total & Remove */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {/* Quantity Pill */}
                                                    <div className={`flex items-center gap-0.5 ${theme.pageBg} p-0.5 rounded-lg border ${theme.borderLight}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItemQuantity && updateItemQuantity(primaryIndex, item.quantity - 1)}
                                                            className={`w-6 h-6 rounded ${theme.surfaceBg} ${theme.textPrimary} flex items-center justify-center font-black shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors`}
                                                        >
                                                            <Minus size={11} />
                                                        </button>
                                                        <span className={`w-6 text-center text-xs font-black ${theme.textPrimary}`}>
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItemQuantity && updateItemQuantity(primaryIndex, item.quantity + 1)}
                                                            className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-black shadow-2xs hover:bg-indigo-700 transition-colors"
                                                        >
                                                            <Plus size={11} />
                                                        </button>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="text-right min-w-[70px]">
                                                        <span className={`text-sm font-black ${theme.textPrimary} block leading-tight`}>
                                                            {formatCurrency(lineTotal)}
                                                        </span>
                                                        <span className={`block text-[9px] font-bold ${theme.textMuted}`}>
                                                            {formatCurrency(baseUnitPrice)}/u
                                                        </span>
                                                    </div>

                                                    {/* Remove */}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItemFromCart && removeItemFromCart(primaryIndex)}
                                                        className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors shrink-0"
                                                        title="Remove Item"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* BILL BREAKDOWN & DISCOUNT CONTAINER (COLLAPSIBLE - DEFAULT COLLAPSED FOR MAX ITEMS HEIGHT) */}
                    <div className={`shrink-0 p-3.5 xl:p-4 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} space-y-2.5 shadow-sm`}>
                        <button
                            type="button"
                            onClick={() => setIsBreakdownOpen(prev => !prev)}
                            className="w-full flex items-center justify-between text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <span className="flex items-center gap-1.5">
                                BILL BREAKDOWN & DISCOUNT
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 font-bold">
                                <span>{isBreakdownOpen ? "Collapse" : "Expand Details"}</span>
                                {isBreakdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                        </button>

                        {/* FULL BREAKDOWN DETAILS WHEN EXPANDED */}
                        {isBreakdownOpen ? (
                            <div className="space-y-3 text-xs pt-1 border-t border-dashed border-gray-200 dark:border-slate-800 animate-in fade-in duration-200">
                                {/* Subtotal */}
                                <div className="flex justify-between font-bold">
                                    <span className={theme.textMuted}>Subtotal</span>
                                    <span className={theme.textPrimary}>{formatCurrency(billDetails.subtotal)}</span>
                                </div>

                                {/* Applied Offers */}
                                {billDetails.appliedOffers && billDetails.appliedOffers.length > 0 && (
                                    <div className="space-y-1.5">
                                        {billDetails.appliedOffers.map((offer, oIdx) => (
                                            <div key={offer.offerId || oIdx} className="flex justify-between items-center text-xs text-emerald-600 font-black bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                                                <span className="uppercase tracking-tight truncate">{offer.name}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span>-{formatCurrency(offer.discount)}</span>
                                                    {offer.offerId && dismissOffer && (
                                                        <button
                                                            type="button"
                                                            onClick={() => dismissOffer(offer.offerId)}
                                                            className="p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800/60"
                                                            title="Remove offer"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Coupon Code Input */}
                                {(hasPermissionFor?.("pos", "order", "apply_discount") || (hasPermission && hasPermission("APPLY_DISCOUNTS"))) && (
                                    <div className={`p-3 rounded-xl border ${theme.borderLight} ${theme.pageBg} space-y-2`}>
                                        <span className={`text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5`}>
                                            <Tag size={13} /> Apply Coupon Code
                                        </span>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponCode || ""}
                                                onChange={(e) => {
                                                    if (setCouponCode) setCouponCode(e.target.value.toUpperCase());
                                                    if (setCouponStatus) setCouponStatus(null);
                                                }}
                                                placeholder="ENTER CODE"
                                                className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-black uppercase outline-none ${theme.surfaceBg} ${theme.borderLight} focus:border-orange-500`}
                                            />
                                            <button
                                                type="button"
                                                onClick={applyCoupon}
                                                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-black text-xs uppercase tracking-wider transition-all"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        {couponStatus && (
                                            <p className={`text-[10px] font-bold ${couponStatus.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                                {couponStatus.msg}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Manual Discount Row */}
                                <div className={`space-y-2 pt-2 border-t border-dashed ${theme.borderLight}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`font-bold ${theme.textMuted}`}>MANUAL DISCOUNT</span>
                                        <div className={`flex ${theme.pageBg} p-0.5 rounded-lg border ${theme.borderLight}`}>
                                            <button
                                                type="button"
                                                onClick={() => activeSetBillDiscount({ ...activeBillDiscount, type: "flat" })}
                                                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                                    activeBillDiscount.type === 'flat'
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : `${theme.textMuted}`
                                                }`}
                                            >
                                                ₹ Flat
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => activeSetBillDiscount({ ...activeBillDiscount, type: "percentage" })}
                                                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                                                    activeBillDiscount.type === 'percentage'
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : `${theme.textMuted}`
                                                }`}
                                            >
                                                % Off
                                            </button>
                                        </div>
                                    </div>

                                    <input
                                        type="number"
                                        value={activeBillDiscount.value || ""}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            activeSetBillDiscount({ ...activeBillDiscount, value: val });
                                        }}
                                        placeholder="Enter discount amount..."
                                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${theme.pageBg} ${theme.borderLight} ${theme.textPrimary} focus:border-indigo-500`}
                                    />
                                </div>

                                {/* Tax */}
                                <div className="flex justify-between font-bold">
                                    <span className={theme.textMuted}>Tax</span>
                                    <span className={theme.textPrimary}>{formatCurrency(billDetails.taxAmount)}</span>
                                </div>

                                {/* Exchange Credit Deduction */}
                                {exchangeCredit > 0 && (
                                    <div className="flex justify-between font-bold text-orange-600">
                                        <span>Exchange Credit</span>
                                        <span>-{formatCurrency(exchangeCredit)}</span>
                                    </div>
                                )}

                                {/* Loyalty Discount Deduction */}
                                {loyaltyDiscountAmt > 0 && (
                                    <div className="flex justify-between font-bold text-amber-600">
                                        <span>Loyalty Points Discount</span>
                                        <span>-{formatCurrency(loyaltyDiscountAmt)}</span>
                                    </div>
                                )}

                                {/* GRAND TOTAL & SUBTOTAL BANNER CARD (EXPANDED) */}
                                <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 text-white p-3.5 xl:p-4 rounded-2xl shadow-lg border border-indigo-400/30 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100 block">
                                            Subtotal
                                        </span>
                                        <span className="text-xl xl:text-2xl font-black text-white tracking-tight">
                                            {formatCurrency(billDetails.subtotal)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-right">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100 block">
                                                Grand Total
                                            </span>
                                            <span className="text-2xl xl:text-3xl font-black text-white tracking-tight">
                                                {formatCurrency(finalBillDetails.finalTotal)}
                                            </span>
                                        </div>
                                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs shrink-0">
                                            {totalItemQuantity}
                                        </span>
                                        {zeroPriceItem && (
                                            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center animate-bounce shadow-md shrink-0" title="Zero price item in bill">
                                                <AlertTriangle size={18} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* COMPLETED / COLLAPSED VIEW - SUB TOTAL ON LEFT, GRAND TOTAL ON RIGHT */
                            <div className="pt-0.5 animate-in fade-in duration-150">
                                <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 text-white p-3 xl:p-3.5 rounded-xl shadow-md flex items-center justify-between">
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100 block">
                                            Subtotal
                                        </span>
                                        <span className="text-lg xl:text-xl font-black text-white tracking-tight">
                                            {formatCurrency(billDetails.subtotal)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-right">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100 block">
                                                Grand Total
                                            </span>
                                            <span className="text-xl xl:text-2xl font-black text-white tracking-tight">
                                                {formatCurrency(finalBillDetails.finalTotal)}
                                            </span>
                                        </div>
                                        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs shrink-0">
                                            {totalItemQuantity}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: PAYMENT METHOD & SETTLEMENT (MATCHING PAYMENTMODAL FLOW) */}
                <div className={`w-[400px] xl:w-[460px] 2xl:w-[500px] border-l ${theme.borderLight} ${theme.surfaceBg} flex flex-col shrink-0 h-full overflow-hidden`}>
                    
                    {/* TOP HEADER */}
                    <div className={`p-4 xl:p-5 border-b ${theme.borderLight} flex items-center justify-between shrink-0 shadow-2xs`}>
                        <h3 className={`text-lg xl:text-xl font-black ${theme.textPrimary} tracking-tight`}>
                            Payment & Settlement
                        </h3>
                        <button
                            type="button"
                            onClick={() => onPrintBill && onPrintBill(printFormat)}
                            title="Print Receipt"
                            className={`p-2 rounded-xl ${theme.pageBg} ${theme.textPrimary} hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border ${theme.borderLight} transition-all`}
                        >
                            <Printer size={18} />
                        </button>
                    </div>

                    {/* SCROLLABLE SETTLEMENT OPTIONS */}
                    <div className="flex-1 overflow-y-auto p-4 xl:p-5 space-y-4 xl:space-y-5 custom-scrollbar">
                        
                        {/* PAYMENT METHOD SELECTOR GRID (5 METHODS MATCHING CONCEPT DESIGN & PAYMENTMODAL) */}
                        <div className="space-y-2.5">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textMuted} block`}>
                                SELECT PAYMENT METHOD
                            </span>

                            <div className="grid grid-cols-5 gap-1.5">
                                {[
                                    { id: "cash", label: "CASH", icon: Coins },
                                    { id: "card", label: "CARD", icon: CreditCard },
                                    { id: "upi", label: "UPI", icon: Smartphone },
                                    { id: "split", label: "SPLIT", icon: ReceiptText },
                                    { id: "credit", label: "CREDIT", icon: UserCheck },
                                ].map((method) => {
                                    const IconComponent = method.icon;
                                    const isSelected = activeMethodId === method.id;

                                    return (
                                        <button
                                            key={method.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveMethodId(method.id);
                                                if (method.id === 'cash') {
                                                    setCashTendered(finalBillDetails.finalTotal.toString());
                                                }
                                            }}
                                            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                                                    : `${theme.pageBg} ${theme.textPrimary} ${theme.borderLight} hover:border-indigo-300`
                                            }`}
                                        >
                                            <IconComponent size={18} />
                                            <span className="text-[9px] font-black uppercase tracking-wider">{method.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Method specific inputs */}
                            {activeMethodId === 'cash' && (
                                <div className={`p-3.5 rounded-xl border ${theme.borderLight} ${theme.pageBg} space-y-2.5 animate-in fade-in duration-150`}>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className={theme.textMuted}>Cash Tendered / Amount Paid</span>
                                        {returnChange > 0 && (
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded font-black text-[11px]">
                                                Change: {formatCurrency(returnChange)}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="number"
                                        value={cashTendered}
                                        onChange={(e) => setCashTendered(e.target.value)}
                                        placeholder={`Enter cash (e.g. ${finalBillDetails.finalTotal})`}
                                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} focus:border-indigo-500`}
                                    />
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setQuickCash(finalBillDetails.finalTotal)}
                                            className="flex-1 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[11px] rounded-lg border border-indigo-200/50"
                                        >
                                            Exact
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickCash(Math.ceil(finalBillDetails.finalTotal / 50) * 50)}
                                            className={`flex-1 py-1.5 ${theme.surfaceBg} ${theme.textPrimary} text-xs font-bold rounded-lg border ${theme.borderLight}`}
                                        >
                                            +50
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickCash(Math.ceil(finalBillDetails.finalTotal / 100) * 100)}
                                            className={`flex-1 py-1.5 ${theme.surfaceBg} ${theme.textPrimary} text-xs font-bold rounded-lg border ${theme.borderLight}`}
                                        >
                                            +100
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickCash(Math.ceil(finalBillDetails.finalTotal / 500) * 500)}
                                            className={`flex-1 py-1.5 ${theme.surfaceBg} ${theme.textPrimary} text-xs font-bold rounded-lg border ${theme.borderLight}`}
                                        >
                                            +500
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeMethodId === 'upi' && (
                                <div className={`p-4 rounded-xl border ${theme.borderLight} ${theme.pageBg} space-y-3 animate-in fade-in duration-150 text-center`}>
                                    {upiPaymentString ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-2 bg-white rounded-xl shadow-inner border border-gray-200 w-44 h-44 flex items-center justify-center">
                                                <QRCodeSVG value={upiPaymentString} style={{ width: "100%", height: "100%" }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500">Scan QR to pay {formatCurrency(finalBillDetails.finalTotal)}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-600 font-bold">UPI ID not configured in Shop Settings</p>
                                    )}
                                    <input
                                        type="text"
                                        value={upiRefNo}
                                        onChange={(e) => setUpiRefNo(e.target.value)}
                                        placeholder="UPI Ref / Transaction ID (optional)"
                                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} focus:border-indigo-500`}
                                    />
                                </div>
                            )}

                            {activeMethodId === 'card' && (
                                <div className={`p-3.5 rounded-xl border ${theme.borderLight} ${theme.pageBg} space-y-2 animate-in fade-in duration-150`}>
                                    <span className={`text-xs font-bold ${theme.textMuted}`}>Card Reference Number</span>
                                    <input
                                        type="text"
                                        value={cardRefNo}
                                        onChange={(e) => setCardRefNo(e.target.value)}
                                        placeholder="Enter approval / ref code..."
                                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} focus:border-indigo-500`}
                                    />
                                </div>
                            )}

                            {activeMethodId === 'credit' && (
                                <div className="p-3.5 rounded-xl border-2 border-indigo-500/60 bg-transparent space-y-1.5 animate-in fade-in duration-150">
                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                                        <UserCheck size={16} /> Credit Purchase Settlement
                                    </div>
                                    <p className={`text-xs ${theme.textPrimary} font-bold leading-relaxed`}>
                                        The full balance of <strong className="font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(finalBillDetails.finalTotal)}</strong> will be recorded as Customer Credit Due in ledger.
                                    </p>
                                </div>
                            )}

                            {activeMethodId === 'split' && (
                                <div className={`p-3.5 rounded-xl border ${theme.borderLight} ${theme.pageBg} space-y-2 animate-in fade-in duration-150 text-xs`}>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className={`font-bold ${theme.textMuted}`}>Cash Amount</label>
                                            <input
                                                type="number"
                                                value={splitAmounts.cash || ""}
                                                onChange={(e) => setSplitAmounts({ ...splitAmounts, cash: parseFloat(e.target.value) || 0 })}
                                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary}`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`font-bold ${theme.textMuted}`}>Card Amount</label>
                                            <input
                                                type="number"
                                                value={splitAmounts.card || ""}
                                                onChange={(e) => setSplitAmounts({ ...splitAmounts, card: parseFloat(e.target.value) || 0 })}
                                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary}`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`font-bold ${theme.textMuted}`}>UPI Amount</label>
                                            <input
                                                type="number"
                                                value={splitAmounts.upi || ""}
                                                onChange={(e) => setSplitAmounts({ ...splitAmounts, upi: parseFloat(e.target.value) || 0 })}
                                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Status Settlement Banner */}
                            {!isCreditPurchase ? (
                                <div className="p-3.5 rounded-xl border-2 border-emerald-500/60 bg-transparent space-y-1 animate-in fade-in duration-150 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                    <span className="font-black flex items-center gap-1.5 uppercase">
                                        <UserCheck size={14} /> Payment Status: FULLY PAID
                                    </span>
                                    <p className="text-[11px] font-bold leading-relaxed">
                                        Full amount of <strong className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(finalBillDetails.finalTotal)}</strong> is paid in full. No balance remaining.
                                    </p>
                                </div>
                            ) : (
                                <div className={`p-3.5 rounded-xl border-2 bg-transparent space-y-1 animate-in fade-in duration-150 text-xs ${
                                    !(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true")
                                        ? 'border-red-500 text-red-600 dark:text-red-400 font-bold'
                                        : 'border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                                }`}>
                                    <span className="font-black flex items-center gap-1.5 uppercase">
                                        <AlertTriangle size={14} /> Credit Purchase Notice
                                    </span>
                                    {!(settings?.ALLOW_CREDIT === true || String(settings?.ALLOW_CREDIT) === "true") ? (
                                        <p className="text-[11px] font-bold leading-relaxed text-red-600 dark:text-red-400">
                                            Credit payments are currently disabled in Shop Settings. Full bill total must be paid.
                                        </p>
                                    ) : (
                                        <p className="text-[11px] font-bold leading-relaxed">
                                            Paid: {formatCurrency(totalPaidAmount)} • Balance Due: <strong className="font-black text-amber-600 dark:text-amber-400">{formatCurrency(remainingBalance)}</strong> (recorded as Credit Due for {localCustName || customerSearchResult?.name || "⚠ Select customer above"}).
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* PRINTER SELECTION & FORMAT */}
                        <div className="space-y-2">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textMuted} block`}>
                                PRINTER SELECTION & FORMAT
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPrintFormat("thermal")}
                                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase transition-all ${
                                        printFormat === 'thermal'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                            : `${theme.pageBg} ${theme.textPrimary} ${theme.borderLight}`
                                    }`}
                                >
                                    THERMAL (3")
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPrintFormat("a4")}
                                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase transition-all ${
                                        printFormat === 'a4'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                            : `${theme.pageBg} ${theme.textPrimary} ${theme.borderLight}`
                                    }`}
                                >
                                    A4 SHEET
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* FIXED/STICKY BOTTOM ACTION FOOTER (ALWAYS VISIBLE, NO SCROLL REQUIRED) */}
                    <div className={`p-4 xl:p-5 border-t ${theme.borderLight} ${theme.surfaceBg} shrink-0 shadow-lg`}>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onPrintBill && onPrintBill(printFormat)}
                                className={`py-3.5 ${theme.mode === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'} rounded-2xl font-black text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer`}
                            >
                                <Printer size={18} /> Print Bill
                            </button>

                            <button
                                type="button"
                                onClick={handleCheckoutSubmit}
                                disabled={isProcessingPayment || !!zeroPriceItem}
                                className={`py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    isProcessingPayment || !!zeroPriceItem
                                        ? "bg-gray-400 cursor-not-allowed opacity-75"
                                        : isCreditPurchase
                                        ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95"
                                        : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 active:scale-95"
                                }`}
                            >
                                {isProcessingPayment ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" /> Processing...
                                    </>
                                ) : isCreditPurchase ? (
                                    <>
                                        Finalize Credit Purchase
                                    </>
                                ) : (
                                    <>
                                        Checkout • {formatCurrency(finalBillDetails.finalTotal)}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default InlineReviewBill;
