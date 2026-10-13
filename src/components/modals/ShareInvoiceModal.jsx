import React, { useState, useEffect } from 'react';
import {
    X,
    Share2,
    Download,
    Mail,
    MessageCircle,
    MessageSquare,
    Printer,
    Copy,
    Check,
    ExternalLink,
    FileText,
    Globe,
    User,
    Calendar,
    CreditCard,
    DollarSign,
    Sparkles,
    Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import {
    getOrderPaymentDetails,
    getPurchasePaymentDetails,
    formatOrderTextSummary,
    formatPurchaseTextSummary
} from '../../utils/paymentUtils';
import {
    getBillA4Html,
    downloadHtmlFile,
    openPrintWindowA4
} from '../../utils/print';
import {
    getPurchaseInvoiceHtml,
    downloadPurchaseInvoice,
    printPurchaseInvoice
} from '../../pages/Purchases/purchaseInvoiceUtils';
import { buildPrintHeader, buildBillExtraInfo, loadBillPrintSettings } from '../../utils/printSettingsUtils';
import {
    downloadSaleInvoicePdf,
    downloadPurchaseInvoicePdf,
    getSaleInvoicePdfFile,
    getPurchaseInvoicePdfFile
} from '../../utils/pdfInvoiceGenerator';

const ShareInvoiceModal = ({
    isOpen,
    onClose,
    type = 'sale', // 'sale' | 'purchase'
    data,          // order object or { purchase, items, payments }
    organization,
    branches = [],
    currentUser,
    currency = '₹',
    formatCurrency = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    shopId
}) => {
    const { theme } = useTheme();
    const isDark = theme.mode === 'dark';

    // Format selection: 'pdf' | 'text' | 'html'
    const [shareFormat, setShareFormat] = useState('pdf');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Extract normalized details depending on whether it's a Sale or Purchase
    const isSale = type === 'sale';
    const saleOrder = isSale ? data : null;
    const purchaseData = !isSale ? (data?.purchase ? data : { purchase: data, items: data?.items || [] }) : null;
    const purchase = purchaseData?.purchase;
    const purchaseItems = purchaseData?.items || [];

    const shopName = organization?.businessName || organization?.name || 'Shop';

    // Payment details
    const payDetails = isSale
        ? getOrderPaymentDetails(saleOrder)
        : getPurchasePaymentDetails(purchase);

    // Identity labels
    const invoiceNumber = isSale
        ? (saleOrder?.invoiceNumber || saleOrder?.orderNumber || 'INV')
        : (purchase?.supplierInvoiceNumber || purchase?.purchaseNumber || 'PUR');

    const orderNumber = isSale ? (saleOrder?.orderNumber || '') : (purchase?.purchaseNumber || '');
    const partyName = isSale
        ? (saleOrder?.customerId?.name || saleOrder?.customerName || 'Walk-in Customer')
        : (purchase?.supplierId?.name || 'Supplier');

    const defaultPhone = isSale
        ? (saleOrder?.customerId?.phone || saleOrder?.customerPhone || '')
        : (purchase?.supplierId?.phone || '');

    const defaultEmail = isSale
        ? (saleOrder?.customerId?.email || '')
        : (purchase?.supplierId?.email || '');

    const totalAmount = isSale
        ? Number(saleOrder?.grandTotal || saleOrder?.subtotal || 0)
        : Number(purchase?.grandTotal || purchase?.subtotal || 0);

    const dateStr = isSale
        ? (saleOrder?.createdAt ? new Date(saleOrder.createdAt).toLocaleDateString() : new Date().toLocaleDateString())
        : (purchase?.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString() : (purchase?.createdAt ? new Date(purchase.createdAt).toLocaleDateString() : ''));

    // Populate default inputs when modal opens
    useEffect(() => {
        if (isOpen) {
            setRecipientPhone(defaultPhone || '');
            setRecipientEmail(defaultEmail || '');
            setCopied(false);
            setShowPreview(false);
        }
    }, [isOpen, defaultPhone, defaultEmail]);

    if (!isOpen || (!saleOrder && !purchase)) return null;

    // Generated text summary for messaging
    const textSummary = isSale
        ? formatOrderTextSummary({ order: saleOrder, shopName, currency, formatCurrency })
        : formatPurchaseTextSummary({ purchase, items: purchaseItems, shopName, currency, formatCurrency });

    // Prepare Sale A4 HTML parameters
    const getSaleA4Params = async () => {
        const activeBranch = branches?.find(b => b._id === (saleOrder?.branchId?._id || saleOrder?.branchId)) || branches?.[0];
        const extraInfo = buildBillExtraInfo(activeBranch, organization);
        const header = buildPrintHeader({ organization, branch: activeBranch, orderFromBackend: saleOrder, settings: null, currentUser });
        const billSettings = await loadBillPrintSettings(currentUser?.shopId || currentUser?.shop_id || shopId, activeBranch?._id);

        const items = (saleOrder?.items || []).map(item => ({
            name: item.name || item.itemId?.name || 'Item',
            variant: item.selectedVariant ? item.selectedVariant.name : (item.variant || ''),
            qty: item.quantity || 1,
            lineTotal: Number(item.lineTotal ?? ((item.quantity || 1) * (item.price || 0)))
        }));

        const totals = {
            subtotal: saleOrder?.subtotal || 0,
            discountAmount: saleOrder?.discountTotal || 0,
            taxAmount: saleOrder?.taxTotal || 0,
            finalTotal: saleOrder?.grandTotal || 0,
            paidAmount: payDetails.paidAmount,
            remainingBalance: payDetails.balanceAmount,
            paymentStatus: payDetails.paymentStatus,
            taxBreakdown: {
                cgst: saleOrder?.cgst || 0,
                sgst: saleOrder?.sgst || 0,
                igst: saleOrder?.igst || 0,
            }
        };

        const meta = {
            invoiceLabel: `INV: ${saleOrder?.invoiceNumber || saleOrder?.orderNumber}`,
            orderLabel: `#${saleOrder?.orderNumber}`,
            tableLabel: saleOrder?.tableName ? `Table ${saleOrder.tableName}` : null,
            customerLabel: saleOrder?.customerId?.name || saleOrder?.customerName || 'Walk-in Customer',
            printedAt: new Date().toLocaleString(),
        };

        return {
            header,
            meta,
            items,
            totals,
            offers: saleOrder?.appliedOffers || [],
            staffName: currentUser?.username || currentUser?.name || 'Staff',
            formatCurrency,
            billSettings,
            extraInfo,
            paymentMethod: payDetails.paidAmount > 0 ? payDetails.paymentMethod : (payDetails.paymentStatus === 'PAID' ? (payDetails.paymentMethod || 'CASH') : null),
            paymentStatus: payDetails.paymentStatus
        };
    };

    // Helper: Obtain File object for sharing according to selected format
    const getShareableFile = async (format = shareFormat) => {
        const safeInv = String(invoiceNumber).replace(/[/\\?%*:|"<>]/g, '-');
        if (format === 'pdf') {
            if (isSale) {
                const activeBranch = branches?.find(b => b._id === (saleOrder?.branchId?._id || saleOrder?.branchId)) || branches?.[0];
                return getSaleInvoicePdfFile({
                    order: saleOrder,
                    organization,
                    branch: activeBranch,
                    currentUser,
                    currency,
                    staffName: currentUser?.username || currentUser?.name || 'Staff'
                });
            } else {
                return getPurchaseInvoicePdfFile({
                    purchase,
                    items: purchaseItems,
                    shopInfo: { name: shopName, logoUrl: organization?.logoUrl },
                    currency
                });
            }
        } else if (format === 'html') {
            if (isSale) {
                const params = await getSaleA4Params();
                const html = getBillA4Html(params);
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                return new File([blob], `Invoice_${safeInv}.html`, { type: 'text/html' });
            } else {
                const html = getPurchaseInvoiceHtml({
                    purchase,
                    items: purchaseItems,
                    shopInfo: { name: shopName, logoUrl: organization?.logoUrl },
                    currency
                });
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                return new File([blob], `Purchase_Invoice_${safeInv}.html`, { type: 'text/html' });
            }
        }
        return null;
    };

    // 1. Direct PDF Download Action (Save as .pdf file)
    const handleDownloadPdf = () => {
        try {
            setIsGenerating(true);
            if (isSale) {
                const activeBranch = branches?.find(b => b._id === (saleOrder?.branchId?._id || saleOrder?.branchId)) || branches?.[0];
                downloadSaleInvoicePdf({
                    order: saleOrder,
                    organization,
                    branch: activeBranch,
                    currentUser,
                    currency,
                    staffName: currentUser?.username || currentUser?.name || 'Staff'
                });
            } else {
                downloadPurchaseInvoicePdf({
                    purchase,
                    items: purchaseItems,
                    shopInfo: { name: shopName, logoUrl: organization?.logoUrl },
                    currency
                });
            }
            toast.success("PDF invoice downloaded successfully!");
        } catch (err) {
            console.error("PDF download error:", err);
            toast.error("Failed to generate PDF: " + (err.message || "Unknown error"));
        } finally {
            setIsGenerating(false);
        }
    };

    // 2. Download HTML Action
    const handleDownloadHtml = async () => {
        try {
            setIsGenerating(true);
            if (isSale) {
                const params = await getSaleA4Params();
                const html = getBillA4Html(params);
                const safeInv = String(invoiceNumber).replace(/[/\\?%*:|"<>]/g, '-');
                downloadHtmlFile(html, `Invoice_${safeInv}.html`);
            } else {
                downloadPurchaseInvoice({
                    purchase,
                    items: purchaseItems,
                    shopInfo: { name: shopName, logoUrl: organization?.logoUrl },
                    currency
                });
            }
            toast.success("HTML invoice downloaded successfully!");
        } catch (err) {
            console.error("Download error:", err);
            toast.error("Failed to download invoice: " + (err.message || "Unknown error"));
        } finally {
            setIsGenerating(false);
        }
    };

    // 3. Download Text Summary File
    const handleDownloadText = () => {
        const safeInv = String(invoiceNumber).replace(/[/\\?%*:|"<>]/g, '-');
        const blob = new Blob([textSummary], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${isSale ? 'Invoice' : 'Purchase'}_${safeInv}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Text summary downloaded!");
    };

    // Unified Download according to selected format
    const handleDownloadSelected = () => {
        if (shareFormat === 'pdf') {
            handleDownloadPdf();
        } else if (shareFormat === 'html') {
            handleDownloadHtml();
        } else {
            handleDownloadText();
        }
    };

    // 4. Print / View Action
    const handlePrintPdf = async () => {
        try {
            setIsGenerating(true);
            if (isSale) {
                const params = await getSaleA4Params();
                const html = getBillA4Html(params);
                openPrintWindowA4({ title: `Tax Invoice - ${invoiceNumber}`, html });
            } else {
                printPurchaseInvoice({
                    purchase,
                    items: purchaseItems,
                    shopInfo: { name: shopName, logoUrl: organization?.logoUrl },
                    currency
                });
            }
            toast.success("Opened print/PDF view");
        } catch (err) {
            console.error("Print PDF error:", err);
            toast.error("Failed to open print view: " + (err.message || "Unknown error"));
        } finally {
            setIsGenerating(false);
        }
    };

    // 5. Email / Mail Action (Respects selected format: PDF file, HTML file, or Text)
    const handleSendMail = async () => {
        try {
            setIsGenerating(true);
            const subject = encodeURIComponent(`${isSale ? 'Tax Invoice' : 'Purchase Invoice'} ${invoiceNumber} - ${shopName}`);
            const body = encodeURIComponent(textSummary);
            const mailtoUrl = `mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`;

            if (shareFormat === 'pdf' || shareFormat === 'html') {
                const file = await getShareableFile(shareFormat);

                // If native share with file is supported (e.g. mobile or supported desktop browsers)
                if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: `${isSale ? 'Tax Invoice' : 'Purchase Invoice'} ${invoiceNumber}`,
                            text: textSummary,
                            files: [file]
                        });
                        toast.success(`Shared ${shareFormat.toUpperCase()} invoice via system share!`);
                        return;
                    } catch (shareErr) {
                        if (shareErr.name === 'AbortError') return;
                        console.warn("Native share cancelled or failed, falling back to download + mailto:", shareErr);
                    }
                }

                // Fallback for standard desktop web: download file and open mailto
                if (shareFormat === 'pdf') {
                    handleDownloadPdf();
                    window.open(mailtoUrl, '_blank');
                    toast.success("PDF downloaded! Email client opened (ready to attach PDF).", { duration: 5000 });
                } else {
                    handleDownloadHtml();
                    window.open(mailtoUrl, '_blank');
                    toast.success("HTML downloaded! Email client opened.", { duration: 5000 });
                }
            } else {
                // shareFormat === 'text'
                window.open(mailtoUrl, '_blank');
                toast.success("Opening email client with invoice text...");
            }
        } catch (err) {
            console.error("Mail share error:", err);
            toast.error("Failed to share via email");
        } finally {
            setIsGenerating(false);
        }
    };

    // 6. WhatsApp Action (Respects selected format: PDF file, HTML file, or Text)
    const handleShareWhatsApp = async () => {
        try {
            setIsGenerating(true);
            let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
            if (cleanPhone.length === 10) {
                cleanPhone = '91' + cleanPhone;
            }
            const text = encodeURIComponent(textSummary);
            const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${text}`
                : `https://wa.me/?text=${text}`;

            if (shareFormat === 'pdf' || shareFormat === 'html') {
                const file = await getShareableFile(shareFormat);

                // If native share with file is supported (mobile browsers, tablets, etc.)
                if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: `${isSale ? 'Invoice' : 'Purchase'} #${invoiceNumber}`,
                            text: textSummary,
                            files: [file]
                        });
                        toast.success(`Shared ${shareFormat.toUpperCase()} invoice!`);
                        return;
                    } catch (shareErr) {
                        if (shareErr.name === 'AbortError') return;
                        console.warn("Native share error, falling back to download + WhatsApp Web:", shareErr);
                    }
                }

                // Desktop WhatsApp Web fallback: Auto-download the file and open the chat
                if (shareFormat === 'pdf') {
                    handleDownloadPdf();
                    window.open(waUrl, '_blank');
                    toast.success("PDF downloaded! You can attach it in the opened WhatsApp chat.", { duration: 5500 });
                } else {
                    handleDownloadHtml();
                    window.open(waUrl, '_blank');
                    toast.success("HTML downloaded! You can attach it in the opened WhatsApp chat.", { duration: 5500 });
                }
            } else {
                // shareFormat === 'text'
                window.open(waUrl, '_blank');
                toast.success("Opening WhatsApp chat with text summary...");
            }
        } catch (err) {
            console.error("WhatsApp share error:", err);
            toast.error("Failed to share on WhatsApp");
        } finally {
            setIsGenerating(false);
        }
    };

    // 7. Native Share API Action (Mobile / Other Apps)
    const handleNativeShare = async () => {
        try {
            setIsGenerating(true);
            if (shareFormat === 'pdf' || shareFormat === 'html') {
                const file = await getShareableFile(shareFormat);
                if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `${isSale ? 'Tax Invoice' : 'Purchase Invoice'} #${invoiceNumber}`,
                        text: textSummary,
                        files: [file]
                    });
                    toast.success(`Shared ${shareFormat.toUpperCase()} invoice successfully!`);
                    return;
                }
            }

            if (navigator.share) {
                await navigator.share({
                    title: `${isSale ? 'Invoice' : 'Purchase'} #${invoiceNumber}`,
                    text: textSummary,
                });
                toast.success("Shared successfully!");
            } else {
                handleCopyText();
                toast("Native share unavailable. Text summary copied to clipboard!", { icon: "📋" });
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Web share error:", err);
                handleCopyText();
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // 8. Copy text to clipboard
    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(textSummary);
            setCopied(true);
            toast.success("Invoice summary copied to clipboard!");
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            toast.error("Failed to copy text");
        }
    };

    const isPaid = payDetails.paymentStatus === 'PAID';
    const isPartial = payDetails.paymentStatus === 'PARTIAL';
    const statusLabel = isPaid ? 'FULLY PAID' : (isPartial ? 'PARTIALLY PAID' : 'PENDING');
    const statusBadgeClass = isPaid
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        : isPartial
            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className={`w-full max-w-xl max-h-[92vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>

                {/* ── Modal Header ── */}
                <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">
                                {isSale ? 'Share Sales Invoice' : 'Share Purchase Invoice'}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                                #{invoiceNumber} · {partyName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Modal Scrollable Body ── */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                    {/* Invoice Info Card */}
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200/80'}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    {isSale ? 'Customer' : 'Supplier'}
                                </span>
                                <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">{partyName}</h3>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Date: {dateStr}
                                </p>
                            </div>

                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Grand Total</span>
                                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(totalAmount)}
                                </div>
                                <div className="mt-1 flex items-center justify-end gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${statusBadgeClass}`}>
                                        {statusLabel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Partial or Pending Notice */}
                        {!isPaid && payDetails.balanceAmount > 0 && (
                            <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs font-black text-red-600 dark:text-red-400">
                                <span>Balance Remaining:</span>
                                <span>{formatCurrency(payDetails.balanceAmount)}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Share Format Selector (Capsule Tab Switch) ── */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                HOW TO SHARE (FORMAT):
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1.5 ${
                                isDark
                                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                                    : 'bg-indigo-50 text-indigo-600 border-indigo-200/80'
                            }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                {shareFormat === 'pdf' && 'PDF File (.pdf)'}
                                {shareFormat === 'text' && 'Plain Text Summary'}
                                {shareFormat === 'html' && 'Web Page (.html)'}
                            </span>
                        </div>

                        <div className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl border transition-all ${
                            isDark
                                ? 'bg-slate-800/90 border-slate-700/80 shadow-inner'
                                : 'bg-slate-100/90 border-slate-200/80 shadow-inner'
                        }`}>
                            {[
                                { id: 'pdf', label: 'PDF Document', icon: FileText },
                                { id: 'text', label: 'Text Summary', icon: MessageSquare },
                                { id: 'html', label: 'HTML File', icon: Globe },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = shareFormat === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setShareFormat(tab.id)}
                                        className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 ${
                                            isActive
                                                ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/30'
                                                : isDark
                                                    ? 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                                                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/80'
                                        }`}
                                    >
                                        <Icon size={14} className={isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Share Grid Options */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                            Sharing & Export Options
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {/* Option 1: Download Selected Format */}
                            <button
                                onClick={handleDownloadSelected}
                                disabled={isGenerating}
                                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 group shadow-sm ${
                                    isDark
                                        ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-blue-400'
                                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700'
                                }`}
                                title={`Download as ${shareFormat.toUpperCase()}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                    <Download size={20} />
                                </div>
                                <div>
                                    <span className="text-xs font-black block">
                                        Download {shareFormat === 'pdf' ? 'PDF' : (shareFormat === 'html' ? 'HTML' : 'Text')}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {shareFormat === 'pdf' ? '.pdf File' : (shareFormat === 'html' ? '.html File' : '.txt File')}
                                    </span>
                                </div>
                            </button>

                            {/* Option 2: Print / Preview */}
                            <button
                                onClick={handlePrintPdf}
                                disabled={isGenerating}
                                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 group shadow-sm ${
                                    isDark
                                        ? 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 text-rose-400'
                                        : 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700'
                                }`}
                                title="Open printable A4 window"
                            >
                                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-110 transition-transform">
                                    <Printer size={20} />
                                </div>
                                <div>
                                    <span className="text-xs font-black block">Print / View</span>
                                    <span className="text-[10px] font-bold text-slate-400">Print Window</span>
                                </div>
                            </button>

                            {/* Option 3: WhatsApp */}
                            <button
                                onClick={handleShareWhatsApp}
                                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 group shadow-sm ${
                                    isDark
                                        ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400'
                                        : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700'
                                }`}
                                title={`Share on WhatsApp (${shareFormat.toUpperCase()})`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <span className="text-xs font-black block">WhatsApp</span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {shareFormat === 'pdf' ? 'Send PDF' : (shareFormat === 'html' ? 'Send HTML' : 'Text Chat')}
                                    </span>
                                </div>
                            </button>

                            {/* Option 4: Email / Mail */}
                            <button
                                onClick={handleSendMail}
                                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 group shadow-sm ${
                                    isDark
                                        ? 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400'
                                        : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700'
                                }`}
                                title={`Send Email (${shareFormat.toUpperCase()})`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <span className="text-xs font-black block">Mail App</span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {shareFormat === 'pdf' ? 'Email PDF' : (shareFormat === 'html' ? 'Email HTML' : 'Send Text')}
                                    </span>
                                </div>
                            </button>

                            {/* Option 5: Other / Native Share */}
                            <button
                                onClick={handleNativeShare}
                                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 group shadow-sm ${
                                    isDark
                                        ? 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 text-purple-400'
                                        : 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700'
                                }`}
                                title={`Share via other apps (${shareFormat.toUpperCase()})`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform">
                                    <Share2 size={20} />
                                </div>
                                <div>
                                    <span className="text-xs font-black block">Other Apps</span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {shareFormat === 'pdf' ? 'Share PDF' : (shareFormat === 'html' ? 'Share HTML' : 'System Share')}
                                    </span>
                                </div>
                            </button>

                            {/* Option 6: Copy Details */}
                            <button
                                onClick={handleCopyText}
                                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 group shadow-sm ${
                                    isDark
                                        ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-400'
                                        : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700'
                                }`}
                                title="Copy text summary to clipboard"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </div>
                                <div>
                                    <span className="text-xs font-black block">{copied ? 'Copied!' : 'Copy Text'}</span>
                                    <span className="text-[10px] font-bold text-slate-400">Clipboard</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Contact Input Fields for Mail & WhatsApp */}
                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Recipient Contact Details
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* WhatsApp Phone */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <MessageCircle size={13} className="text-emerald-500" /> WhatsApp Number
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        placeholder="e.g. 9876543210"
                                        value={recipientPhone}
                                        onChange={(e) => setRecipientPhone(e.target.value)}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-emerald-500 ${
                                            isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                    />
                                    {recipientPhone && (
                                        <button
                                            onClick={handleShareWhatsApp}
                                            className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black hover:bg-emerald-700 transition-all flex items-center gap-1"
                                            title="Send WhatsApp now"
                                        >
                                            <Send size={10} /> Send
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Email Address */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Mail size={13} className="text-indigo-500" /> Email Address
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        placeholder="e.g. customer@example.com"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                    />
                                    {recipientEmail && (
                                        <button
                                            onClick={handleSendMail}
                                            className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center gap-1"
                                            title="Open email now"
                                        >
                                            <Send size={10} /> Send
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Message Preview */}
                    <div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                                <FileText size={13} />
                                {showPreview ? 'Hide Message Preview' : 'Show Message Preview'}
                            </button>

                            <span className="text-[10px] font-bold text-slate-400">
                                {shareFormat === 'pdf' ? '📎 PDF attachment + note' : (shareFormat === 'html' ? '🌐 HTML attachment + note' : '💬 Text message')}
                            </span>
                        </div>

                        {showPreview && (
                            <div className={`mt-2 p-3.5 rounded-xl border text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto ${
                                isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                                {textSummary}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modal Footer ── */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                        onClick={handleCopyText}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareInvoiceModal;
