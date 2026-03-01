import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus, Search, Eye, Edit3, Trash2, ShoppingCart, Calendar,
    CheckCircle, Clock, AlertCircle, X, Package, User, Building,
    FileText, Calculator, Save, ChevronDown, ArrowLeft, Truck,
    BadgeIndianRupee, TrendingUp, ReceiptText, XCircle, CheckCheck, CreditCard,
    MapPin, Hash, Info
} from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { PurchaseService } from "../../services/PurchaseService";
import { SupplierService } from "../Suppliers/SupplierService";
import { itemService, shopService, branchService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { useTheme } from "../../context/ThemeContext";

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (val) =>
    val != null ? `₹${Number(val).toFixed(2)}` : "₹0.00";

const STATUS_PILL = {
    CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-100   text-red-600    border-red-200",
    DRAFT: "bg-amber-100 text-amber-700  border-amber-200",
};

const PAY_PILL = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-100",
    PARTIAL: "bg-blue-50    text-blue-700    border-blue-100",
    UNPAID: "bg-gray-100   text-gray-500    border-gray-200",
};



const PurchaseDetailModal = ({ purchaseId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        PurchaseService.getPurchaseById(purchaseId)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [purchaseId]);

    const purchase = data?.purchase;
    const items = data?.items || [];
    const payments = data?.payments || [];

    const STATUS_COLOR = {
        CONFIRMED: "bg-emerald-100 text-emerald-700",
        CANCELLED: "bg-red-100 text-red-600",
        DRAFT: "bg-amber-100 text-amber-700",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-4xl max-h-[95vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden ${theme.surfaceBg}`}>

                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-indigo-700 to-indigo-500 rounded-t-[32px] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <ReceiptText className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">
                                {loading ? "Loading…" : (purchase?.purchaseNumber || "Purchase Detail")}
                            </h2>
                            {purchase && (
                                <p className="text-indigo-200 text-xs font-bold mt-0.5">
                                    {purchase.supplierId?.name || "—"} · {new Date(purchase.createdAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {purchase && (
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black ${STATUS_COLOR[purchase.status] || STATUS_COLOR.DRAFT}`}>
                                {purchase.status}
                            </span>
                        )}
                        <button onClick={onClose} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────────── */}
                <div className="overflow-y-auto flex-1 p-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading…</p>
                        </div>
                    ) : !purchase ? (
                        <p className="text-center text-gray-400 py-20">Purchase not found.</p>
                    ) : (
                        <>
                            {/* ── Info Cards ── */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Supplier Invoice", value: purchase.supplierInvoiceNumber || "—" },
                                    { label: "Invoice Date", value: purchase.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString() : "—" },
                                    { label: "Branch", value: purchase.branchId?.name || "—" },
                                    { label: "Payment Status", value: purchase.paymentStatus || "UNPAID" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
                                        <div className="font-black text-gray-800 text-sm truncate">{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Line Items ── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                    <Package size={16} className="text-indigo-500" />
                                    <span className="font-black text-gray-700 text-sm uppercase tracking-widest">Items ({items.length})</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {["Item", "Batch / Expiry", "Qty", "Free Qty", "Price", "Tax", "Discount", "Total"].map(h => (
                                                    <th key={h} className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {items.length === 0 ? (
                                                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-300 text-xs">No items recorded</td></tr>
                                            ) : items.map((it, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-800">{it.itemId?.name || "—"}</div>
                                                        <div className="text-[10px] text-gray-400">{it.itemId?.itemCode || ""}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs font-bold text-gray-600">{it.batchNo || "—"}</div>
                                                        {it.expiryDate && <div className="text-[10px] text-orange-500">{new Date(it.expiryDate).toLocaleDateString()}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-700">{it.quantity}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600">{it.freeQuantity || 0}</td>
                                                    <td className="px-4 py-3 font-bold text-gray-700">{fmt(it.purchasePrice)}</td>
                                                    <td className="px-4 py-3 text-blue-600 font-bold">{fmt(it.taxAmount)}</td>
                                                    <td className="px-4 py-3 text-orange-500 font-bold">{fmt(it.discountAmount)}</td>
                                                    <td className="px-4 py-3 font-black text-indigo-700">{fmt(it.totalAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── Totals + Payments side by side ── */}
                            <div className="grid md:grid-cols-2 gap-4">

                                {/* Totals */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calculator size={14} className="text-indigo-500" />
                                        <span className="font-black text-gray-700 text-xs uppercase tracking-widest">Summary</span>
                                    </div>
                                    {[
                                        { label: "Subtotal", value: purchase.subtotal, cls: "text-gray-700" },
                                        { label: "Tax", value: purchase.taxTotal, cls: "text-blue-600" },
                                        { label: "Discount", value: purchase.discountTotal, cls: "text-orange-500" },
                                        { label: "Grand Total", value: purchase.grandTotal, cls: "text-indigo-700 font-black text-base" },
                                        { label: "Paid", value: purchase.paidAmount, cls: "text-emerald-600" },
                                        { label: "Balance Due", value: purchase.balanceAmount, cls: "text-red-600 font-black" },
                                    ].map(({ label, value, cls }) => (
                                        <div key={label} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 font-bold">{label}</span>
                                            <span className={`font-bold ${cls}`}>{fmt(value)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Payments */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                        <CreditCard size={14} className="text-emerald-500" />
                                        <span className="font-black text-gray-700 text-xs uppercase tracking-widest">Payments ({payments.length})</span>
                                    </div>
                                    {payments.length === 0 ? (
                                        <p className="text-center text-gray-300 text-xs py-8">No payments recorded</p>
                                    ) : (
                                        <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                                            {payments.map((p, i) => (
                                                <div key={i} className="px-5 py-3 flex justify-between items-center">
                                                    <div>
                                                        <div className="text-xs font-black text-gray-700">{p.paymentMethod?.replace("_", " ")}</div>
                                                        <div className="text-[10px] text-gray-400">
                                                            {new Date(p.paymentDate).toLocaleDateString()}
                                                            {p.referenceNumber ? ` · ${p.referenceNumber}` : ""}
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-emerald-600 text-sm">{fmt(p.amount)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ════════════════════════════════════════════════════════════════════════════

const PaymentModal = ({ purchase, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(purchase.balanceAmount || 0);
    const [method, setMethod] = useState("CASH");
    const [ref, setRef] = useState("");
    const [saving, setSaving] = useState(false);
    const { theme } = useTheme();

    const handlePay = async (e) => {
        e.preventDefault();
        if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
        setSaving(true);
        try {
            await PurchaseService.addPayment({
                purchaseId: purchase._id,
                amount: Number(amount),
                paymentMethod: method,
                referenceNumber: ref,
                paymentDate: new Date(),
            });
            onSuccess();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to record payment.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden ${theme.surfaceBg}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/20 rounded-2xl">
                            <CreditCard className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">Record Payment</h2>
                            <p className="text-emerald-100 text-[11px] font-bold">{purchase.purchaseNumber} · Balance: {fmt(purchase.balanceAmount)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handlePay} className="p-7 space-y-5">
                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Paid (₹)</label>
                        <input
                            type="number" min={0.01} step="any" required
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-emerald-400 rounded-2xl outline-none font-black text-2xl text-emerald-600 transition-all"
                        />
                        <p className="text-[10px] font-bold text-gray-400">Max balance: {fmt(purchase.balanceAmount)}</p>
                    </div>

                    {/* Method */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Method</label>
                        <div className="relative">
                            <select
                                value={method}
                                onChange={e => setMethod(e.target.value)}
                                className="w-full appearance-none p-4 bg-gray-50 border-2 border-gray-100 focus:border-emerald-400 rounded-2xl outline-none font-bold text-gray-700 transition-all pr-10"
                            >
                                {["CASH", "BANK_TRANSFER", "CHEQUE", "UPI", "CARD"].map(m => (
                                    <option key={m} value={m}>{m.replace("_", " ")}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Reference */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference / Txn No. <span className="normal-case text-gray-300">(optional)</span></label>
                        <input
                            placeholder="e.g. TXN-12345"
                            value={ref}
                            onChange={e => setRef(e.target.value)}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-emerald-400 rounded-2xl outline-none font-bold text-gray-700 transition-all"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-black text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all text-sm">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 ${saving ? "bg-emerald-200 text-white cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                                }`}>
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CreditCard size={16} />}
                            {saving ? "Saving..." : "Record Payment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE LIST
// ════════════════════════════════════════════════════════════════════════════

const PurchaseList = ({ hasPermissionFor }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [payTarget, setPayTarget] = useState(null); // purchase row for payment modal
    const [viewTarget, setViewTarget] = useState(null); // purchase id for detail modal

    // Supporting data
    const [shopId, setShopId] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [stockItems, setStockItems] = useState([]);

    // ── Permissions
    const access = ROUTE_ACCESS.PURCHASES;
    const canView = hasPermissionFor?.(access.module, access.resource, "view") ||
        hasPermissionFor?.(access.module, access.resource, "manage");
    const canManage = hasPermissionFor?.(access.module, access.resource, "manage");

    // ── Bootstrap
    useEffect(() => {
        if (!user) return;
        const init = async () => {
            try {
                const userId = user.id || user._id;
                const shopData = await shopService.getShopDataByUserId(userId);
                const id = shopData.shop?._id || shopData.organization?._id || shopData._id;
                setShopId(id);

                const [suppRes, branchRes, itemRes] = await Promise.all([
                    SupplierService.getSuppliers(id),
                    branchService.getBranchesByShopId(id),
                    itemService.getItems({ filters: { shopid: id, itemType: "STOCK" }, limit: 200 }),
                ]);
                setSuppliers(suppRes);
                setBranches(branchRes);
                setStockItems(itemRes.data || []);
            } catch (err) {
                console.error("Init error:", err);
            }
        };
        init();
    }, [user]);

    useEffect(() => {
        if (shopId) loadPurchases();
    }, [shopId]);

    const loadPurchases = async () => {
        setLoading(true);
        try {
            const data = await PurchaseService.getPurchases({ shopId });
            setPurchases(Array.isArray(data) ? data : data.purchases || []);
        } catch (err) {
            console.error("Failed to load purchases", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this draft purchase?")) return;
        try {
            await PurchaseService.deletePurchase(id);
            loadPurchases();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to delete.");
        }
    };

    const handleConfirm = async (id) => {
        if (!window.confirm("Confirm this purchase? This will update inventory stock levels.")) return;
        try {
            await PurchaseService.confirmPurchase(id);
            loadPurchases();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to confirm purchase.");
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Cancel this draft purchase? This cannot be undone.")) return;
        try {
            await PurchaseService.cancelPurchase(id);
            loadPurchases();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to cancel purchase.");
        }
    };

    // ── Columns
    const columns = [
        {
            header: "Invoice",
            key: "purchaseNumber",
            render: (val, row) => (
                <div>
                    <div className={`font-black ${theme.textPrimary}`}>{val}</div>
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${theme.textSecondary} mt-0.5 uppercase`}>
                        <Calendar size={9} />
                        {row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : "—"}
                    </div>
                </div>
            ),
        },
        {
            header: "Supplier",
            key: "supplierId",
            render: val => <span className={`font-bold ${theme.textPrimary}`}>{val?.name || "—"}</span>,
        },
        {
            header: "Grand Total",
            key: "grandTotal",
            render: val => <span className="font-black text-indigo-600">{fmt(val)}</span>,
        },
        {
            header: "Payment",
            key: "paymentStatus",
            render: (val, row) => (
                <div className="space-y-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border ${PAY_PILL[val] || PAY_PILL.UNPAID}`}>
                        {val || "UNPAID"}
                    </span>
                    {val !== "PAID" && row.balanceAmount > 0 && (
                        <div className="text-[9px] font-bold text-red-500">Bal: {fmt(row.balanceAmount)}</div>
                    )}
                </div>
            ),
        },
        {
            header: "Status",
            key: "status",
            render: val => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_PILL[val] || STATUS_PILL.DRAFT}`}>
                    {val === "CONFIRMED" ? <CheckCircle size={9} /> : val === "CANCELLED" ? <AlertCircle size={9} /> : <Clock size={9} />}
                    {val || "DRAFT"}
                </span>
            ),
        },
        {
            header: "Actions",
            key: "_id",
            headerClassName: "text-right",
            className: "text-right",
            render: (id, row) => (
                <div className="flex justify-end gap-2">
                    {/* 👁 View — always visible */}
                    <button
                        onClick={() => setViewTarget(row._id)}
                        className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                        title="View details"
                    ><Eye size={15} /></button>
                    {/* 💳 Pay — CONFIRMED with remaining balance */}
                    {canManage && row.status === "CONFIRMED" && row.balanceAmount > 0 && (
                        <button
                            onClick={() => setPayTarget(row)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                            title="Record Payment"
                        ><CreditCard size={15} /></button>
                    )}
                    {/* Confirm — green, only for DRAFT */}
                    {canManage && row.status === "DRAFT" && (
                        <button
                            onClick={() => handleConfirm(id)}
                            className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
                            title="Confirm Purchase (updates inventory)"
                        ><CheckCheck size={15} /></button>
                    )}
                    {/* Cancel — orange, only for DRAFT */}
                    {canManage && row.status === "DRAFT" && (
                        <button
                            onClick={() => handleCancel(id)}
                            className="p-2 text-orange-500 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all"
                            title="Cancel Purchase"
                        ><XCircle size={15} /></button>
                    )}
                    {/* Delete — red, only for DRAFT */}
                    {canManage && row.status === "DRAFT" && (
                        <button
                            onClick={() => handleDelete(id)}
                            className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                            title="Delete draft"
                        ><Trash2 size={15} /></button>
                    )}
                </div>
            ),
        },
    ];

    const filtered = purchases.filter(p =>
        (p.purchaseNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplierId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplierInvoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Access Denied
    if (!canView) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme.pageBg}`}>
                <div className={`text-center p-12 rounded-[40px] shadow-xl border max-w-md ${theme.surfaceBg} ${theme.borderLight}`}>
                    <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingCart size={40} />
                    </div>
                    <h2 className={`text-2xl font-black mb-2 ${theme.textHeading}`}>Access Restricted</h2>
                    <p className={`font-medium ${theme.textMuted}`}>You don't have permission to view Purchases.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                                <ShoppingCart size={26} />
                            </div>
                            <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${theme.textHeading}`}>Purchases</h1>
                        </div>
                        <p className={`font-bold ml-1 text-sm ${theme.textMuted}`}>Manage inventory procurement &amp; supplier invoices</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search invoice or supplier..."
                                className="w-full pl-12 pr-4 py-4 border-2 border-transparent bg-white rounded-2xl shadow-sm outline-none focus:border-indigo-500 transition-all font-bold placeholder:font-medium placeholder:text-gray-300"
                            />
                        </div>

                        {/* ★ Button always visible; manages action permission internally */}
                        {canManage && (
                            <button
                                onClick={() => navigate("/purchases/new")}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 group whitespace-nowrap"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                NEW PURCHASE
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: "Total Invoices", value: purchases.length, icon: ReceiptText, color: "indigo" },
                        { label: "Draft", value: purchases.filter(p => p.status === "DRAFT").length, icon: Clock, color: "amber" },
                        { label: "Confirmed", value: purchases.filter(p => p.status === "CONFIRMED").length, icon: CheckCircle, color: "emerald" },
                        { label: "Total Value", value: fmt(purchases.reduce((a, p) => a + (p.grandTotal || 0), 0)), icon: BadgeIndianRupee, color: "indigo" },
                        { label: "Total Due", value: fmt(purchases.reduce((a, p) => a + (p.balanceAmount || 0), 0)), icon: BadgeIndianRupee, color: "red" },
                    ].map(({ label, value, icon: Icon, color, wide }) => (
                        <div key={label} className={`${theme.surfaceBg} rounded-3xl shadow-sm border ${theme.borderLight} p-6 flex items-center gap-5 ${wide ? "col-span-2 md:col-span-1" : ""}`}>
                            <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <div className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>{label}</div>
                                <div className={`text-xl font-black mt-0.5 ${theme.textHeading}`}>{value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Table ── */}
                {loading ? (
                    <div className={`${theme.surfaceBg} rounded-[40px] p-20 shadow-xl border ${theme.borderLight} flex flex-col items-center gap-4`}>
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className={`font-black uppercase tracking-widest text-[10px] ${theme.textMuted}`}>Loading Invoices…</p>
                    </div>
                ) : (
                    <CommonTable columns={columns} data={filtered} />
                )}
            </div>

            {/* ── Detail Modal ── */}
            {viewTarget && (
                <PurchaseDetailModal
                    purchaseId={viewTarget}
                    onClose={() => setViewTarget(null)}
                />
            )}

            {/* ── Pay Modal ── */}
            {payTarget && (
                <PaymentModal
                    purchase={payTarget}
                    onClose={() => setPayTarget(null)}
                    onSuccess={() => { setPayTarget(null); loadPurchases(); }}
                />
            )}
        </div>
    );
};

export default PurchaseList;
