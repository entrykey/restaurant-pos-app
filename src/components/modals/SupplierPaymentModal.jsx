import React, { useState, useEffect, useMemo } from "react";
import { 
    X, CreditCard, Coins, Smartphone, Building2,  
    CheckCircle2, Clock, AlertCircle, Truck, ArrowRight, Check
} from "lucide-react";
import { toast } from "react-hot-toast";
import { SupplierService } from "../../pages/Suppliers/SupplierService";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { formatCurrency as defaultFormatCurrency } from "../../utils/format";
import CommonSelect from "../ui/CommonSelect";

const SupplierPaymentModal = ({ isOpen, onClose, supplier, allSuppliers = [], onSuccess }) => {
    const { theme } = useTheme();
    const { formatCurrency, currencySymbol } = useApp();
    const fmt = formatCurrency || defaultFormatCurrency || ((val) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    const symbol = currencySymbol || '₹';

    const [selectedSupplier, setSelectedSupplier] = useState(supplier || null);
    const [duePurchases, setDuePurchases] = useState([]);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("BANK");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Active supplier resolution: prop supplier has priority when explicitly provided, else selectedSupplier
    const activeSupplier = supplier || selectedSupplier || null;

    useEffect(() => {
        if (isOpen) {
            const current = supplier || null;
            setSelectedSupplier(current);
            setSelectedPurchaseId("");
            setReferenceNumber("");
            setNotes("");
            setPaymentMethod("BANK");

            if (current) {
                const initialDue = current.totalDue !== undefined ? current.totalDue : (current.balanceAmount || current.currentBalance || 0);
                setAmount(Number(initialDue) > 0 ? String(initialDue) : "");
                loadDuePurchases(current._id || current.id);
            } else {
                setAmount("");
                setDuePurchases([]);
            }
        }
    }, [isOpen, supplier]);

    const loadDuePurchases = async (suppId) => {
        if (!suppId) return;
        setLoadingPurchases(true);
        try {
            const res = await SupplierService.getDuePurchases(suppId);
            setDuePurchases(res.duePurchases || []);
            if (res.totalDue !== undefined && Number(res.totalDue) > 0) {
                setAmount(String(res.totalDue));
            }
        } catch (e) {
            console.warn("Could not load due purchases:", e);
            setDuePurchases([]);
        } finally {
            setLoadingPurchases(false);
        }
    };

    const handleSupplierSelect = (suppId) => {
        const found = allSuppliers.find(s => String(s._id || s.id) === String(suppId));
        setSelectedSupplier(found || null);
        setSelectedPurchaseId("");
        if (found) {
            const due = found.totalDue !== undefined ? found.totalDue : (found.balanceAmount || found.currentBalance || 0);
            setAmount(Number(due) > 0 ? String(due) : "");
            loadDuePurchases(found._id || found.id);
        } else {
            setDuePurchases([]);
            setAmount("");
        }
    };

    const supplierName = activeSupplier?.name || 'Supplier';
    const supplierContact = activeSupplier?.contactPerson || activeSupplier?.phone || '';
    const supplierTax = activeSupplier?.taxId || activeSupplier?.taxNumber || '';
    const currentDue = activeSupplier 
        ? Number(activeSupplier.totalDue !== undefined ? activeSupplier.totalDue : (activeSupplier.balanceAmount || activeSupplier.currentBalance || 0))
        : 0;

    const payAmount = Number(amount) || 0;
    const remainingDue = Math.max(0, currentDue - payAmount);

    // Options for Supplier CommonSelect
    const supplierOptions = useMemo(() => {
        return (allSuppliers || []).map(s => {
            const due = Number(s.totalDue !== undefined ? s.totalDue : (s.balanceAmount || s.currentBalance || 0));
            return {
                value: String(s._id || s.id),
                label: `${s.name || 'Unnamed'} ${s.contactPerson ? `(${s.contactPerson})` : ''} - Due: ${fmt(due)}`,
                name: s.name || 'Unnamed',
                contactPerson: s.contactPerson || '',
                phone: s.phone || '',
                taxId: s.taxId || s.taxNumber || '',
                due: due,
                raw: s
            };
        });
    }, [allSuppliers, fmt]);

    // Options for Due Purchases CommonSelect
    const purchaseOptions = useMemo(() => {
        const list = [
            {
                value: "",
                label: `Overall Supplier Balance (Oldest Bills First) — ${fmt(currentDue)}`,
                due: currentDue
            }
        ];
        (duePurchases || []).forEach(p => {
            list.push({
                value: String(p._id),
                label: `Bill #${p.invoiceNumber || p.purchaseNumber} (Gross: ${fmt(p.grandTotal)}, Due: ${fmt(p.balanceAmount)})`,
                invoiceNumber: p.invoiceNumber || p.purchaseNumber,
                due: p.balanceAmount,
                grandTotal: p.grandTotal
            });
        });
        return list;
    }, [duePurchases, currentDue, fmt]);

    // Payment method options for CommonSelect
    const supplierMethodOptions = [
        { value: "BANK", label: "Bank Transfer / NEFT / RTGS" },
        { value: "UPI", label: "UPI / QR" },
        { value: "CASH", label: "Cash" },
        { value: "CARD", label: "Card" },
    ];

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeSupplier) {
            toast.error("Please select a supplier.");
            return;
        }

        if (payAmount <= 0) {
            toast.error("Please enter a valid payment amount greater than 0.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                amount: payAmount,
                paymentMethod,
                referenceNumber: referenceNumber.trim(),
                notes: notes.trim(),
                purchaseId: selectedPurchaseId || undefined
            };

            const targetId = activeSupplier._id || activeSupplier.id;
            const result = await SupplierService.paySupplier(targetId, payload);
            toast.success(result?.message || `Payment of ${fmt(payAmount)} recorded for ${supplierName}!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to record supplier payment:", error);
            toast.error(error?.message || "Failed to record payment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Slide-in Drawer */}
            <div className={`relative w-full max-w-lg h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 ${theme.surfaceBg}`}>
                {/* Header */}
                <div className={`px-6 py-5 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${theme.textHeading}`}>Pay Supplier</h2>
                            <p className={`text-xs font-bold ${theme.textMuted}`}>Record payment made to supplier</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${theme.inputBg} ${theme.textMuted} hover:text-rose-500`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Supplier Selection or Banner */}
                    {!supplier ? (
                        <div className="space-y-1.5">
                            <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                                Supplier <span className="text-rose-500">*</span>
                            </label>
                            <CommonSelect
                                options={supplierOptions}
                                value={activeSupplier ? String(activeSupplier._id || activeSupplier.id) : ""}
                                onChange={(val) => handleSupplierSelect(val)}
                                placeholder="Select a supplier..."
                                searchPlaceholder="Search supplier by name, GSTIN, contact..."
                                searchable={true}
                                required={true}
                                renderOption={(opt) => (
                                    <div className="flex items-center justify-between w-full py-1">
                                        <div>
                                            <span className="font-bold text-sm block">{opt.name}</span>
                                            <span className={`text-xs block ${theme.textMuted}`}>
                                                {opt.contactPerson ? `${opt.contactPerson} • ` : ''}{opt.phone || opt.taxId || ''}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-xs text-rose-600 dark:text-rose-400 block">{fmt(opt.due)}</span>
                                            <span className="text-[9px] uppercase tracking-wider text-gray-400">To Pay</span>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    ) : (
                        <div className={`p-4 rounded-2xl border ${theme.borderLight} bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/10 flex items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                                    {supplierName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className={`font-black text-sm ${theme.textHeading}`}>{supplierName}</h3>
                                    <p className={`text-xs font-medium ${theme.textMuted}`}>
                                        {supplierContact || 'Supplier Partner'}
                                        {supplierTax && <span className="ml-1.5 text-indigo-500 font-mono text-[10px]">GST: {supplierTax}</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">Payment Due</span>
                                <span className="text-lg font-black text-rose-600 dark:text-rose-400">{fmt(currentDue)}</span>
                            </div>
                        </div>
                    )}

                    {/* Pending Purchase Invoices (Using CommonSelect) */}
                    {activeSupplier && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between mb-1">
                                <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                                    Apply To Purchase Bill / Invoice
                                </label>
                                {loadingPurchases && <span className="text-[10px] font-bold text-gray-400">Loading purchase bills...</span>}
                            </div>
                            <CommonSelect
                                options={purchaseOptions}
                                value={selectedPurchaseId}
                                onChange={(val) => {
                                    setSelectedPurchaseId(val);
                                    const match = duePurchases.find(p => String(p._id) === String(val));
                                    if (match) {
                                        setAmount(String(match.balanceAmount));
                                    } else {
                                        setAmount(currentDue > 0 ? String(currentDue) : "");
                                    }
                                }}
                                placeholder="Overall Supplier Balance (Oldest Bills First)"
                                searchPlaceholder="Search purchase bill #..."
                                searchable={purchaseOptions.length > 5}
                            />
                        </div>
                    )}

                    {/* Amount to Pay Input */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Amount To Pay ({symbol}) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-base font-black text-gray-400">{symbol}</span>
                            <input
                                type="number"
                                step="any"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-xl font-black outline-none focus:border-indigo-500 transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                required
                            />
                        </div>
                        {/* Quick fill buttons */}
                        {currentDue > 0 && (
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(currentDue))}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${theme.borderLight} text-indigo-600 hover:bg-indigo-50`}
                                >
                                    Full Due: {fmt(currentDue)}
                                </button>
                                {currentDue > 200 && (
                                    <button
                                        type="button"
                                        onClick={() => setAmount(String(Math.round(currentDue / 2)))}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${theme.borderLight} text-gray-600 hover:bg-gray-50`}
                                    >
                                        Half: {fmt(Math.round(currentDue / 2))}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Payment Mode Selector using CommonSelect */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Payment Mode <span className="text-rose-500">*</span>
                        </label>
                        <CommonSelect
                            options={supplierMethodOptions}
                            value={paymentMethod}
                            onChange={(val) => setPaymentMethod(val)}
                            placeholder="Select Payment Mode..."
                            searchable={false}
                        />
                    </div>

                    {/* Reference / Cheque No / Notes */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Reference / Cheque No / Bank Txn ID (Optional)
                        </label>
                        <input
                            type="text"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="e.g. Cheque #, NEFT Ref, UTR..."
                            className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:border-indigo-500 ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                        />
                    </div>

                    {/* Live Financial Summary */}
                    <div className={`p-4 rounded-2xl border ${theme.borderLight} bg-gray-50/60 dark:bg-slate-900/40 space-y-2`}>
                        <div className="flex justify-between items-center text-xs">
                            <span className={theme.textMuted}>Current Supplier Due (To Pay):</span>
                            <span className="font-bold text-rose-500">{fmt(currentDue)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className={theme.textMuted}>Payment Amount Doing:</span>
                            <span className="font-black text-indigo-600">-{fmt(payAmount)}</span>
                        </div>
                        <div className={`pt-2 border-t ${theme.borderLight} flex justify-between items-center text-sm font-black`}>
                            <span className={theme.textHeading}>Remaining Due To Pay:</span>
                            <span className={remainingDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                                {fmt(remainingDue)}
                            </span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting || payAmount <= 0}
                            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-xl shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Coins size={18} />
                                    <span>Pay {fmt(payAmount)} to Supplier</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierPaymentModal;
