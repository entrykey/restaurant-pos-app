import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    ArrowLeft, Save, Plus, Trash2, Search, User, Building, Package,
    Check, X, Phone, MapPin, Loader2, ShoppingBag, CreditCard, Banknote
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { itemService, shopService, taxService, unitService, orderService, customerService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useOrder } from "../../context/OrderContext";
import { useTheme } from "../../context/ThemeContext";
import ProductPage from "../Inventory/ProductPage";
import DatePicker from "../../components/ui/DatePicker";
import CommonSelect from "../../components/ui/CommonSelect";
import { toast } from "react-hot-toast";
import { applyBogoQuantity, getCrossItemFreeAdds } from "../../utils/posOfferHelpers";

const PAYMENT_METHODS = [
    { id: "CASH", label: "Cash", icon: Banknote },
    { id: "CARD", label: "Card", icon: CreditCard },
    { id: "UPI", label: "UPI", icon: CreditCard },
    { id: "ONLINE", label: "Online", icon: CreditCard },
];

const calcLineTax = (price, qty, taxPercent) => {
    const lineTotal = (Number(price) || 0) * (Number(qty) || 0);
    const r = Number(taxPercent) || 0;
    if (!r) return 0;
    return parseFloat(((lineTotal * r) / 100).toFixed(4));
};

const SalePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeBranchId, formatCurrency, branches, currentShopId, businessType } = useApp();
    const { calculateBillDetails, fetchActiveOffers, dismissOffer, offers } = useOrder();
    const { theme } = useTheme();

    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [shopTaxes, setShopTaxes] = useState([]);
    const [units, setUnits] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState("CASH");

    const [formData, setFormData] = useState({
        customerId: "",
        branchId: activeBranchId || "",
        saleDate: new Date().toISOString().split("T")[0],
        notes: "",
        discountTotal: 0,
        items: [],
        subtotal: 0,
        taxTotal: 0,
        grandTotal: 0,
    });

    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productPrefillData, setProductPrefillData] = useState(null);
    const [discountType, setDiscountType] = useState('flat'); // 'flat' | 'percent'

    const fetchInitialData = useCallback(async (branchIdArg) => {
        const branchId = branchIdArg || formData.branchId || activeBranchId;
        if (!currentShopId) return;
        try {
            const [customersData, itemsRes, taxesRes, unitsRes] = await Promise.all([
                customerService.getCustomers({ branchId, limit: 200 }),
                itemService.getItems({
                    filters: {
                        shopId: currentShopId,
                        itemType: ["STOCK", "TRADE"],
                        branchId: branchId || undefined,
                    },
                    limit: 500,
                }),
                taxService.getTaxes({ branchId }),
                unitService.getUnits(),
            ]);
            setCustomers(Array.isArray(customersData) ? customersData : customersData?.data || []);
            const items = itemsRes.data || [];
            setStockItems(items.map((item) => {
                const taxPercent = Number(item.taxPercent || 0);
                const taxObj = (taxesRes || []).find((t) => t.percentage === taxPercent);
                return {
                    ...item,
                    taxPercent,
                    isExclusiveTax: taxObj ? taxObj.taxType === "EXCLUSIVE" : false,
                };
            }));
            setShopTaxes((taxesRes || []).filter((t) => t.isActive !== false));
            setUnits(unitsRes || []);
        } catch (error) {
            console.error("Error loading sale form data:", error);
            toast.error("Failed to load products");
        }
    }, [currentShopId, formData.branchId, activeBranchId]);

    useEffect(() => {
        if (currentShopId) fetchInitialData(activeBranchId);
        if (activeBranchId) {
            setFormData((prev) => ({ ...prev, branchId: activeBranchId }));
        }
    }, [currentShopId, activeBranchId, fetchInitialData]);

    useEffect(() => {
        if (currentShopId && activeBranchId) {
            fetchActiveOffers(currentShopId, activeBranchId);
        }
    }, [currentShopId, activeBranchId, fetchActiveOffers]);

    const buildLineItem = useCallback((item, quantity) => {
        const sellingPrice = item.pricing?.sellingPrice ?? item.sellingPrice ?? 0;
        const taxPercent = Number(item.taxPercent || 0);
        const taxObj = item.taxId
            ? shopTaxes.find((t) => t._id === (item.taxId?._id || item.taxId))
            : shopTaxes.find((t) => t.percentage === taxPercent);
        const isExclusiveTax = item.isExclusiveTax ?? (taxObj ? taxObj.taxType === "EXCLUSIVE" : false);
        return {
            itemId: item._id || item.itemId,
            name: item.name,
            itemCode: item.itemCode,
            quantity,
            sellingPrice,
            discountAmount: 0,
            categoryId: item.categoryId?._id || item.categoryId || null,
            category_id: item.categoryId?._id || item.categoryId || null,
            taxId: item.taxId?._id || item.taxId || null,
            taxPercent,
            taxAmount: calcLineTax(sellingPrice, quantity, taxPercent),
            isExclusiveTax,
            unitId: item.unitId?._id || item.unitId,
            primaryUnitName: item.unitId?.name || "",
            unitName: item.unitId?.name || "",
            secondaryUnitId: item.secondaryUnitId?._id || item.secondaryUnitId,
            secondaryUnitName: item.secondaryUnitId?.name || "",
            conversionFactor: item.conversionFactor || 1,
            selectedUnit: item.defaultSaleUnit || item.defaultPurchaseUnit || "PRIMARY",
        };
    }, [shopTaxes]);

    const appendCrossItemFreeAdds = useCallback((items, sourceItemId, paidQty, catalog) => {
        const crossAdds = getCrossItemFreeAdds(paidQty, sourceItemId, offers, catalog);
        let next = [...items];
        crossAdds.forEach(({ item, quantity, offerName }) => {
            const existingIdx = next.findIndex((it) => it.itemId === item._id);
            if (existingIdx >= 0) {
                const row = next[existingIdx];
                const newQty = row.quantity + quantity;
                next[existingIdx] = {
                    ...row,
                    quantity: newQty,
                    taxAmount: calcLineTax(row.sellingPrice, newQty, row.taxPercent),
                };
            } else {
                next.push(buildLineItem(item, quantity));
            }
            toast.success(`${offerName}: added ${quantity} ${item.name}`, { icon: "🎁", duration: 3000 });
        });
        return next;
    }, [offers, buildLineItem]);

    const handleAddItem = useCallback((item) => {
        if (!item?._id) return;
        setFormData((prev) => {
            const existingIdx = prev.items.findIndex((it) => it.itemId === item._id);
            let items = [...prev.items];

            if (existingIdx >= 0) {
                const row = items[existingIdx];
                const newQty = row.quantity + 1;
                items[existingIdx] = {
                    ...row,
                    quantity: newQty,
                    taxAmount: calcLineTax(row.sellingPrice, newQty, row.taxPercent),
                };
            } else {
                const withBogo = applyBogoQuantity(1, item._id, offers);
                if (withBogo > 1) {
                    toast.success(`Offer applied: ${withBogo - 1} free ${item.name}`, { icon: "🎁", duration: 3000 });
                }
                items.push(buildLineItem(item, withBogo));
                items = appendCrossItemFreeAdds(items, item._id, 1, stockItems);
            }

            return { ...prev, items };
        });
    }, [offers, stockItems, buildLineItem, appendCrossItemFreeAdds]);

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        if (typeof field === "object") {
            updatedItems[index] = { ...updatedItems[index], ...field };
        } else {
            if (field === "selectedUnit") {
                const row = updatedItems[index];
                const oldUnit = row.selectedUnit;
                if (value === "SECONDARY" && oldUnit !== "SECONDARY") {
                    updatedItems[index].sellingPrice = parseFloat(
                        (row.sellingPrice * row.conversionFactor).toFixed(4)
                    );
                    updatedItems[index].unitName = row.secondaryUnitName;
                } else if (value === "PRIMARY" && oldUnit !== "PRIMARY") {
                    updatedItems[index].sellingPrice = parseFloat(
                        (row.sellingPrice / row.conversionFactor).toFixed(4)
                    );
                    updatedItems[index].unitName = row.primaryUnitName;
                }
            }
            updatedItems[index][field] = value;
        }

        const needsRecalc =
            typeof field === "object"
                ? "sellingPrice" in field || "taxPercent" in field || "quantity" in field
                : field === "sellingPrice" || field === "taxPercent" || field === "quantity";

        if (needsRecalc) {
            const row = updatedItems[index];
            row.taxAmount = calcLineTax(row.sellingPrice, row.quantity, row.taxPercent);
        }

        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((it, i) => (i === index ? updatedItems[index] : it)),
        }));
    };

    const removeItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const orderItemsForBill = useMemo(() =>
        (formData.items || []).map((it) => ({
            ...it,
            id: it.itemId,
            _id: it.itemId,
            price: it.sellingPrice,
            sellingPrice: it.sellingPrice,
            categoryId: it.categoryId,
            category_id: it.category_id,
            taxPercent: it.taxPercent || 0,
            isExclusiveTax: it.isExclusiveTax,
        })),
    [formData.items]);

    const billDetails = useMemo(() =>
        calculateBillDetails(
            orderItemsForBill,
            { type: "flat", value: Number(formData.discountTotal) || 0 },
            0,
            false
        ),
    [orderItemsForBill, formData.discountTotal, calculateBillDetails, offers]);

    const filteredCustomers = useMemo(() => {
        const q = customerSearch.trim().toLowerCase();
        if (!q) return customers.slice(0, 12);
        return customers
            .filter(
                (c) =>
                    (c.name || "").toLowerCase().includes(q) ||
                    (c.phone || "").includes(q) ||
                    (c.customerCode || "").toLowerCase().includes(q)
            )
            .slice(0, 12);
    }, [customers, customerSearch]);

    const selectedCustomer = customers.find((c) => c._id === formData.customerId);
    const selectedBranch = branches.find(
        (b) => b._id === formData.branchId || b.id === formData.branchId
    );

    const handleProductDialogClose = async (newProduct) => {
        setIsProductModalOpen(false);
        if (newProduct && (newProduct._id || newProduct.id) && newProduct.name) {
            try {
                const response = await itemService.getItems({
                    limit: 500,
                    filters: {
                        shopId: currentShopId,
                        branchId: formData.branchId || activeBranchId || undefined,
                        itemType: ["STOCK", "TRADE"],
                    },
                });
                const updated = response.data || [];
                setStockItems(updated);
                const full = updated.find((it) => (it._id || it.id) === (newProduct._id || newProduct.id)) || newProduct;
                handleAddItem(full);
            } catch {
                handleAddItem(newProduct);
            }
        }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (!formData.branchId) {
            toast.error("Branch is required.");
            return;
        }
        if (formData.items.length === 0) {
            toast.error("Add at least one product.");
            return;
        }
        if ((billDetails.finalTotal || 0) <= 0) {
            toast.error("Sale total must be greater than zero.");
            return;
        }

        setLoading(true);
        try {
            const payloadItems = formData.items.map((it) => ({
                itemId: it.itemId,
                itemName: it.name,
                price: Number(it.sellingPrice),
                quantity: Number(it.quantity),
                totalAmount:
                    Number(it.quantity) * Number(it.sellingPrice) +
                    (Number(it.taxAmount) || 0) -
                    (Number(it.discountAmount) || 0),
                taxPercent: it.taxPercent || 0,
                taxAmount: it.taxAmount || 0,
                discountAmount: it.discountAmount || 0,
                selectedUnit: it.selectedUnit || "PRIMARY",
                conversionFactor: it.conversionFactor || 1,
                notes: "",
            }));

            const orderPayload = {
                shopId: currentShopId,
                branchId: formData.branchId,
                businessType: businessType || "RESTAURANT",
                orderType: "DIRECT_SALE",
                customerId: formData.customerId || null,
                customerName: selectedCustomer?.name || "",
                customerPhone: selectedCustomer?.phone || "",
                items: payloadItems,
                subtotal: billDetails.subtotal,
                discountTotal: billDetails.discountAmount || formData.discountTotal || 0,
                offerDiscountTotal: billDetails.offerDiscountTotal || 0,
                appliedOffers: (billDetails.appliedOffers || []).map((o) => ({
                    offerId: o.offerId,
                    offerName: o.name,
                    discountAmount: o.discount || 0,
                })),
                taxTotal: billDetails.taxAmount,
                grandTotal: billDetails.finalTotal,
                notes: formData.notes || "Manual sale entry",
                createdBy: user?._id || user?.id,
            };

            const created = await orderService.createOrder(orderPayload);
            const orderId = created._id || created.id;

            await orderService.addPayment(orderId, {
                paymentMethod: paymentMethod.toUpperCase(),
                amount: billDetails.finalTotal,
                customerName: selectedCustomer?.name,
                customerPhone: selectedCustomer?.phone,
            });

            await orderService.updateStatus(orderId, { status: "COMPLETED" });
            toast.success("Sale recorded successfully");
            navigate("/sales-history");
        } catch (error) {
            console.error("Save sale error:", error);
            toast.error(error?.message || error?.response?.data?.message || "Failed to save sale");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-full ${theme.pageBg} p-3 md:p-8`}>
            <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-8 pb-10">
                <div className="mb-2">
                    <Link to="/sales-history" className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-colors hover:opacity-70 ${theme.textMuted}`}>
                        <ArrowLeft size={14} /> Back to Purchases
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-8">
                    <div>
                        <h1 className={`text-xl md:text-3xl font-black uppercase ${theme.textHeading}`}>
                            New Manual Sale
                        </h1>
                        <p className={`font-bold text-[10px] uppercase tracking-widest mt-0.5 ${theme.textMuted}`}>
                            Product selection & optional customer
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-8">
                    <div className={`${theme.surfaceBg} rounded-2xl md:rounded-[40px] shadow-md md:shadow-2xl p-4 md:p-12 border ${theme.borderLight}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <User size={12} /> Customer <span className="opacity-50">(optional)</span>
                                </label>
                                <div className="relative">
                                    {formData.customerId && selectedCustomer ? (
                                        <div className={`p-3 md:p-6 rounded-2xl md:rounded-3xl border-2 border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-900/10 relative group`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData((prev) => ({ ...prev, customerId: "" }));
                                                    setCustomerSearch("");
                                                }}
                                                className="absolute top-4 right-4 p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all opacity-0 group-hover:opacity-100 text-[8px] font-black uppercase flex items-center gap-1"
                                            >
                                                <X size={14} /> Clear
                                            </button>
                                            <h3 className={`text-lg font-black ${theme.textHeading}`}>{selectedCustomer.name}</h3>
                                            {selectedCustomer.phone && (
                                                <p className={`text-xs font-bold ${theme.textMuted} mt-1 flex items-center gap-1`}>
                                                    <Phone size={12} /> {selectedCustomer.phone}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    value={customerSearch}
                                                    onChange={(e) => {
                                                        setCustomerSearch(e.target.value);
                                                        setShowCustomerResults(true);
                                                    }}
                                                    onFocus={() => setShowCustomerResults(true)}
                                                    placeholder="Search customer or leave empty for walk-in..."
                                                    className={`w-full pl-12 pr-4 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary}`}
                                                />
                                            </div>
                                            {showCustomerResults && customerSearch && (
                                                <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border z-[2000] overflow-hidden divide-y ${theme.surfaceBg} ${theme.borderLight}`}>
                                                    {filteredCustomers.map((c) => (
                                                        <button
                                                            key={c._id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData((prev) => ({ ...prev, customerId: c._id }));
                                                                setCustomerSearch(c.name);
                                                                setShowCustomerResults(false);
                                                            }}
                                                            className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <div className={`font-black ${theme.textPrimary}`}>{c.name}</div>
                                                                {c.phone && (
                                                                    <div className={`text-[10px] font-bold ${theme.textSecondary}`}>{c.phone}</div>
                                                                )}
                                                            </div>
                                                            <Check size={16} className="text-indigo-600 opacity-60" />
                                                        </button>
                                                    ))}
                                                    {filteredCustomers.length === 0 && (
                                                        <div className={`p-4 text-center text-xs font-bold ${theme.textMuted}`}>
                                                            No customers found — sale will be walk-in
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <Building size={12} /> Branch *
                                </label>
                                <select
                                    required
                                    value={formData.branchId}
                                    onChange={(e) => {
                                        const bid = e.target.value;
                                        setFormData((prev) => ({ ...prev, branchId: bid }));
                                        fetchInitialData(bid);
                                    }}
                                    className={`w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black ${theme.inputBg} ${theme.textPrimary}`}
                                >
                                    <option value="">Select branch</option>
                                    {branches.map((b) => (
                                        <option key={b._id || b.id} value={b._id || b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                                {selectedBranch?.address?.line1 && (
                                    <p className={`text-[10px] font-bold ${theme.textMuted} flex items-start gap-1`}>
                                        <MapPin size={10} className="mt-0.5 shrink-0" />
                                        {selectedBranch.address.line1}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className={`text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    Sale date
                                </label>
                                <DatePicker
                                    value={formData.saleDate}
                                    onChange={(val) => setFormData((prev) => ({ ...prev, saleDate: val }))}
                                    className={`w-full px-4 py-3 border-2 border-transparent focus-within:border-indigo-500 rounded-2xl font-black ${theme.inputBg} ${theme.textPrimary}`}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className={`text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    Notes
                                </label>
                                <input
                                    value={formData.notes}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Optional notes..."
                                    className={`w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`${theme.surfaceBg} rounded-2xl md:rounded-[40px] shadow-md md:shadow-2xl p-4 md:p-12 border ${theme.borderLight} space-y-4 md:space-y-6`}>
                        <h2 className={`text-base md:text-xl font-black flex items-center gap-3 uppercase ${theme.textHeading}`}>
                            <Package className="text-indigo-600" /> Products
                        </h2>

                        <CommonSelect
                            options={stockItems}
                            value={null}
                            onChange={(_id, item) => handleAddItem(item)}
                            placeholder="Search and add products..."
                            searchPlaceholder="Search by name or code..."
                            labelKey="name"
                            valueKey="_id"
                            className="w-full"
                            extraAction={
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProductPrefillData(null);
                                        setIsProductModalOpen(true);
                                    }}
                                    className={`w-full p-4 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 border-t ${theme.borderLight}`}
                                >
                                    <Plus size={18} className="text-emerald-600" />
                                    <span className="font-black text-emerald-600 text-sm">Add new product</span>
                                </button>
                            }
                        />

                        {formData.items.length === 0 ? (
                            <div className={`text-center py-12 rounded-3xl border-2 border-dashed ${theme.borderLight}`}>
                                <ShoppingBag size={36} className="mx-auto mb-3 text-gray-300" />
                                <p className={`font-bold ${theme.textMuted}`}>No products added yet</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop table lg+ */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} border-b ${theme.borderLight}`}>
                                                <th className="py-4 pr-4">Product</th>
                                                <th className="py-4 px-2 w-24">Qty</th>
                                                <th className="py-4 px-2 w-32">Price</th>
                                                <th className="py-4 px-2 w-24">Tax %</th>
                                                <th className="py-4 px-2 w-28">Disc ₹</th>
                                                <th className="py-4 px-2 text-right">Line total</th>
                                                <th className="py-4 w-12" />
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${theme.borderLight}`}>
                                            {formData.items.map((row, idx) => {
                                                const lineTotal =
                                                    row.quantity * row.sellingPrice +
                                                    (row.taxAmount || 0) -
                                                    (row.discountAmount || 0);
                                                const freeItemInfo = billDetails.freeItems?.find(
                                                    (fi) => String(fi.itemId) === String(row.itemId)
                                                );
                                                const isOfferApplied = billDetails.appliedOfferItemIds?.map(String).includes(String(row.itemId));
                                                return (
                                                    <tr key={row.itemId}>
                                                        <td className="py-4 pr-4">
                                                            <p className={`font-black ${theme.textPrimary}`}>
                                                                {row.name}
                                                                {row.taxPercent > 0 && (
                                                                    <span className={`text-[10px] font-bold ${theme.textMuted} ml-1`}>({row.taxPercent}%)</span>
                                                                )}
                                                            </p>
                                                            <p className={`text-[10px] font-bold ${theme.textMuted}`}>{row.itemCode}</p>
                                                            {(freeItemInfo || isOfferApplied) && (
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                    {freeItemInfo && (
                                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                                                            + {freeItemInfo.quantity} FREE
                                                                        </span>
                                                                    )}
                                                                    {billDetails.appliedOffers?.filter((o) =>
                                                                        o.name?.toLowerCase().includes("buy") || freeItemInfo
                                                                    ).map((o) => (
                                                                        <span key={o.offerId || o.name} className="text-[10px] font-black uppercase text-emerald-600">
                                                                            {o.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-2">
                                                            <input type="number" min="0.01" step="any" value={row.quantity}
                                                                onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                                                                className={`w-full p-2 rounded-xl font-black text-center ${theme.inputBg} border ${theme.borderLight}`} />
                                                        </td>
                                                        <td className="py-4 px-2">
                                                            <input type="number" min="0" step="any" value={row.sellingPrice}
                                                                onChange={(e) => handleItemChange(idx, "sellingPrice", parseFloat(e.target.value) || 0)}
                                                                className={`w-full p-2 rounded-xl font-black text-right ${theme.inputBg} border ${theme.borderLight}`} />
                                                        </td>
                                                        <td className="py-4 px-2">
                                                            <input type="number" min="0" value={row.taxPercent}
                                                                onChange={(e) => handleItemChange(idx, "taxPercent", parseFloat(e.target.value) || 0)}
                                                                className={`w-full p-2 rounded-xl font-black text-center ${theme.inputBg} border ${theme.borderLight}`} />
                                                        </td>
                                                        <td className="py-4 px-2">
                                                            <input type="number" min="0" step="any" value={row.discountAmount || ""}
                                                                onChange={(e) => handleItemChange(idx, "discountAmount", parseFloat(e.target.value) || 0)}
                                                                placeholder="0"
                                                                className={`w-full p-2 rounded-xl font-black text-center text-emerald-600 ${theme.inputBg} border ${theme.borderLight}`} />
                                                        </td>
                                                        <td className={`py-4 px-2 text-right font-black ${theme.textPrimary}`}>{formatCurrency(lineTotal)}</td>
                                                        <td className="py-4">
                                                            <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile/Tablet cards below lg */}
                                <div className={`lg:hidden divide-y ${theme.borderLight}`}>
                                    {formData.items.map((row, idx) => {
                                        const lineTotal = row.quantity * row.sellingPrice + (row.taxAmount || 0) - (row.discountAmount || 0);
                                        const freeItemInfo = billDetails.freeItems?.find(
                                            (fi) => String(fi.itemId) === String(row.itemId)
                                        );
                                        return (
                                            <div key={row.itemId} className="py-3 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className={`font-black ${theme.textPrimary}`}>{row.name}</p>
                                                        <p className={`text-[10px] font-bold ${theme.textMuted}`}>{row.itemCode}</p>
                                                        {freeItemInfo && (
                                                            <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                                                                + {freeItemInfo.quantity} FREE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`font-black text-sm text-indigo-600`}>{formatCurrency(lineTotal)}</span>
                                                        <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className={`text-[9px] font-black uppercase ${theme.textMuted} mb-1`}>Qty</p>
                                                        <input type="number" min="0.01" step="any" value={row.quantity}
                                                            onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                                                            className={`w-full p-2 rounded-xl font-black text-center text-sm ${theme.inputBg} border ${theme.borderLight}`} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[9px] font-black uppercase ${theme.textMuted} mb-1`}>Price</p>
                                                        <input type="number" min="0" step="any" value={row.sellingPrice}
                                                            onChange={(e) => handleItemChange(idx, "sellingPrice", parseFloat(e.target.value) || 0)}
                                                            className={`w-full p-2 rounded-xl font-black text-right text-sm ${theme.inputBg} border ${theme.borderLight}`} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[9px] font-black uppercase ${theme.textMuted} mb-1`}>Tax %</p>
                                                        <input type="number" min="0" value={row.taxPercent}
                                                            onChange={(e) => handleItemChange(idx, "taxPercent", parseFloat(e.target.value) || 0)}
                                                            className={`w-full p-2 rounded-xl font-black text-center text-sm ${theme.inputBg} border ${theme.borderLight}`} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[9px] font-black uppercase ${theme.textMuted} mb-1`}>Disc ₹</p>
                                                        <input type="number" min="0" step="any" value={row.discountAmount || ""}
                                                            onChange={(e) => handleItemChange(idx, "discountAmount", parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                            className={`w-full p-2 rounded-xl font-black text-center text-sm text-emerald-600 ${theme.inputBg} border ${theme.borderLight}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <div className={`${theme.surfaceBg} rounded-2xl md:rounded-[40px] shadow-md md:shadow-2xl p-4 md:p-12 border ${theme.borderLight}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                            <div className="space-y-4">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Payment method</p>
                                {/* 2-column grid on mobile for payment buttons */}
                                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2">
                                    {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setPaymentMethod(id)}
                                            className={`w-full py-3 md:w-auto md:px-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                                paymentMethod === id
                                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                                                    : `${theme.mode === "dark" ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`
                                            }`}
                                        >
                                            <Icon size={16} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>
                                        Bill Discount
                                    </label>
                                    <div className={`rounded-2xl border ${theme.borderLight} ${theme.inputBg} overflow-hidden`}>
                                        <div className={`flex items-center border-b ${theme.borderLight}`}>
                                            <span className={`px-3 text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Discount</span>
                                            <div className="ml-auto flex">
                                                <button type="button"
                                                    onClick={() => setDiscountType('flat')}
                                                    className={`px-3 py-1.5 text-[10px] font-black transition-all ${discountType === 'flat' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:opacity-80`}`}>
                                                    ₹ Flat
                                                </button>
                                                <button type="button"
                                                    onClick={() => setDiscountType('percent')}
                                                    className={`px-3 py-1.5 text-[10px] font-black transition-all ${discountType === 'percent' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:opacity-80`}`}>
                                                    % Off
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.discountTotal}
                                            onChange={(e) => {
                                                const raw = parseFloat(e.target.value) || 0;
                                                // If percent, compute actual discount amount from subtotal
                                                const discAmt = discountType === 'percent'
                                                    ? parseFloat(((billDetails.subtotal * raw) / 100).toFixed(4))
                                                    : raw;
                                                setFormData((prev) => ({ ...prev, discountTotal: discAmt }));
                                            }}
                                            placeholder={discountType === 'percent' ? "Enter %" : "Enter amount"}
                                            className={`w-full px-4 py-3 font-black outline-none bg-transparent ${theme.textPrimary}`}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className={`p-4 md:p-8 rounded-2xl md:rounded-3xl ${theme.mode === "dark" ? "bg-indigo-950/40" : "bg-indigo-50"} space-y-3`}>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className={theme.textMuted}>Subtotal</span>
                                    <span>{formatCurrency(billDetails.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className={theme.textMuted}>Tax</span>
                                    <span>{formatCurrency(billDetails.taxAmount)}</span>
                                </div>
                                {billDetails.appliedOffers?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className={`text-[10px] font-black uppercase tracking-widest text-emerald-600`}>Applied Offers</p>
                                        {billDetails.appliedOffers.map((offer, idx) => (
                                            <div key={offer.offerId || idx} className="flex justify-between items-center text-sm font-bold text-emerald-600 gap-2">
                                                <span className="truncate">{offer.name}</span>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span>-{formatCurrency(offer.discount)}</span>
                                                    {offer.offerId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => dismissOffer(offer.offerId)}
                                                            className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                                            title="Remove offer"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {formData.discountTotal > 0 && (
                                    <div className="flex justify-between text-sm font-bold text-orange-600">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(formData.discountTotal)}</span>
                                    </div>
                                )}
                                <div className={`flex justify-between items-center pt-4 border-t ${theme.borderLight}`}>
                                    <span className={`text-base md:text-lg font-black ${theme.textHeading}`}>Grand total</span>
                                    <span className="text-xl md:text-3xl font-black text-indigo-600">
                                        {formatCurrency(billDetails.finalTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-6 md:mt-10 md:flex-row">
                            <button
                                type="submit"
                                disabled={loading || formData.items.length === 0}
                                className="w-full md:flex-[2] py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {loading ? "Saving..." : "Complete sale"}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/sales-history")}
                                className={`w-full md:flex-1 py-2.5 md:py-4 rounded-2xl font-black uppercase tracking-widest text-sm ${theme.mode === "dark" ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {isProductModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-8">
                    <div className={`w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] overflow-hidden md:rounded-[40px] shadow-2xl relative flex flex-col ${theme.surfaceBg}`}>
                        <button
                            type="button"
                            onClick={() => setIsProductModalOpen(false)}
                            className={`absolute top-6 right-6 z-10 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full ${theme.textMuted}`}
                        >
                            <X size={24} />
                        </button>
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <ProductPage
                                asDialog
                                onClose={handleProductDialogClose}
                                fixedBranchId={formData.branchId || activeBranchId}
                                prefillData={productPrefillData}
                                sourcePage="sale"
                                activeTabOverride={productPrefillData?.itemType === "TRADE" ? "trade" : "raw"}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalePage;
