import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

/** Demo values for settings previews — never use live shop/branch data in preview UI */
export const DEMO_PREVIEW = {
    shopName: 'Demo Shop',
    branchName: 'Demo Branch',
    address: '123 Demo Street, Sample City - 560001',
    contact: '9876543210',
    gstNumber: '29ABCDE1234F1Z9',
    fssai: '12345678901234',
    upiId: 'demo@upi',
    payeeName: 'Demo Shop',
    invoiceNumber: 'INV-2026-001',
    orderNumber: 'ORD-1042',
    customer: 'Walk-in Customer',
    table: 'Takeaway',
    staffName: 'Demo Staff',
    paymentMethod: 'UPI',
    billTotal: 420,
    supplierName: 'Sample Supplier',
    supplierAddress: '45 Supplier Road, Demo City',
    purchaseRef: 'PO-2026-001',
};

/** Same UPI pay string format as PaymentModal */
export const buildUpiPayString = ({ upiId, payeeName, amount }) => {
    if (!upiId) return '';
    const amt = Number(amount);
    const amountPart = Number.isFinite(amt) && amt > 0 ? `&am=${amt}` : '';
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName || 'Shop')}${amountPart}&cu=INR`;
};

/** Inline SVG QR — same generator as PaymentModal (qrcode.react) */
export const buildUpiQrSvgMarkup = (upiString, size = 100) => {
    if (!upiString) return '';
    return renderToStaticMarkup(
        createElement(QRCodeSVG, { value: upiString, size, level: 'M' }),
    );
};

export const buildUpiQrPrintHtml = ({ upiId, payeeName, amount, label = 'Scan to pay' }) => {
    const upiString = buildUpiPayString({ upiId, payeeName, amount });
    if (!upiString) return '';
    const svg = buildUpiQrSvgMarkup(upiString, 100);
    const amountLabel = amount ? ` — ${Number(amount).toFixed(2)}` : '';
    return `
      <div class="center" style="margin-top:10px;text-align:center;">
        <div style="display:inline-block;line-height:0;">${svg}</div>
        <div class="tiny muted" style="margin-top:4px;">${label}${amountLabel}</div>
      </div>`;
};
