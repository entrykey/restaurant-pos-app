import { api } from '../../services/api';
import { getPurchasePaymentDetails } from '../../utils/paymentUtils';
import { downloadHtmlFile } from '../../utils/print';

export const getPurchaseInvoiceHtml = ({ purchase, items = [], shopInfo, currency = '₹' }) => {
    if (!purchase) return '';

    const fmt = (val, cur = '₹') => {
        const num = Number(val || 0);
        return `${cur} ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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

    const pay = getPurchasePaymentDetails(purchase);
    const isPaid = pay.paymentStatus === 'PAID';
    const isPartial = pay.paymentStatus === 'PARTIAL';
    const payStatusText = isPaid ? 'PAID' : (isPartial ? 'PARTIALLY PAID' : 'UNPAID');
    const payStatusColor = isPaid ? '#16a34a' : (isPartial ? '#d97706' : '#dc2626');

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Purchase Invoice - ${purchase.supplierInvoiceNumber || purchase.purchaseNumber || 'INV'}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { 
        font-family: 'Inter', -apple-system, system-ui, sans-serif; 
        padding: 0; 
        margin: 0;
        color: #1a1a1a; 
        line-height: 1.6;
        background: #fff;
      }
      .container { max-width: 800px; margin: 0 auto; padding: 20px; }
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        border-bottom: 2px solid #f0f0f0; 
        padding-bottom: 24px; 
        margin-bottom: 30px; 
      }
      .title-section h1 { 
        font-size: 28px; 
        font-weight: 900; 
        letter-spacing: -0.5px; 
        margin: 0;
        color: #000;
        text-transform: uppercase;
      }
      .meta-info { margin-top: 12px; font-size: 13px; color: #444; }
      .meta-info div { margin-bottom: 4px; }
      .meta-info strong { color: #000; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }

      .address-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 30px; 
        margin-bottom: 35px; 
      }
      .address-box {
        border: 1px solid #f0f0f0;
        border-radius: 12px;
        padding: 16px;
      }
      .address-box h3 { 
        font-size: 11px; 
        text-transform: uppercase; 
        letter-spacing: 1.5px; 
        color: #666; 
        margin: 0 0 10px 0;
        border-bottom: 1px solid #eee;
        padding-bottom: 6px;
      }
      .address-content { font-size: 13px; }
      .address-content strong { font-size: 15px; display: block; margin-bottom: 4px; color: #000; }
      .address-detail { color: #444; margin-bottom: 2px; }

      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th { 
        text-align: left; 
        font-size: 11px; 
        text-transform: uppercase; 
        letter-spacing: 1px; 
        color: #666; 
        padding: 12px 10px; 
        border-bottom: 2px solid #1a1a1a; 
        background: #fafafa; 
      }
      td { 
        padding: 12px 10px; 
        border-bottom: 1px solid #f0f0f0; 
        font-size: 13px; 
        vertical-align: top;
      }
      .item-name { font-weight: 600; color: #000; }
      .item-code { font-size: 11px; color: #666; margin-top: 2px; }

      .summary-section { 
        display: flex; 
        justify-content: flex-end; 
      }
      .totals-table { 
        width: 320px; 
        border: 1px solid #eee;
        border-radius: 12px;
        padding: 14px 16px;
      }
      .total-row { 
        display: flex; 
        justify-content: space-between; 
        padding: 6px 0; 
        font-size: 13px; 
        color: #444; 
      }
      .total-row.grand { 
        border-top: 2px solid #000; 
        margin-top: 10px; 
        padding-top: 10px; 
        font-weight: 900; 
        font-size: 18px; 
        color: #000; 
      }
      .status-pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .footer { 
        margin-top: 50px; 
        padding-top: 20px; 
        border-top: 1px solid #f0f0f0; 
        text-align: center; 
        color: #999; 
        font-size: 10px; 
        text-transform: uppercase; 
        letter-spacing: 1.5px; 
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
          ${shopInfo?.logoUrl ? `<img src="${shopInfo.logoUrl.startsWith('http') ? shopInfo.logoUrl : ((api?.defaults?.baseURL || '').replace(/\/api\/?$/, '') + shopInfo.logoUrl)}" style="max-height: 55px; margin-bottom: 8px; object-fit: contain;" />` : ''}
          <div style="font-size: 16px; font-weight: 900;">${shopInfo?.name || 'Restaurant POS'}</div>
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
          <h3>Billed To</h3>
          <div class="address-content">
            <strong>${shopInfo?.name || purchase.branchId?.name || 'Restaurant POS'}</strong>
            <div class="address-detail" style="font-weight: 600; color: #333;">${purchase.branchId?.name || 'Main Branch'}</div>
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
            <th style="width: 44%">Item Description</th>
            <th style="width: 12%; text-align: center;">Qty</th>
            <th style="width: 18%; text-align: right;">Price</th>
            <th style="width: 18%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(items || []).map((it, idx) => `
            <tr>
              <td style="color:#888">${String(idx + 1).padStart(2, '0')}</td>
              <td>
                <div class="item-name">${it.itemId?.name || it.name || 'Unknown Item'}</div>
                ${it.itemId?.itemCode ? `<div class="item-code">${it.itemId.itemCode}</div>` : ''}
              </td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${fmt(it.purchasePrice, currency)}</td>
              <td style="text-align: right; font-weight: 700;">${fmt(it.quantity * it.purchasePrice, currency)}</td>
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
          ${purchase.otherCharges ? `
          <div class="total-row">
            <span>Additional Charges (+)</span>
            <span>${fmt(purchase.otherCharges, currency)}</span>
          </div>
          ` : ''}
          ${purchase.discountTotal ? `
          <div class="total-row">
            <span>Discount (-)</span>
            <span>${fmt(purchase.discountTotal, currency)}</span>
          </div>
          ` : ''}
          <div class="total-row grand">
            <span>GRAND TOTAL</span>
            <span>${fmt(purchase.grandTotal, currency)}</span>
          </div>
          <div class="total-row" style="margin-top: 10px; font-weight: 900; color: ${payStatusColor};">
            <span>Payment Status</span>
            <span>${payStatusText}</span>
          </div>
          ${pay.paidAmount > 0 ? `
          <div class="total-row" style="margin-top: 2px;">
            <span style="color:#666;">Amount Paid</span>
            <span>${fmt(pay.paidAmount, currency)}</span>
          </div>
          ` : ''}
          ${pay.balanceAmount > 0 ? `
          <div class="total-row" style="font-weight: 900; color: #dc2626; margin-top: 2px;">
            <span>Balance Due</span>
            <span>${fmt(pay.balanceAmount, currency)}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="footer">
        Purchase Invoice generated from POS system on behalf of ${shopInfo?.name || 'Restaurant'}
      </div>
    </div>
  </body>
</html>`;
};

export const printPurchaseInvoice = ({ purchase, items = [], shopInfo, currency = '₹' }) => {
    const html = getPurchaseInvoiceHtml({ purchase, items, shopInfo, currency });
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
        alert("Popup blocked. Please allow popups to print.");
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try {
            printWindow.print();
        } catch (e) {
            console.warn("Print error:", e);
        }
    }, 400);
};

export const downloadPurchaseInvoice = ({ purchase, items = [], shopInfo, currency = '₹' }) => {
    const html = getPurchaseInvoiceHtml({ purchase, items, shopInfo, currency });
    const fileName = `Purchase_Invoice_${purchase.supplierInvoiceNumber || purchase.purchaseNumber || 'INV'}.html`;
    downloadHtmlFile(html, fileName);
};

export { downloadPurchaseInvoicePdf, getPurchaseInvoicePdfFile } from '../../utils/pdfInvoiceGenerator';
