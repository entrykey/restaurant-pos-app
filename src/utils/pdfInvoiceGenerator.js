import jsPDFModule, { jsPDF } from 'jspdf';
import autoTableModule from 'jspdf-autotable';
import { getOrderPaymentDetails, getPurchasePaymentDetails } from './paymentUtils.js';

const createPdfDoc = (options = { orientation: 'portrait', unit: 'pt', format: 'a4' }) => {
    const PdfConstructor = (typeof jsPDF === 'function')
        ? jsPDF
        : (jsPDFModule?.jsPDF || jsPDFModule?.default?.jsPDF || jsPDFModule);
    return new PdfConstructor(options);
};

const runAutoTable = (doc, options) => {
    if (typeof doc.autoTable === 'function') {
        doc.autoTable(options);
        return;
    }
    const fn = autoTableModule?.default || autoTableModule;
    if (typeof fn === 'function') {
        fn(doc, options);
    }
};

/**
 * Universal safe currency formatter for PDF documents (avoids WinAnsi encoding issues)
 */
export const formatPdfCurrency = (amount, currency = 'INR') => {
    const num = Number(amount || 0);
    const code = (typeof currency === 'object' && currency !== null)
        ? (currency.code || currency.id || 'INR')
        : (currency || 'INR');
    const upper = String(code).toUpperCase();

    const formattedNum = num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (upper === 'INR' || upper === '₹' || code === '₹') {
        return `Rs. ${formattedNum}`;
    }
    if (upper === 'USD' || upper === '$' || code === '$') {
        return `$${formattedNum}`;
    }
    if (upper === 'EUR' || upper === '€' || code === '€') {
        return `€${formattedNum}`;
    }
    if (upper === 'GBP' || upper === '£' || code === '£') {
        return `£${formattedNum}`;
    }
    return `${upper} ${formattedNum}`;
};

