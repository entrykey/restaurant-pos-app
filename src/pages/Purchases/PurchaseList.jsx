import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus, Search, Eye, Edit3, Trash2, ShoppingCart, Calendar,
    CheckCircle, CheckCircle2, Clock, AlertCircle, X, Package,
    Calculator, ChevronDown, ReceiptText, XCircle, CreditCard,
    Printer, Banknote
} from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { PurchaseService } from "../../services/PurchaseService";
import { SupplierService } from "../Suppliers/SupplierService";
import api, { itemService, shopService, branchService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-hot-toast";

// ── Helpers ─────────────────────────────────────────────────────────────────

import { formatCurrency as globalFormatCurrency } from "../../utils/format";

const fmt = (val, currency = 'USD') => {
    const code = (typeof currency === 'object' && currency !== null) ? (currency.code || currency.id || 'USD') : currency;
    return globalFormatCurrency(val || 0, code);
};

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

const confirmAction = (message, onConfirm, themeMode) => {
    toast((t) => (
        <div className={`p-4 min-w-[320px] rounded-2xl shadow-xl border ${themeMode === 'dark' ? 'bg-[#1a1c2e] border-gray-800 text-white' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 bg-orange-100 dark:bg-orange-950/20 text-orange-500 rounded-xl">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Confirm Action</h3>
                    <p className={`text-xs font-bold leading-relaxed mt-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{message}</p>
                </div>
            </div>
            <div className="flex gap-2.5 justify-end pt-2 border-t border-gray-50 dark:border-gray-800">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${themeMode === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                    Cancel
                </button>
                <button
                    onClick={() => {
                        onConfirm();
                        toast.dismiss(t.id);
                    }}
                    className="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                >
                    Confirm
                </button>
            </div>
        </div>
    ), { 
        duration: Infinity, 
        position: 'top-center',
        style: {
            background: 'transparent',
            padding: 0,
            boxShadow: 'none'
        }
    });
};

const PurchaseDetailModal = ({ purchaseId, onClose, currency, shopId: propShopId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [shopInfo, setShopInfo] = useState(null);
    const { user } = useAuth();
    const { theme } = useTheme();

    useEffect(() => {
        if (!purchaseId) return;

        // Use the passed shopId or fallback to user object
        const sid = propShopId || user?.shop_id || user?.companyId;
        
        if (!sid) {
          console.warn("No shopId found in PurchaseDetailModal, skipping shop info fetch");
          setLoading(true);
          PurchaseService.getPurchaseById(purchaseId)
            .then(purchaseData => {
                setData(purchaseData);
            })
            .catch(err => {
                console.error("Detail Fetch Error:", err);
                toast.error("Failed to load purchase details");
            })
            .finally(() => setLoading(false));
          return;
        }

        setLoading(true);
        Promise.all([
            PurchaseService.getPurchaseById(purchaseId),
            shopService.getShopById(sid)
        ])
            .then(([purchaseData, shopData]) => {
                setData(purchaseData);
                setShopInfo(shopData);
            })
            .catch(err => {
                console.error("Detail Fetch Error:", err);
                // Try to at least load the purchase if shop fetch failed
                PurchaseService.getPurchaseById(purchaseId)
                  .then(setData)
                  .catch(console.error);
            })
            .finally(() => setLoading(false));
    }, [purchaseId, propShopId, user?.shop_id, user?.companyId]);

    const purchase = data?.purchase;
    const items = data?.items || [];
    const payments = data?.payments || [];

    const handlePrint = () => {
        if (!purchase) return;

        const formatAddress = (addr) => {
            if (!addr) return '';
            const parts = [
                addr.line1,
                addr.line2,
                addr.city,
                addr.state?.name || addr.state,
                addr.pincode
            ].filter(Boolean);
            return parts.join(', ');
        };

        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Purchase Invoice - ${purchase.supplierInvoiceNumber || 'INV'}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { 
        font-family: 'Inter', -apple-system, system-ui, sans-serif; 
        padding: 0; 
        color: #1a1a1a; 
        line-height: 1.6;
        background: #fff;
      }
      .container { max-width: 800px; margin: 0 auto; }
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start;
        border-bottom: 2px solid #f0f0f0; 
        padding-bottom: 30px; 
        margin-bottom: 40px; 
      }
      .title-section h1 { 
        font-size: 32px; 
        font-weight: 900; 
        letter-spacing: -0.5px; 
        margin: 0;
        color: #000;
        text-transform: uppercase;
      }
      .meta-info { margin-top: 15px; font-size: 13px; color: #444; }
      .meta-info div { margin-bottom: 4px; }
      .meta-info strong { color: #000; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }

      .address-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 40px; 
        margin-bottom: 50px; 
      }
      .address-box h3 { 
        font-size: 11px; 
        text-transform: uppercase; 
        letter-spacing: 1.5px; 
        color: #666; 
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
        padding-bottom: 8px;
      }
      .address-content { font-size: 14px; }
      .address-content strong { font-size: 18px; display: block; margin-bottom: 5px; color: #000; }
      .address-detail { color: #444; margin-bottom: 2px; }

      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      th { 
        text-align: left; 
        font-size: 11px; 
        text-transform: uppercase; 
        letter-spacing: 1px; 
        color: #666;
        padding: 15px 10px;
        border-bottom: 2px solid #1a1a1a;
        background: #fafafa;
      }
      td { 
        padding: 15px 10px; 
        border-bottom: 1px solid #f0f0f0; 
        font-size: 14px; 
        vertical-align: top;
      }
      .item-name { font-weight: 600; color: #000; }
      .item-code { font-size: 11px; color: #666; margin-top: 4px; }

      .summary-section { 
        display: flex; 
        justify-content: flex-end; 
      }
      .totals-table { width: 300px; }
      .total-row { 
        display: flex; 
        justify-content: space-between; 
        padding: 10px 0; 
        font-size: 14px; 
        color: #444;
      }
      .total-row.grand { 
        border-top: 2px solid #000; 
        margin-top: 15px; 
        padding-top: 20px; 
        font-weight: 900; 
        font-size: 22px; 
        color: #000; 
      }

      .footer { 
        margin-top: 100px; 
        padding-top: 30px;
        border-top: 1px solid #f0f0f0;
        text-align: center; 
        color: #999; 
        font-size: 10px; 
        text-transform: uppercase; 
        letter-spacing: 2px;
      }
      
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="title-section">
          <h1>Purchase Invoice</h1>
          <div class="meta-info">
            <div><strong>Date:</strong> ${new Date(purchase.invoiceDate || purchase.createdAt).toLocaleDateString()}</div>
            <div><strong>Ref No:</strong> ${purchase.purchaseNumber || '—'}</div>
            <div><strong>Supplier Inv:</strong> ${purchase.supplierInvoiceNumber || '—'}</div>
            ${purchase.invoiceNumber ? `<div><strong>System Inv:</strong> ${purchase.invoiceNumber}</div>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          ${shopInfo?.logoUrl ? `<img src="${shopInfo.logoUrl.startsWith('http') ? shopInfo.logoUrl : (api.defaults.baseURL.replace(/\/api\/?$/, '') + shopInfo.logoUrl)}" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
          <div style="font-size: 18px; font-weight: 900;">${shopInfo?.name || 'Restaurant POS'}</div>
        </div>
      </div>

      <div class="address-grid">
        <div class="address-box">
          <h3>Supplier Details</h3>
          <div class="address-content">
            <strong>${purchase.supplierId?.name || 'Unknown Supplier'}</strong>
            <div class="address-detail">${formatAddress(purchase.supplierId?.address)}</div>
            ${purchase.supplierId?.phone ? `<div class="address-detail">Ph: ${purchase.supplierId.phone}</div>` : ''}
            ${purchase.supplierId?.email ? `<div class="address-detail">Email: ${purchase.supplierId.email}</div>` : ''}
            ${purchase.supplierId?.taxNumber ? `<div class="address-detail">TAX ID: ${purchase.supplierId.taxNumber}</div>` : ''}
          </div>
        </div>
        <div class="address-box">
          <h3>Billed To (Branch)</h3>
          <div class="address-content">
            <strong>${purchase.branchId?.name || (shopInfo?.name || 'Main Branch')}</strong>
            <div class="address-detail">${formatAddress(purchase.branchId?.address)}</div>
            ${purchase.branchId?.address?.city ? `<div class="address-detail">${purchase.branchId.address.city}, ${purchase.branchId.address.state?.name || purchase.branchId.address.state || ''}</div>` : ''}
            ${purchase.branchId?.taxProfile?.registrationNumber ? `<div class="address-detail">GST/TAX: ${purchase.branchId.taxProfile.registrationNumber}</div>` : ''}
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 8%">#</th>
            <th style="width: 42%">Item Description</th>
            <th style="width: 12%; text-align: center;">Qty</th>
            <th style="width: 18%; text-align: right;">Price</th>
            <th style="width: 20%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, idx) => `
            <tr>
              <td style="color:#888">${String(idx + 1).padStart(2, '0')}</td>
              <td>
                <div class="item-name">${it.itemId?.name || 'Unknown'}</div>
                <div class="item-code">${it.itemId?.itemCode || ''}</div>
              </td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${fmt(it.purchasePrice, currency)}</td>
              <td style="text-align: right; font-weight: 600;">${fmt(it.quantity * it.purchasePrice, currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="totals-table">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${fmt(purchase.subtotal, currency)}</span>
          </div>
          <div class="total-row">
            <span>Tax (+)</span>
            <span>${fmt(purchase.taxTotal, currency)}</span>
          </div>
          <div class="total-row">
            <span>Discount (-)</span>
            <span>${fmt(purchase.discountTotal, currency)}</span>
          </div>
          <div class="total-row grand">
            <span>GRAND TOTAL</span>
            <span>${fmt(purchase.grandTotal, currency)}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        Supplier Invoice generated from Restaurant POS system behalf of ${shopInfo?.name || 'Restaurant'}
      </div>
    </div>
    <script>
      window.onload = () => {
        window.print();
        setTimeout(() => window.close(), 500);
      };
    </script>
  </body>
</html>
        `;
        const printWindow = window.open('', '_blank', 'width=900,height=900');
        if (!printWindow) {
            alert("Popup blocked. Please allow popups to print.");
            return;
        }
        printWindow.document.write(html);
        printWindow.document.close();
    };

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
                            <>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-all border border-white/20"
                                    title="Print Invoice"
                                >
                                    <Printer size={14} />
                                    <span>PRINT</span>
                                </button>
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black ${STATUS_COLOR[purchase.status] || STATUS_COLOR.DRAFT}`}>
                                    {purchase.status}
                                </span>
                            </>
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
                                                    <td className="px-4 py-3 font-bold text-gray-700">{fmt(it.purchasePrice, currency)}</td>
                                                    <td className="px-4 py-3 text-blue-600 font-bold">{fmt(it.taxAmount, currency)}</td>
                                                    <td className="px-4 py-3 text-orange-500 font-bold">{fmt(it.discountAmount, currency)}</td>
                                                    <td className="px-4 py-3 font-black text-indigo-700">{fmt(it.totalAmount, currency)}</td>
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
                                            <span className={`font-bold ${cls}`}>{fmt(value, currency)}</span>
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
                                                    <div className="font-black text-emerald-600 text-sm">{fmt(p.amount, currency)}</div>
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

const PaymentModal = ({ purchase, onClose, onSuccess, currency }) => {
    const [payments, setPayments] = useState([
        { amount: purchase.balanceAmount || 0, method: "CASH", ref: "" }
    ]);
    const [saving, setSaving] = useState(false);
    const { theme } = useTheme();

    const totalPaying = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const remaining = Math.max(0, purchase.balanceAmount - totalPaying);

    const addPaymentRow = () => {
        if (remaining <= 0) return;
        setPayments([...payments, { amount: remaining, method: "CASH", ref: "" }]);
    };

    const removePaymentRow = (idx) => {
        setPayments(payments.filter((_, i) => i !== idx));
    };

    const updateRow = (idx, field, value) => {
        const next = [...payments];
        next[idx][field] = value;
        setPayments(next);
    };

    const handlePay = async (e) => {
        e.preventDefault();
        const validPayments = payments.filter(p => p.amount > 0);
        if (validPayments.length === 0) { alert("Enter at least one payment amount."); return; }
        
        setSaving(true);
        try {
            await PurchaseService.addPayment({
                purchaseId: purchase._id,
                payments: validPayments.map(p => ({
                    amount: Number(p.amount),
                    paymentMethod: p.method,
                    referenceNumber: p.ref,
                    paymentDate: new Date()
                }))
            });
            onSuccess();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to record payment.");
        } finally {
            setSaving(false);
        }
    };

    const METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "UPI", "CARD"];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden ${theme.surfaceBg}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Record Payment</h2>
                            <p className="text-emerald-100 text-xs font-bold opacity-90">{purchase.purchaseNumber} · Balance: {fmt(purchase.balanceAmount, currency)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handlePay} className="p-8 space-y-6">
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {payments.map((p, idx) => (
                            <div key={idx} className={`p-5 rounded-[24px] border-2 ${theme.borderLight} bg-gray-50/50 relative group`}>
                                {payments.length > 1 && (
                                    <button 
                                        type="button"
                                        onClick={() => removePaymentRow(idx)}
                                        className="absolute -top-2 -right-2 p-1.5 bg-red-50 text-red-500 rounded-full border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Amount</label>
                                        <input
                                            type="number" min={0} step="any" required
                                            value={p.amount}
                                            onChange={e => updateRow(idx, "amount", e.target.value)}
                                            className="w-full p-3.5 bg-white border-2 border-gray-100 focus:border-emerald-400 rounded-xl outline-none font-black text-lg text-emerald-600 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Method</label>
                                        <div className="relative">
                                            <select
                                                value={p.method}
                                                onChange={e => updateRow(idx, "method", e.target.value)}
                                                className="w-full appearance-none p-4 bg-white border-2 border-gray-100 focus:border-emerald-400 rounded-xl outline-none font-bold text-gray-700 transition-all pr-10 text-sm"
                                            >
                                                {METHODS.map(m => (
                                                    <option key={m} value={m}>{m.replace("_", " ")}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Ref / Txn No.</label>
                                        <input
                                            placeholder="Optional"
                                            value={p.ref}
                                            onChange={e => updateRow(idx, "ref", e.target.value)}
                                            className="w-full p-4 bg-white border-2 border-gray-100 focus:border-emerald-400 rounded-xl outline-none font-bold text-gray-700 transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {remaining > 0 && (
                            <button
                                type="button"
                                onClick={addPaymentRow}
                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold text-sm hover:border-emerald-200 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add Split Payment
                            </button>
                        )}
                    </div>

                    {/* Summary Row */}
                    <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-5 rounded-2xl border border-gray-100 gap-4">
                        <div className="text-center md:text-left">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paying</p>
                            <p className="text-xl font-black text-emerald-600">{fmt(totalPaying, currency)}</p>
                        </div>
                        <div className="h-px md:h-8 w-full md:w-px bg-gray-200" />
                        <div className="text-center md:text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remaining Balance</p>
                            <p className={`text-xl font-black ${remaining > 0 ? "text-amber-500" : "text-green-600"}`}>
                                {remaining > 0 ? fmt(remaining, currency) : "FULLY PAID"}
                            </p>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all text-sm uppercase tracking-widest">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || totalPaying <= 0}
                            className={`flex-[2] py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl ${saving ? "bg-emerald-200 text-white cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-100"
                                } uppercase tracking-widest`}>
                            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={18} />}
                            {saving ? "Processing..." : "Confirm & Save Payments"}
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
    const { activeBranchId, organization } = useApp();
    const currency = organization?.defaultCurrency || 'USD';
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [payTarget, setPayTarget] = useState(null); // purchase row for payment modal
    const [viewTarget, setViewTarget] = useState(null); // purchase id for detail modal

    const [shopId, setShopId] = useState(null);

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

                await Promise.all([
                    SupplierService.getSuppliers(id),
                    branchService.getBranchesByShopId(id),
                    itemService.getItems({ filters: { shopId: id, itemType: "STOCK" }, limit: 200 }),
                ]);
            } catch (err) {
                console.error("Init error:", err);
            }
        };
        init();
    }, [user]);

    useEffect(() => {
        if (shopId) loadPurchases();
    }, [shopId, loadPurchases]);

    const loadPurchases = useCallback(async () => {
        setLoading(true);
        try {
            const params = { shopId };
            if (activeBranchId) params.branchId = activeBranchId;
            const data = await PurchaseService.getPurchases(params);
            setPurchases(Array.isArray(data) ? data : data.purchases || []);
        } catch (err) {
            console.error("Failed to load purchases", err);
        } finally {
            setLoading(false);
        }
    }, [shopId, activeBranchId]);

    const handleDelete = async (id) => {
        confirmAction(
            "Delete this draft purchase? This action cannot be undone.",
            async () => {
                setLoading(true);
                try {
                    await PurchaseService.deletePurchase(id);
                    toast.success("Purchase deleted successfully");
                    loadPurchases();
                } catch (err) {
                    toast.error(err?.response?.data?.message || "Failed to delete.");
                } finally {
                    setLoading(false);
                }
            },
            theme.mode
        );
    };



    const handleCancel = async (id) => {
        confirmAction(
            "Cancel this draft purchase? This cannot be undone.",
            async () => {
                setLoading(true);
                try {
                    await PurchaseService.cancelPurchase(id);
                    toast.success("Purchase cancelled successfully");
                    loadPurchases();
                } catch (err) {
                    toast.error(err?.response?.data?.message || "Failed to cancel purchase.");
                } finally {
                    setLoading(false);
                }
            },
            theme.mode
        );
    };

    // ── Columns
    const columns = [
        {
            header: "Invoice",
            key: "purchaseNumber",
            render: (val, row) => (
                <div>
                    <div className={`font-black ${theme.textPrimary}`}>{val}</div>
                    {row.supplierInvoiceNumber && (
                        <div className="text-[10px] font-black text-indigo-500 mt-0.5">
                            #{row.supplierInvoiceNumber}
                        </div>
                    )}
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
            render: val => <span className="font-black text-indigo-600">{fmt(val, currency)}</span>,
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
                        <div className="text-[9px] font-bold text-red-500">Bal: {fmt(row.balanceAmount, currency)}</div>
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
                    {/* ✎ Edit — allowed for DRAFT and CONFIRMED */}
                    {canManage && (row.status === "DRAFT" || row.status === "CONFIRMED") && (
                        <button
                            onClick={() => navigate(`/purchases/edit/${row._id}`)}
                            className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all"
                            title="Edit purchase"
                        ><Edit3 size={15} /></button>
                    )}
                    {/* 💳 Pay — CONFIRMED with remaining balance */}
                    {canManage && row.status === "CONFIRMED" && row.balanceAmount > 0 && (
                        <button
                            onClick={() => setPayTarget(row)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                            title="Record Payment"
                        ><CreditCard size={15} /></button>
                    )}
                    {/* Cancel — orange, allowed if no payments */}
                    {canManage && (row.status === "DRAFT" || row.status === "CONFIRMED") && row.paidAmount === 0 && (
                        <button
                            onClick={() => handleCancel(id)}
                            className="p-2 text-orange-500 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all"
                            title="Cancel Purchase"
                        ><XCircle size={15} /></button>
                    )}
                    {/* Delete — red, allowed if no payments */}
                    {canManage && (row.status === "DRAFT" || row.status === "CONFIRMED") && row.paidAmount === 0 && (
                        <button
                            onClick={() => handleDelete(id)}
                            className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                            title="Delete purchase"
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
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl">
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
                                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 group whitespace-nowrap"
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
                        { label: "Total Value", value: fmt(purchases.reduce((a, p) => a + (p.grandTotal || 0), 0), currency), icon: Banknote, color: "indigo" },
                        { label: "Total Due", value: fmt(purchases.reduce((a, p) => a + (p.balanceAmount || 0), 0), currency), icon: Banknote, color: "red" },
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
                    currency={currency}
                    shopId={shopId}
                />
            )}

            {/* ── Pay Modal ── */}
            {payTarget && (
                <PaymentModal
                    purchase={payTarget}
                    onClose={() => setPayTarget(null)}
                    onSuccess={() => { setPayTarget(null); loadPurchases(); }}
                    currency={currency}
                />
            )}
        </div>
    );
};

export default PurchaseList;
