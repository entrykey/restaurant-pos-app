// Centralized payment and billing helper utilities
import { formatCurrency as defaultFormatCurrency } from './format.js';

/**
 * Normalizes payment details from any order object (sales list or backend order)
 */
export const getOrderPaymentDetails = (order) => {
    if (!order) {
        return {
            paymentStatus: 'UNPAID',
            paidAmount: 0,
            balanceAmount: 0,
            paymentMethod: null,
            paymentBreakdown: []
        };
    }

    const total = Number(order.grandTotal || order.subtotal || 0);

    let paid = 0;
    if (order.paidAmount !== undefined && order.paidAmount !== null) {
        paid = Number(order.paidAmount);
    } else if (order.totalPaid !== undefined && order.totalPaid !== null) {
        paid = Number(order.totalPaid);
    } else if (Array.isArray(order.payments) && order.payments.length > 0) {
        paid = order.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    } else if (order.balanceAmount !== undefined && order.balanceAmount !== null && Number(order.balanceAmount) > 0) {
        paid = Math.max(0, total - Number(order.balanceAmount));
    } else if (
        (order.orderStatus === 'COMPLETED' || order.orderStatus === 'DELIVERED') &&
        order.paymentStatus !== 'PENDING' &&
        order.paymentStatus !== 'UNPAID' &&
        order.paymentStatus !== 'PARTIAL'
    ) {
        paid = total;
    } else {
        paid = 0;
    }

    const rawBal = order.balanceAmount !== undefined && order.balanceAmount !== null
        ? Math.max(0, Number(order.balanceAmount))
        : Math.max(0, total - paid);

    const balance = rawBal <= 0.01 ? 0 : rawBal;

    let status = order.paymentStatus ? String(order.paymentStatus).toUpperCase() : null;
    if (balance === 0 && total > 0) {
        status = 'PAID';
    } else if (!status) {
        if (paid > 0) status = 'PARTIAL';
        else status = 'PENDING';
    }

    // Only show payment method if money has actually been paid or order is settled
    const hasPaid = paid > 0 || status === 'PAID' || status === 'PARTIAL';
    let method = null;
    let paymentBreakdown = [];

    if (hasPaid) {
        const pList = Array.isArray(order.payments) ? order.payments : [];
        if (pList.length > 0) {
            const methodMap = {};
            pList.forEach(p => {
                const m = (p.paymentMethod || 'CASH').toUpperCase();
                const amt = Number(p.amount || 0);
                if (amt > 0) {
                    methodMap[m] = (methodMap[m] || 0) + amt;
                }
            });
            const methods = Object.keys(methodMap);
            if (methods.length > 1) {
                method = methods.join(' + ');
                paymentBreakdown = methods.map(m => ({ method: m, amount: methodMap[m] }));
            } else if (methods.length === 1) {
                method = methods[0];
                paymentBreakdown = [{ method: methods[0], amount: methodMap[methods[0]] }];
            }
        }

        if (!method) {
            if (order.paymentMethod && order.paymentMethod !== 'SPLIT') {
                method = order.paymentMethod;
            } else if (status === 'PAID') {
                method = 'CASH';
            }
        }
    }

    return {
        paymentStatus: status || 'PENDING',
        paidAmount: paid,
        balanceAmount: balance,
        paymentMethod: method,
        paymentBreakdown
    };
};

/**
 * Normalizes payment details from a purchase object
 */
export const getPurchasePaymentDetails = (purchase) => {
    if (!purchase) {
        return {
            paymentStatus: 'UNPAID',
            paidAmount: 0,
            balanceAmount: 0,
            paymentMethod: null
        };
    }

    const total = Number(purchase.grandTotal || purchase.subtotal || 0);
    const paid = Number(purchase.paidAmount ?? 0);
    const balance = purchase.balanceAmount !== undefined && purchase.balanceAmount !== null
        ? Number(purchase.balanceAmount)
        : Math.max(0, total - paid);

    let status = purchase.paymentStatus ? String(purchase.paymentStatus).toUpperCase() : null;
    if (balance <= 0.01 && total > 0) {
        status = 'PAID';
    } else if (!status) {
        status = paid > 0 ? 'PARTIAL' : 'UNPAID';
    }

    return {
        paymentStatus: status,
        paidAmount: paid,
        balanceAmount: balance <= 0.01 ? 0 : balance,
        paymentMethod: purchase.paymentMethod || null
    };
};