const sanitizeFileName = (name) => {
    return String(name || 'Invoice').replace(/[/\\?%*:|"<>]/g, '-').trim();
};

/**
 * Builds the jsPDF document object for a Sales Tax Invoice
 */
export const buildSaleInvoicePdfDoc = ({
    order,
    organization,
    branch,
    currentUser,
    currency = 'INR',
    staffName
}) => {
    if (!order) return null;

    const doc = createPdfDoc({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2); // 515.28 pt

    const payDetails = getOrderPaymentDetails(order);
    const invoiceNo = order.invoiceNumber || order.orderNumber || 'INV';
    const orderNo = order.orderNumber ? `#${order.orderNumber}` : '';
    const customerName = order.customerId?.name || order.customerName || 'Walk-in Customer';
    const customerPhone = order.customerId?.phone || order.customerPhone || '';
    const shopName = organization?.businessName || organization?.name || branch?.name || 'Restaurant POS';
    const branchName = branch?.name || 'Main Branch';
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }) : new Date().toLocaleString();

    let y = 46;

    // ── Header Title (Left) ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('TAX INVOICE', margin, y);

    // ── Header Brand (Right) ──
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName, pageWidth - margin, y, { align: 'right' });

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(branchName, pageWidth - margin, y, { align: 'right' });

    // Shop contact/address on right
    const shopPhone = organization?.ownerContact || organization?.phone || branch?.phone || '';
    if (shopPhone) {
        y += 12;
        doc.text(`Ph: ${shopPhone}`, pageWidth - margin, y, { align: 'right' });
    }

    // ── Left Metadata ──
    let metaY = 62;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    const addMetaLine = (label, val) => {
        if (!val) return;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${label}:`, margin, metaY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(String(val), margin + 68, metaY);
        metaY += 13;
    };

    addMetaLine('INVOICE', invoiceNo);
    if (orderNo) addMetaLine('ORDER', orderNo);
    addMetaLine('CUSTOMER', customerName + (customerPhone ? ` (${customerPhone})` : ''));
    addMetaLine('DATE', dateStr);

    const effectivePaymentMethod = payDetails.paidAmount > 0
        ? payDetails.paymentMethod
        : (payDetails.paymentStatus === 'PAID' ? (payDetails.paymentMethod || 'CASH') : null);

    if (effectivePaymentMethod) {
        addMetaLine('PAYMENT', effectivePaymentMethod);
    }
    if (order.tableName) {
        addMetaLine('TABLE', `Table ${order.tableName}`);
    }

    y = Math.max(y + 15, metaY + 8);

    // Divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    // ── Two Info Boxes: SOLD BY & BILLED TO ──
    const boxWidth = (contentWidth - 16) / 2;
    const boxHeight = 66;

    const formatAddressText = (addr) => {
        if (!addr) return '';
        if (typeof addr === 'string') return addr;
        const parts = [
            addr.line1,
            addr.line2,
            addr.city,
            addr.state?.name || addr.state,
            addr.pincode
        ].filter(Boolean);
        return parts.join(', ');
    };
    const shopAddr = formatAddressText(branch?.address) || 'India';

    // Box 1: SOLD BY
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.setFillColor(255, 255, 255); // standard white background
    doc.roundedRect(margin, y, boxWidth, boxHeight, 6, 6, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('SOLD BY', margin + 12, y + 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900 (crisp readable dark)
    doc.text(shopName, margin + 12, y + 28);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(shopAddr, margin + 12, y + 41);
    if (shopPhone) {
        doc.text(`Ph: ${shopPhone}`, margin + 12, y + 53);
    }

    // Box 2: BILLED TO
    const box2X = margin + boxWidth + 16;
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.setFillColor(255, 255, 255); // standard white background
    doc.roundedRect(box2X, y, boxWidth, boxHeight, 6, 6, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('BILLED TO', box2X + 12, y + 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900 (crisp readable dark)
    doc.text(shopName, box2X + 12, y + 28);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700 (crisp readable dark)
    doc.text(branchName, box2X + 12, y + 41);
    if (shopAddr) {
        doc.text(shopAddr, box2X + 12, y + 53);
    }

    y += boxHeight + 16;

    // ── Items Table ──
    const items = order.items || [];
    const tableHead = [['#', 'ITEM', 'QTY', 'PRICE', 'AMOUNT']];
    const tableBody = items.map((it, idx) => {
        const itemName = it.name || it.itemId?.name || 'Item';
        const variant = it.selectedVariant?.name || it.variant || '';
        const fullItemTitle = variant ? `${itemName} (${variant})` : itemName;
        const qty = String(it.quantity || 1);
        const price = formatPdfCurrency(it.price || 0, currency);
        const lineTotal = formatPdfCurrency(it.lineTotal ?? ((it.quantity || 1) * (it.price || 0)), currency);

        return [
            String(idx + 1).padStart(2, '0'),
            fullItemTitle,
            qty,
            price,
            lineTotal
        ];
    });

    runAutoTable(doc, {
        startY: y,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: {
            fillColor: [241, 245, 249], // slate-100
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 7,
        },
        bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 8.5,
            cellPadding: 6,
        },
        columnStyles: {
            0: { cellWidth: 28, halign: 'center', textColor: [100, 116, 139] },
            1: { cellWidth: 'auto', fontStyle: 'bold' },
            2: { cellWidth: 44, halign: 'center' },
            3: { cellWidth: 70, halign: 'right' },
            4: { cellWidth: 75, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.5,
    });

    const finalTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 60;
    y = finalTableY + 14;

    // Check if enough room for totals summary (needs ~120pt)
    if (y + 130 > pageHeight - 50) {
        doc.addPage();
        y = margin;
    }

    // ── Totals Box (Right Side) ──
    const summaryWidth = 220;
    const summaryX = pageWidth - margin - summaryWidth;

    const subtotal = order.subtotal || 0;
    const tax = order.taxTotal || 0;
    const discount = order.discountTotal || 0;
    const grandTotal = order.grandTotal || 0;

    let totalsY = y + 10;
    const summaryBoxStartY = y;

    // Background box for totals
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(250, 250, 250);

    const drawRow = (label, val, isBold = false, textColor = [51, 65, 85]) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(label, summaryX + 12, totalsY);
        doc.text(val, pageWidth - margin - 12, totalsY, { align: 'right' });
        totalsY += 14;
    };

    drawRow('Subtotal', formatPdfCurrency(subtotal, currency));
    if (discount > 0) {
        drawRow('Discount (-)', `- ${formatPdfCurrency(discount, currency)}`, false, [22, 163, 74]);
    }
    drawRow('Tax', formatPdfCurrency(tax, currency));

    // Divider before Grand Total
    totalsY += 2;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.2);
    doc.line(summaryX + 10, totalsY, pageWidth - margin - 10, totalsY);
    totalsY += 12;

    // Grand Total Row (Large)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Grand Total', summaryX + 12, totalsY);
    doc.text(formatPdfCurrency(grandTotal, currency), pageWidth - margin - 12, totalsY, { align: 'right' });
    totalsY += 16;

    // Payment Status Row
    const isPaid = payDetails.paymentStatus === 'PAID';
    const isPartial = payDetails.paymentStatus === 'PARTIAL';
    const statusText = isPaid ? 'FULLY PAID' : (isPartial ? 'PARTIALLY PAID' : 'PENDING');
    const statusRgb = isPaid ? [22, 163, 74] : (isPartial ? [217, 119, 6] : [220, 38, 38]);

    drawRow('Payment Status', statusText, true, statusRgb);

    if (payDetails.paidAmount > 0 && !isPaid) {
        drawRow('Amount Paid', formatPdfCurrency(payDetails.paidAmount, currency), false, [71, 85, 105]);
    }

    if (payDetails.balanceAmount > 0) {
        drawRow('Balance Due', formatPdfCurrency(payDetails.balanceAmount, currency), true, [220, 38, 38]);
    }

    const summaryBoxHeight = (totalsY - summaryBoxStartY) + 4;
    doc.roundedRect(summaryX, summaryBoxStartY, summaryWidth, summaryBoxHeight, 8, 8, 'D');

    // ── Bottom Page Footer ──
    const footerY = pageHeight - 35;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(1);
    doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184); // slate-400
    const thankYouText = `THANK YOU! VISIT AGAIN  |  INVOICE GENERATED BY ${shopName.toUpperCase()}`;
    doc.text(thankYouText, pageWidth / 2, footerY, { align: 'center' });

    return doc;
};

/**
 * Downloads the Sales Tax Invoice PDF to disk
 */
export const downloadSaleInvoicePdf = (params) => {
    const doc = buildSaleInvoicePdfDoc(params);
    if (!doc) return;
    const invoiceNo = params.order?.invoiceNumber || params.order?.orderNumber || 'INV';
    const safeName = sanitizeFileName(invoiceNo);
    doc.save(`Invoice_${safeName}.pdf`);
};

/**
 * Returns a File object representing the Sales Tax Invoice PDF (for Web Share API)
 */
export const getSaleInvoicePdfFile = (params) => {
    const doc = buildSaleInvoicePdfDoc(params);
    if (!doc) return null;
    const invoiceNo = params.order?.invoiceNumber || params.order?.orderNumber || 'INV';
    const safeName = sanitizeFileName(invoiceNo);
    const blob = doc.output('blob');
    return new File([blob], `Invoice_${safeName}.pdf`, { type: 'application/pdf' });
};

/**
 * Builds the jsPDF document object for a Purchase Invoice
 */
export const buildPurchaseInvoicePdfDoc = ({
    purchase,
    items = [],
    shopInfo,
    currency = 'INR'
}) => {
    if (!purchase) return null;

    const doc = createPdfDoc({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    const payDetails = getPurchasePaymentDetails(purchase);
    const invoiceNo = purchase.supplierInvoiceNumber || purchase.purchaseNumber || 'PUR';
    const refNo = purchase.purchaseNumber || '—';
    const supplierName = purchase.supplierId?.name || 'Supplier';
    const supplierPhone = purchase.supplierId?.phone || '';
    const supplierEmail = purchase.supplierId?.email || '';
    const supplierTax = purchase.supplierId?.taxNumber || '';
    const shopName = shopInfo?.name || purchase.branchId?.name || 'Restaurant POS';
    const branchName = purchase.branchId?.name || 'Main Branch';
    const dateStr = purchase.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString('en-IN') : (purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString());

    let y = 46;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('PURCHASE INVOICE', margin, y);

    // Brand
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName, pageWidth - margin, y, { align: 'right' });

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(branchName, pageWidth - margin, y, { align: 'right' });

    // Left Metadata
    let metaY = 62;
    const addMetaLine = (label, val) => {
        if (!val) return;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${label}:`, margin, metaY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(String(val), margin + 85, metaY);
        metaY += 13;
    };

    addMetaLine('DATE', dateStr);
    addMetaLine('REF NO', refNo);
    addMetaLine('SUPPLIER INV', invoiceNo);
    if (purchase.status) addMetaLine('STATUS', purchase.status);

    y = Math.max(y + 15, metaY + 8);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    // Two Info Boxes: SUPPLIER & BILLED TO
    const boxWidth = (contentWidth - 16) / 2;
    const boxHeight = 72;

    const formatAddressText = (addr) => {
        if (!addr) return '';
        if (typeof addr === 'string') return addr;
        const parts = [
            addr.line1,
            addr.line2,
            addr.city,
            addr.state?.name || addr.state,
            addr.pincode
        ].filter(Boolean);
        return parts.join(', ');
    };
    const branchAddr = formatAddressText(purchase.branchId?.address);

    // Box 1: Supplier
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.setFillColor(255, 255, 255); // standard white background
    doc.roundedRect(margin, y, boxWidth, boxHeight, 6, 6, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('SUPPLIER DETAILS', margin + 12, y + 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900 (crisp readable dark)
    doc.text(supplierName, margin + 12, y + 28);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    let suppY = y + 41;
    if (supplierPhone) {
        doc.text(`Ph: ${supplierPhone}`, margin + 12, suppY);
        suppY += 12;
    }
    if (supplierEmail) {
        doc.text(`Email: ${supplierEmail}`, margin + 12, suppY);
        suppY += 12;
    }
    if (supplierTax) {
        doc.text(`TAX ID: ${supplierTax}`, margin + 12, suppY);
    }

    // Box 2: BILLED TO
    const box2X = margin + boxWidth + 16;
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.setFillColor(255, 255, 255); // standard white background
    doc.roundedRect(box2X, y, boxWidth, boxHeight, 6, 6, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('BILLED TO', box2X + 12, y + 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900 (crisp readable dark)
    doc.text(shopName, box2X + 12, y + 28);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(branchName, box2X + 12, y + 41);
    let branchInfoY = y + 53;
    if (branchAddr) {
        doc.text(branchAddr, box2X + 12, branchInfoY);
        branchInfoY += 12;
    }
    if (purchase.branchId?.taxProfile?.registrationNumber) {
        doc.text(`GST/TAX: ${purchase.branchId.taxProfile.registrationNumber}`, box2X + 12, branchInfoY);
    }

    y += boxHeight + 16;

    // Items Table
    const tableHead = [['#', 'ITEM DESCRIPTION', 'QTY', 'PRICE', 'TOTAL']];
    const tableBody = (items || []).map((it, idx) => {
        const itemName = it.itemId?.name || it.name || 'Unknown Item';
        const itemCode = it.itemId?.itemCode ? ` (${it.itemId.itemCode})` : '';
        const qty = String(it.quantity || 1);
        const price = formatPdfCurrency(it.purchasePrice || 0, currency);
        const lineTotal = formatPdfCurrency((it.quantity || 1) * (it.purchasePrice || 0), currency);

        return [
            String(idx + 1).padStart(2, '0'),
            itemName + itemCode,
            qty,
            price,
            lineTotal
        ];
    });

    runAutoTable(doc, {
        startY: y,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 7,
        },
        bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 8.5,
            cellPadding: 6,
        },
        columnStyles: {
            0: { cellWidth: 28, halign: 'center', textColor: [100, 116, 139] },
            1: { cellWidth: 'auto', fontStyle: 'bold' },
            2: { cellWidth: 44, halign: 'center' },
            3: { cellWidth: 70, halign: 'right' },
            4: { cellWidth: 75, halign: 'right', fontStyle: 'bold' }
        },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.5,
    });

    const finalTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 60;
    y = finalTableY + 14;

    if (y + 130 > pageHeight - 50) {
        doc.addPage();
        y = margin;
    }

    // Totals Box
    const summaryWidth = 220;
    const summaryX = pageWidth - margin - summaryWidth;

    const subtotal = purchase.subtotal || 0;
    const tax = purchase.taxTotal || 0;
    const discount = purchase.discountTotal || 0;
    const otherCharges = purchase.otherCharges || 0;
    const grandTotal = purchase.grandTotal || 0;

    let totalsY = y + 10;
    const summaryBoxStartY = y;

    const drawRow = (label, val, isBold = false, textColor = [51, 65, 85]) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(label, summaryX + 12, totalsY);
        doc.text(val, pageWidth - margin - 12, totalsY, { align: 'right' });
        totalsY += 14;
    };

    drawRow('Subtotal', formatPdfCurrency(subtotal, currency));
    drawRow('Tax (+)', formatPdfCurrency(tax, currency));
    if (otherCharges > 0) {
        drawRow('Additional Charges (+)', formatPdfCurrency(otherCharges, currency));
    }
    if (discount > 0) {
        drawRow('Discount (-)', `- ${formatPdfCurrency(discount, currency)}`, false, [22, 163, 74]);
    }

    totalsY += 2;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.2);
    doc.line(summaryX + 10, totalsY, pageWidth - margin - 10, totalsY);
    totalsY += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('GRAND TOTAL', summaryX + 12, totalsY);
    doc.text(formatPdfCurrency(grandTotal, currency), pageWidth - margin - 12, totalsY, { align: 'right' });
    totalsY += 16;

    const isPaid = payDetails.paymentStatus === 'PAID';
    const isPartial = payDetails.paymentStatus === 'PARTIAL';
    const statusText = isPaid ? 'PAID' : (isPartial ? 'PARTIALLY PAID' : 'UNPAID');
    const statusRgb = isPaid ? [22, 163, 74] : (isPartial ? [217, 119, 6] : [220, 38, 38]);

    drawRow('Payment Status', statusText, true, statusRgb);

    if (payDetails.paidAmount > 0 && !isPaid) {
        drawRow('Amount Paid', formatPdfCurrency(payDetails.paidAmount, currency), false, [71, 85, 105]);
    }

    if (payDetails.balanceAmount > 0) {
        drawRow('Balance Due', formatPdfCurrency(payDetails.balanceAmount, currency), true, [220, 38, 38]);
    }

    const summaryBoxHeight = (totalsY - summaryBoxStartY) + 4;
    doc.roundedRect(summaryX, summaryBoxStartY, summaryWidth, summaryBoxHeight, 8, 8, 'D');

    // Bottom Footer
    const footerY = pageHeight - 35;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(1);
    doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text(`PURCHASE INVOICE GENERATED FOR ${shopName.toUpperCase()}`, pageWidth / 2, footerY, { align: 'center' });

    return doc;
};

/**
 * Downloads the Purchase Invoice PDF to disk
 */
export const downloadPurchaseInvoicePdf = (params) => {
    const doc = buildPurchaseInvoicePdfDoc(params);
    if (!doc) return;
    const invoiceNo = params.purchase?.supplierInvoiceNumber || params.purchase?.purchaseNumber || 'PUR';
    const safeName = sanitizeFileName(invoiceNo);
    doc.save(`Purchase_Invoice_${safeName}.pdf`);
};

/**
 * Returns a File object representing the Purchase Invoice PDF (for Web Share API)
 */
export const getPurchaseInvoicePdfFile = (params) => {
    const doc = buildPurchaseInvoicePdfDoc(params);
    if (!doc) return null;
    const invoiceNo = params.purchase?.supplierInvoiceNumber || params.purchase?.purchaseNumber || 'PUR';
    const safeName = sanitizeFileName(invoiceNo);
    const blob = doc.output('blob');
    return new File([blob], `Purchase_Invoice_${safeName}.pdf`, { type: 'application/pdf' });
};
