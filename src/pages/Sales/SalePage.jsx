import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    ArrowLeft, Save, Plus, Trash2, Search, User, Building, Package,
    Check, X, Phone, MapPin, Loader2, ShoppingBag, CreditCard, Banknote
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { itemService, shopService, taxService, unitService, orderService, customerService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import ProductPage from "../Inventory/ProductPage";
import DatePicker from "../../components/ui/DatePicker";
import CommonSelect from "../../components/ui/CommonSelect";
import { toast } from "react-hot-toast";

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
            setStockItems(itemsRes.data || []);
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

    const handleAddItem = useCallback((item) => {
        if (!item?._id) return;
        setFormData((prev) => {
            if (prev.items.some((it) => it.itemId === item._id)) {
                toast.error("Item already added. Adjust quantity in the list.");
                return prev;
            }
            const sellingPrice = item.pricing?.sellingPrice ?? item.sellingPrice ?? 0;
            const taxPercent = item.taxPercent || 0;
            const newItem = {
                itemId: item._id,
                name: item.name,
                itemCode: item.itemCode,
                quantity: 1,
                sellingPrice,
                discountAmount: 0,
                taxId: item.taxId || null,
                taxPercent,
                taxAmount: calcLineTax(sellingPrice, 1, taxPercent),
                unitId: item.unitId?._id || item.unitId,
                primaryUnitName: item.unitId?.name || "",
                unitName: item.unitId?.name || "",
                secondaryUnitId: item.secondaryUnitId?._id || item.secondaryUnitId,
                secondaryUnitName: item.secondaryUnitId?.name || "",
                conversionFactor: item.conversionFactor || 1,
                selectedUnit: item.defaultSaleUnit || item.defaultPurchaseUnit || "PRIMARY",
            };
            return { ...prev, items: [...prev.items, newItem] };
        });
    }, []);

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

    const { subtotal, taxTotal } = useMemo(() => {
        if (!formData.items?.length) return { subtotal: 0, taxTotal: 0 };
        const totals = formData.items.reduce(
            (acc, it) => {
                const taxObj = it.taxId
                    ? shopTaxes.find((t) => t._id === it.taxId)
                    : shopTaxes.find((t) => t.percentage === Number(it.taxPercent || 0));
                const isExclusive = taxObj ? taxObj.taxType === "EXCLUSIVE" : false;
                if (isExclusive) {
                    acc.subtotal += it.quantity * it.sellingPrice;
                    acc.taxTotal += it.taxAmount || 0;
                } else {
                    acc.subtotal += it.quantity * it.sellingPrice - (it.taxAmount || 0);
                    acc.taxTotal += it.taxAmount || 0;
                }
                return acc;
            },
            { subtotal: 0, taxTotal: 0 }
        );
        return {
            subtotal: parseFloat(totals.subtotal.toFixed(4)),
            taxTotal: parseFloat(totals.taxTotal.toFixed(4)),
        };
    }, [formData.items, shopTaxes]);

    useEffect(() => {
        const grand = subtotal + taxTotal - (Number(formData.discountTotal) || 0);
        setFormData((prev) => ({
            ...prev,
            subtotal: parseFloat(subtotal.toFixed(4)),
            taxTotal: parseFloat(taxTotal.toFixed(4)),
            grandTotal: parseFloat(Math.max(0, grand).toFixed(4)),
        }));
    }, [subtotal, taxTotal, formData.discountTotal]);

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
        if (formData.grandTotal <= 0) {
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
                subtotal: formData.subtotal,
                discountTotal: formData.discountTotal || 0,
                taxTotal: formData.taxTotal,
                grandTotal: formData.grandTotal,
                notes: formData.notes || "Manual sale entry",
                createdBy: user?._id || user?.id,
            };

            const created = await orderService.createOrder(orderPayload);
            const orderId = created._id || created.id;

            await orderService.addPayment(orderId, {
                paymentMethod: paymentMethod.toUpperCase(),
                amount: formData.grandTotal,
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
        <div className={`min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg} p-4 md:p-8`}>
            <div className="max-w-[1400px] mx-auto space-y-8 pb-16">
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>
                    <Link to="/sales-history" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                        <ArrowLeft size={14} /> Sales History
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-black uppercase ${theme.textHeading}`}>
                            New Manual Sale
                        </h1>
                        <p className={`font-bold text-xs uppercase tracking-widest mt-1 ${theme.textMuted}`}>
                            Product selection & optional customer
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 md:p-12 border ${theme.borderLight}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <User size={12} /> Customer <span className="opacity-50">(optional)</span>
                                </label>
                                <div className="relative">
                                    {formData.customerId && selectedCustomer ? (
                                        <div className={`p-6 rounded-3xl border-2 border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-900/10 relative group`}>
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

                    <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 md:p-12 border ${theme.borderLight} space-y-6`}>
                        <h2 className={`text-xl font-black flex items-center gap-3 uppercase ${theme.textHeading}`}>
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
                            <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${theme.borderLight}`}>
                                <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
                                <p className={`font-bold ${theme.textMuted}`}>No products added yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} border-b ${theme.borderLight}`}>
                                            <th className="py-4 pr-4">Product</th>
                                            <th className="py-4 px-2 w-24">Qty</th>
                                            <th className="py-4 px-2 w-32">Price</th>
                                            <th className="py-4 px-2 w-24">Tax %</th>
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
                                            return (
                                                <tr key={row.itemId}>
                                                    <td className="py-4 pr-4">
                                                        <p className={`font-black ${theme.textPrimary}`}>{row.name}</p>
                                                        <p className={`text-[10px] font-bold ${theme.textMuted}`}>{row.itemCode}</p>
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            value={row.quantity}
                                                            onChange={(e) =>
                                                                handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                                                            }
                                                            className={`w-full p-2 rounded-xl font-black text-center ${theme.inputBg} border ${theme.borderLight}`}
                                                        />
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={row.sellingPrice}
                                                            onChange={(e) =>
                                                                handleItemChange(idx, "sellingPrice", parseFloat(e.target.value) || 0)
                                                            }
                                                            className={`w-full p-2 rounded-xl font-black text-right ${theme.inputBg} border ${theme.borderLight}`}
                                                        />
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={row.taxPercent}
                                                            onChange={(e) =>
                                                                handleItemChange(idx, "taxPercent", parseFloat(e.target.value) || 0)
                                                            }
                                                            className={`w-full p-2 rounded-xl font-black text-center ${theme.inputBg} border ${theme.borderLight}`}
                                                        />
                                                    </td>
                                                    <td className={`py-4 px-2 text-right font-black ${theme.textPrimary}`}>
                                                        {formatCurrency(lineTotal)}
                                                    </td>
                                                    <td className="py-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 md:p-12 border ${theme.borderLight}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Payment method</p>
                                <div className="flex flex-wrap gap-2">
                                    {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setPaymentMethod(id)}
                                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
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
                                        Bill discount
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.discountTotal}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                discountTotal: parseFloat(e.target.value) || 0,
                                            }))
                                        }
                                        className={`w-full p-4 rounded-2xl font-black ${theme.inputBg} border ${theme.borderLight}`}
                                    />
                                </div>
                            </div>
                            <div className={`p-8 rounded-3xl ${theme.mode === "dark" ? "bg-indigo-950/40" : "bg-indigo-50"} space-y-3`}>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className={theme.textMuted}>Subtotal</span>
                                    <span>{formatCurrency(formData.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className={theme.textMuted}>Tax</span>
                                    <span>{formatCurrency(formData.taxTotal)}</span>
                                </div>
                                {formData.discountTotal > 0 && (
                                    <div className="flex justify-between text-sm font-bold text-orange-600">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(formData.discountTotal)}</span>
                                    </div>
                                )}
                                <div className={`flex justify-between pt-4 border-t ${theme.borderLight}`}>
                                    <span className={`text-lg font-black ${theme.textHeading}`}>Grand total</span>
                                    <span className="text-3xl font-black text-indigo-600">
                                        {formatCurrency(formData.grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            <button
                                type="button"
                                onClick={() => navigate("/sales-history")}
                                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-sm ${theme.mode === "dark" ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || formData.items.length === 0}
                                className="flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                {loading ? "Saving..." : "Complete sale"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {isProductModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
                    <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl relative flex flex-col ${theme.surfaceBg}`}>
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