/**
 * Formats a clean, readable text summary of a sales invoice (for WhatsApp, Email body, Clipboard)
 */
export const formatOrderTextSummary = ({ order, shopName, currency = '₹', formatCurrency = defaultFormatCurrency }) => {
    if (!order) return '';
    const pay = getOrderPaymentDetails(order);
    const invNum = order.invoiceNumber || order.orderNumber || 'N/A';
    const orderNum = order.orderNumber || 'N/A';
    const custName = order.customerId?.name || order.customerName || 'Walk-in Customer';
    const custPhone = order.customerId?.phone || order.customerPhone || '';
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();

    const items = (order.items || []).map(it => {
        const name = it.name || it.itemId?.name || 'Item';
        const qty = it.quantity || 1;
        const price = Number(it.price || it.totalAmount || 0);
        const lineTotal = Number(it.lineTotal ?? (qty * price));
        return `• ${qty}x ${name} - ${formatCurrency(lineTotal)}`;
    }).join('\n');

    const subtotal = Number(order.subtotal || 0);
    const tax = Number(order.taxTotal || 0);
    const grand = Number(order.grandTotal || 0);

    const statusPill = pay.paymentStatus === 'PAID' ? 'FULLY PAID ✅' : (pay.paymentStatus === 'PARTIAL' ? 'PARTIALLY PAID ⏳' : 'PENDING ⚠️');

    return `🧾 *TAX INVOICE*
${shopName ? `*${shopName}*\n` : ''}--------------------------------
*Invoice:* ${invNum}
*Order:* #${orderNum}
*Date:* ${dateStr}
*Customer:* ${custName}${custPhone ? ` (${custPhone})` : ''}

*Items:*
${items || '• (Items on record)'}

--------------------------------
*Subtotal:* ${formatCurrency(subtotal)}
${tax > 0 ? `*Tax:* ${formatCurrency(tax)}\n` : ''}*Grand Total:* ${formatCurrency(grand)}
*Payment Status:* ${statusPill}
${pay.paidAmount > 0 ? `*Amount Paid:* ${formatCurrency(pay.paidAmount)}\n` : ''}${pay.balanceAmount > 0 ? `*Balance Due:* ${formatCurrency(pay.balanceAmount)}\n` : ''}--------------------------------
Thank you for your business!`;
};

/**
 * Formats a clean text summary of a purchase invoice
 */
export const formatPurchaseTextSummary = ({ purchase, items = [], shopName, currency = '₹', formatCurrency = defaultFormatCurrency }) => {
    if (!purchase) return '';
    const pay = getPurchasePaymentDetails(purchase);
    const refNum = purchase.purchaseNumber || 'N/A';
    const suppInv = purchase.supplierInvoiceNumber || 'N/A';
    const suppName = purchase.supplierId?.name || 'Supplier';
    const dateStr = purchase.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString() : (purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString() : '');

    const itemList = (items || []).map(it => {
        const name = it.itemId?.name || it.name || 'Item';
        const qty = it.quantity || 1;
        const price = Number(it.purchasePrice || 0);
        return `• ${qty}x ${name} - ${formatCurrency(qty * price, currency)}`;
    }).join('\n');

    const statusPill = pay.paymentStatus === 'PAID' ? 'PAID ✅' : (pay.paymentStatus === 'PARTIAL' ? 'PARTIALLY PAID ⏳' : 'UNPAID ⚠️');

    return `📦 *PURCHASE INVOICE*
${shopName ? `*${shopName}*\n` : ''}--------------------------------
*Ref No:* ${refNum}
*Supplier Inv:* ${suppInv}
*Date:* ${dateStr}
*Supplier:* ${suppName}

*Items:*
${itemList || '• (Items on record)'}

--------------------------------
*Subtotal:* ${formatCurrency(purchase.subtotal || 0, currency)}
*Tax:* ${formatCurrency(purchase.taxTotal || 0, currency)}
*Grand Total:* ${formatCurrency(purchase.grandTotal || 0, currency)}
*Payment Status:* ${statusPill}
${pay.paidAmount > 0 ? `*Amount Paid:* ${formatCurrency(pay.paidAmount, currency)}\n` : ''}${pay.balanceAmount > 0 ? `*Balance Due:* ${formatCurrency(pay.balanceAmount, currency)}\n` : ''}--------------------------------`;
};
