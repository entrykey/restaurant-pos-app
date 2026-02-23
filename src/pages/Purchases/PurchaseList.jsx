import React, { useState, useEffect, useMemo, useRef } from "react";
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

// ── Empty Item Row ────────────────────────────────────────────────────────────

const EMPTY_ITEM = () => ({
    itemId: "", name: "", itemCode: "",
    quantity: 1, purchasePrice: 0,
    taxAmount: 0, discountAmount: 0,
    batchNo: "", expiryDate: ""
});

const EMPTY_FORM = () => ({
    supplierId: "",
    branchId: "",
    supplierInvoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    items: [],
    paidAmount: 0,
});

// ════════════════════════════════════════════════════════════════════════════
// CREATE PURCHASE MODAL
// ════════════════════════════════════════════════════════════════════════════

const CreatePurchaseModal = ({ onClose, onSuccess, shopId, branches, suppliers, stockItems }) => {
    const [form, setForm] = useState(EMPTY_FORM());
    const [saving, setSaving] = useState(false);
    const [itemQuery, setItemQuery] = useState("");
    const [showItemDrop, setShowItemDrop] = useState(false);
    const itemSearchRef = useRef(null);
    const { user } = useAuth();

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (itemSearchRef.current && !itemSearchRef.current.contains(e.target))
                setShowItemDrop(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // set default branch
    useEffect(() => {
        if (branches.length && !form.branchId)
            setForm(f => ({ ...f, branchId: branches[0]._id }));
    }, [branches]);

    const totals = useMemo(() => {
        const sub = form.items.reduce((a, it) => a + it.quantity * it.purchasePrice, 0);
        const tax = form.items.reduce((a, it) => a + (Number(it.taxAmount) || 0), 0);
        const disc = form.items.reduce((a, it) => a + (Number(it.discountAmount) || 0), 0);
        const grand = sub + tax - disc;
        const bal = grand - (Number(form.paidAmount) || 0);
        return { sub, tax, disc, grand, bal };
    }, [form.items, form.paidAmount]);

    const filteredItems = stockItems
        .filter(it =>
            it.name.toLowerCase().includes(itemQuery.toLowerCase()) ||
            (it.itemCode || "").toLowerCase().includes(itemQuery.toLowerCase())
        )
        .slice(0, 6);

    const addItem = (item) => {
        if (form.items.some(i => i.itemId === item._id)) return;
        setForm(f => ({
            ...f,
            items: [...f.items, {
                ...EMPTY_ITEM(),
                itemId: item._id,
                name: item.name,
                itemCode: item.itemCode || "",
                purchasePrice: item.pricing?.purchasePrice || 0,
            }]
        }));
        setItemQuery("");
        setShowItemDrop(false);
    };

    const removeItem = (idx) =>
        setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

    const updateItem = (idx, field, val) =>
        setForm(f => {
            const items = [...f.items];
            items[idx] = { ...items[idx], [field]: val };
            return { ...f, items };
        });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.items.length) { alert("Add at least one item."); return; }
        setSaving(true);
        try {
            const itemsWithTotal = form.items.map(it => ({
                ...it,
                totalAmount: (Number(it.quantity) * Number(it.purchasePrice))
                    + (Number(it.taxAmount) || 0)
                    - (Number(it.discountAmount) || 0),
            }));
            await PurchaseService.createPurchase({
                ...form,
                items: itemsWithTotal,
                shopId,
                subtotal: totals.sub,
                taxTotal: totals.tax,
                discountTotal: totals.disc,
                grandTotal: totals.grand,
                balanceAmount: totals.bal,
            });
            onSuccess();
        } catch (err) {
            alert(err?.response?.data?.message || err.message || "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {/* ── Panel ── */}
            <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-t-[32px]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <ReceiptText className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">New Purchase Invoice</h2>
                            <p className="text-indigo-200 text-xs font-bold mt-0.5">Create draft · Items · Confirm later</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-6 bg-gray-50/50">
                    <form id="purchase-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Row 1 – General Info */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                            {/* Supplier */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <Truck size={11} /> Supplier *
                                </label>
                                <div className="relative">
                                    <select
                                        required
                                        className="w-full appearance-none p-4 bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-700 shadow-sm pr-10"
                                        value={form.supplierId}
                                        onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
                                    >
                                        <option value="">Select...</option>
                                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Branch */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <Building size={11} /> Branch *
                                </label>
                                <div className="relative">
                                    <select
                                        required
                                        className="w-full appearance-none p-4 bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-700 shadow-sm pr-10"
                                        value={form.branchId}
                                        onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                    >
                                        {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Invoice No */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <FileText size={11} /> Supplier Invoice No *
                                </label>
                                <input
                                    required
                                    placeholder="e.g. INV-001"
                                    className="w-full p-4 bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-700 shadow-sm"
                                    value={form.supplierInvoiceNumber}
                                    onChange={e => setForm(f => ({ ...f, supplierInvoiceNumber: e.target.value }))}
                                />
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <Calendar size={11} /> Invoice Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-4 bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-700 shadow-sm"
                                    value={form.invoiceDate}
                                    onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* ── Items Section ── */}
                        <div className="bg-white border border-gray-100 rounded-[28px] shadow-sm overflow-hidden">
                            {/* Item header & search */}
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                                        <Package size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-800 text-sm uppercase tracking-tight">Line Items</h3>
                                        <p className="text-[10px] font-bold text-gray-400">{form.items.length} item{form.items.length !== 1 ? "s" : ""} added</p>
                                    </div>
                                </div>

                                {/* Item search */}
                                <div className="relative w-full md:w-80" ref={itemSearchRef}>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            value={itemQuery}
                                            onChange={e => { setItemQuery(e.target.value); setShowItemDrop(true); }}
                                            onFocus={() => setShowItemDrop(true)}
                                            placeholder="Search & add stock items..."
                                            className="w-full pl-11 pr-4 py-3 bg-indigo-50 border-2 border-indigo-100 focus:border-indigo-500 rounded-xl outline-none font-bold text-gray-700 transition-all text-sm"
                                        />
                                    </div>
                                    {showItemDrop && itemQuery && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50">
                                            {filteredItems.length ? filteredItems.map(item => (
                                                <button
                                                    key={item._id}
                                                    type="button"
                                                    onClick={() => addItem(item)}
                                                    className="w-full px-5 py-3.5 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-black text-gray-800 text-sm">{item.name}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.itemCode}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-indigo-500">{fmt(item.pricing?.purchasePrice)}</span>
                                                        <Plus size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </button>
                                            )) : (
                                                <div className="p-5 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">No stock items found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items table */}
                            <div className="overflow-x-auto min-h-[180px]">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/70">
                                        <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                            <th className="py-4 px-5">#</th>
                                            <th className="py-4 px-3">Item</th>
                                            <th className="py-4 px-3 w-24 text-center">Qty</th>
                                            <th className="py-4 px-3 w-32">Price (₹)</th>
                                            <th className="py-4 px-3 w-28">Batch</th>
                                            <th className="py-4 px-3 w-28">Expiry</th>
                                            <th className="py-4 px-3 text-right">Total</th>
                                            <th className="py-4 px-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {form.items.map((it, idx) => (
                                            <tr key={it.itemId} className="hover:bg-indigo-50/20 transition-colors">
                                                <td className="py-4 px-5 text-gray-300 font-black text-sm">{idx + 1}</td>
                                                <td className="py-4 px-3">
                                                    <div className="font-black text-gray-800 text-sm">{it.name}</div>
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase">{it.itemCode}</div>
                                                </td>
                                                <td className="py-4 px-3">
                                                    <input
                                                        type="number" min={0.01} step="any"
                                                        value={it.quantity}
                                                        onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                                        className="w-full text-center p-2 rounded-xl bg-gray-50 border-2 border-transparent focus:border-indigo-400 outline-none font-black text-indigo-600 text-sm"
                                                    />
                                                </td>
                                                <td className="py-4 px-3">
                                                    <input
                                                        type="number" min={0} step="any"
                                                        value={it.purchasePrice}
                                                        onChange={e => updateItem(idx, "purchasePrice", parseFloat(e.target.value) || 0)}
                                                        className="w-full p-2 rounded-xl bg-gray-50 border-2 border-transparent focus:border-indigo-400 outline-none font-black text-gray-700 text-sm"
                                                    />
                                                </td>
                                                <td className="py-4 px-3">
                                                    <input
                                                        placeholder="Batch#"
                                                        value={it.batchNo}
                                                        onChange={e => updateItem(idx, "batchNo", e.target.value)}
                                                        className="w-full p-2 rounded-xl bg-gray-50 border-2 border-transparent focus:border-indigo-400 outline-none font-bold text-gray-600 text-xs uppercase"
                                                    />
                                                </td>
                                                <td className="py-4 px-3">
                                                    <input
                                                        type="date"
                                                        value={it.expiryDate}
                                                        onChange={e => updateItem(idx, "expiryDate", e.target.value)}
                                                        className="w-full p-2 rounded-xl bg-gray-50 border-2 border-transparent focus:border-indigo-400 outline-none font-bold text-gray-600 text-xs"
                                                    />
                                                </td>
                                                <td className="py-4 px-3 text-right">
                                                    <span className="font-black text-gray-800 text-sm">
                                                        {fmt(it.quantity * it.purchasePrice)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-3">
                                                    <button
                                                        type="button" onClick={() => removeItem(idx)}
                                                        className="p-1.5 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    ><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {!form.items.length && (
                                            <tr>
                                                <td colSpan={8} className="py-12 text-center">
                                                    <div className="flex flex-col items-center gap-3 text-gray-300">
                                                        <Package size={36} strokeWidth={1.5} />
                                                        <p className="font-black uppercase tracking-widest text-[10px]">Search and add items above</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Footer: Notes + Totals ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Add any notes or remarks..."
                                    rows={5}
                                    className="w-full p-4 bg-white border-2 border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-gray-700 resize-none shadow-sm text-sm"
                                />
                            </div>

                            {/* Totals */}
                            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-3">
                                {[
                                    ["Subtotal", fmt(totals.sub), "text-gray-800"],
                                    ["Tax", fmt(totals.tax), "text-gray-800"],
                                    ["Discount (−)", fmt(totals.disc), "text-emerald-600"],
                                ].map(([label, val, cls]) => (
                                    <div key={label} className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-400">{label}</span>
                                        <span className={`font-black ${cls}`}>{val}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                                    <span className="font-black text-gray-800 uppercase tracking-wide text-xs">Grand Total</span>
                                    <span className="font-black text-2xl text-indigo-600">{fmt(totals.grand)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                                    <label className="font-black text-gray-500 text-xs uppercase tracking-wide">Paid Now</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                        <input
                                            type="number" min={0}
                                            value={form.paidAmount}
                                            onChange={e => setForm(f => ({ ...f, paidAmount: parseFloat(e.target.value) || 0 }))}
                                            className="pl-7 pr-3 py-2 font-black text-right bg-white border-2 border-gray-100 focus:border-indigo-400 rounded-xl outline-none w-32 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-400 text-xs uppercase">Balance Due</span>
                                    <span className={`font-black text-sm ${totals.bal > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                        {fmt(totals.bal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* ── Footer Buttons ── */}
                <div className="px-8 py-5 border-t border-gray-100 bg-white rounded-b-[32px] flex items-center justify-between gap-4">
                    <button
                        type="button" onClick={onClose}
                        className="px-8 py-3.5 rounded-2xl font-black text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit" form="purchase-form" disabled={saving}
                        className={`px-10 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-2xl shadow-indigo-200 ${saving
                            ? "bg-indigo-200 text-white cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                            }`}
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        {saving ? "Saving..." : "Save Draft"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE DETAIL MODAL
// ════════════════════════════════════════════════════════════════════════════

const PurchaseDetailModal = ({ purchaseId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

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
            <div className="bg-gray-50 w-full max-w-4xl max-h-[95vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden">

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
            <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden">
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
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreate, setShowCreate] = useState(false);
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
                    <div className="font-black text-gray-800">{val}</div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 mt-0.5 uppercase">
                        <Calendar size={9} />
                        {row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : "—"}
                    </div>
                </div>
            ),
        },
        {
            header: "Supplier",
            key: "supplierId",
            render: val => <span className="font-bold text-gray-700">{val?.name || "—"}</span>,
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
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-12 bg-white rounded-[40px] shadow-xl border max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingCart size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-400 font-medium">You don't have permission to view Purchases.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full bg-gray-50/30 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* ── Page Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                                <ShoppingCart size={26} />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">Purchases</h1>
                        </div>
                        <p className="text-gray-400 font-bold ml-1 text-sm">Manage inventory procurement &amp; supplier invoices</p>
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
                                onClick={() => setShowCreate(true)}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 group whitespace-nowrap"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                NEW PURCHASE
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Total Invoices", value: purchases.length, icon: ReceiptText, color: "indigo" },
                        { label: "Draft", value: purchases.filter(p => p.status === "DRAFT").length, icon: Clock, color: "amber" },
                        { label: "Confirmed", value: purchases.filter(p => p.status === "CONFIRMED").length, icon: CheckCircle, color: "emerald" },
                        { label: "Total Value", value: fmt(purchases.reduce((a, p) => a + (p.grandTotal || 0), 0)), icon: BadgeIndianRupee, color: "indigo", wide: true },
                    ].map(({ label, value, icon: Icon, color, wide }) => (
                        <div key={label} className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 ${wide ? "col-span-2 md:col-span-1" : ""}`}>
                            <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
                                <div className="text-xl font-black text-gray-800 mt-0.5">{value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Table ── */}
                {loading ? (
                    <div className="bg-white rounded-[40px] p-20 shadow-xl border border-gray-100 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Loading Invoices…</p>
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

            {/* ── Create Modal ── */}
            {/* ── Detail Modal ── */}
            {viewTarget && (
                <PurchaseDetailModal
                    purchaseId={viewTarget}
                    onClose={() => setViewTarget(null)}
                />
            )}

            {/* ── Create Modal ── */}
            {showCreate && (
                <CreatePurchaseModal
                    shopId={shopId}
                    suppliers={suppliers}
                    branches={branches}
                    stockItems={stockItems}
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => { setShowCreate(false); loadPurchases(); }}
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
