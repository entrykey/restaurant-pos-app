import { api } from '../services/api';
import { escapeHtml, printBill, printBillA4 } from './print';
import { DEMO_PREVIEW } from './upiQr';
import { mergeBillPrintSettings } from '../config/billPrintSettings';

export const SAMPLE_BARCODE_ITEM = {
    name: 'Sample Product',
    itemCode: 'ITM000001',
    sellingPrice: 199,
    mrp: 249,
};

const SAMPLE_SALE_ITEMS = [
    { name: 'Chicken Biryani', qty: 2, lineTotal: 360 },
    { name: 'Fresh Lime Soda', qty: 1, lineTotal: 60 },
];

const SAMPLE_SALE_TOTALS = {
    subtotal: 420,
    discountAmount: 20,
    taxAmount: 20,
    taxBreakdown: { cgst: 10, sgst: 10, igst: 0 },
    finalTotal: 420,
};

const SAMPLE_PURCHASE_ITEMS = [
    { name: 'Raw Chicken', itemCode: 'RM001', quantity: 10, purchasePrice: 180, taxAmount: 32.4 },
    { name: 'Cooking Oil 1L', itemCode: 'RM002', quantity: 5, purchasePrice: 145, taxAmount: 13.05 },
];

const toAbsoluteLogoUrl = (logoUrl) => {
    if (!logoUrl) return null;
    if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
    const base = (api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');
    if (!base) return logoUrl;
    return `${base}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
};

export const buildBarcodeLabelHtml = ({
    settings,
    organization,
    item = SAMPLE_BARCODE_ITEM,
    formatCurrency = (n) => String(n ?? ''),
    barcodeImageUrl = null,
}) => {
    const s = settings || {};
    const shopName = organization?.name || organization?.businessName || DEMO_PREVIEW.shopName;
    const logoUrl = toAbsoluteLogoUrl(organization?.logoUrl);
    const barcodeUrl = barcodeImageUrl || 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
          <rect width="120" height="40" fill="#fff"/>
          ${Array.from({ length: 30 }, (_, i) => `<rect x="${i * 4}" y="4" width="${i % 3 === 0 ? 2 : 1}" height="28" fill="#111"/>`).join('')}
        </svg>`
    );

    const order = s.elementsOrder || ['shopName', 'logo', 'barcode', 'name', 'code', 'price'];
    const parts = [];
    order.forEach((key) => {
        if (key === 'shopName' && s.includeShopName) parts.push(`<div class="line shop-name">${escapeHtml(shopName)}</div>`);
        if (key === 'logo' && s.includeLogo && logoUrl) parts.push(`<img class="logo-img" src="${escapeHtml(logoUrl)}" alt="Logo" />`);
        if (key === 'barcode') parts.push(`<img class="barcode-img" src="${barcodeUrl}" alt="Barcode" />`);
        if (key === 'name' && s.includeName) parts.push(`<div class="line name">${s.showNameLabel ? 'Item: ' : ''}${escapeHtml(item.name)}</div>`);
        if (key === 'code' && s.includeCode) parts.push(`<div class="line code">${s.showCodeLabel ? 'Code: ' : ''}${escapeHtml(item.itemCode)}</div>`);
        if (key === 'price' && s.includePrice) parts.push(`<div class="line price">${s.showPriceLabel ? 'Price: ' : ''}${escapeHtml(formatCurrency(item.sellingPrice))}</div>`);
        if (key === 'mrp' && s.includeMRP) parts.push(`<div class="line mrp">${s.showMRPLabel ? 'MRP: ' : ''}${escapeHtml(formatCurrency(item.mrp))}</div>`);
        if (key === 'batch' && s.includeBatch) parts.push(`<div class="line batch">${s.showBatchLabel ? 'Batch: ' : ''}BATCH-001</div>`);
        if (key === 'expiry' && s.includeExpiry) parts.push(`<div class="line expiry">${s.showExpiryLabel ? 'Exp: ' : ''}31-12-2026</div>`);
        if (key === 'unit' && s.includeUnit) parts.push(`<div class="line unit">${s.showUnitLabel ? 'Qty: ' : ''}1 kg</div>`);
        if (key === 'custom' && s.customText) parts.push(`<div class="line custom">${escapeHtml(s.customText)}</div>`);
    });

    const labelW = s.labelWidth || 50;
    const labelH = s.labelHeight || 25;
    const baseFont = s.baseFontSize || 10;

    return `<div class="label" style="width:${labelW}mm;height:${labelH}mm;font-size:${baseFont}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1mm;box-sizing:border-box;overflow:hidden;">
      ${parts.join('')}
    </div>`;
};

export const printTestBarcodeLabel = ({ settings, organization, formatCurrency }) => {
    const s = settings || {};
    const inner = buildBarcodeLabelHtml({ settings: s, organization, formatCurrency });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Test Barcode</title>
    <style>
      @page { size: ${s.labelWidth || 50}mm ${s.labelHeight || 25}mm; margin: 0; }
      body { margin: 0; font-family: system-ui, sans-serif; }
      .label { margin: 0 auto; }
      .line { line-height: 1.1; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .shop-name { font-weight: 800; text-transform: uppercase; }
      .barcode-img { max-width: 95%; max-height: ${s.barcodeHeight || 30}%; object-fit: contain; }
      .logo-img { max-width: 80%; max-height: 12mm; object-fit: contain; }
    </style></head><body>${inner}
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return false;
    w.document.write(html);
    w.document.close();
    return true;
};

export const printTestSaleBill = ({ format = 'thermal', billSettings, header, extraInfo, formatCurrency }) => {
    const merged = mergeBillPrintSettings(billSettings);
    const fmt = format === 'a4' ? merged.a4 : merged.thermal;
    const printer = format === 'a4' ? printBillA4 : printBill;
    const d = DEMO_PREVIEW;
    printer({
        header: header || {
            shopName: d.shopName,
            branchName: d.branchName,
            addressLines: [d.address],
            contact: d.contact,
            logoUrl: null,
        },
        meta: {
            invoiceLabel: fmt.includeInvoiceNumber !== false ? d.invoiceNumber : '',
            orderLabel: fmt.includeOrderNumber !== false ? d.orderNumber : '',
            tableLabel: fmt.includeTable !== false ? d.table : '',
            customerLabel: fmt.includeCustomer !== false ? d.customer : '',
            printedAt: new Date().toLocaleString(),
        },
        items: SAMPLE_SALE_ITEMS,
        totals: SAMPLE_SALE_TOTALS,
        offers: fmt.includeOffers !== false ? [{ name: 'Demo Offer', discount: 20 }] : [],
        staffName: fmt.includeStaff ? d.staffName : '',
        formatCurrency,
        billSettings: merged,
        extraInfo: extraInfo || { upiId: d.upiId, gstNumber: d.gstNumber, fssai: d.fssai },
        paymentMethod: fmt.includePaymentMethod ? d.paymentMethod : '',
    });
};

export const printTestPurchaseInvoice = ({ purchaseSettings, formatCurrency }) => {
    const pis = purchaseSettings || {};
    const d = DEMO_PREVIEW;
    const isA4 = (pis.defaultPaperSize || 'a4') === 'a4';
    const pageStyle = isA4
        ? '@page{size:A4;margin:15mm}body{font-family:Inter,sans-serif;color:#111;padding:0;max-width:800px;margin:0 auto}'
        : '@page{size:80mm auto;margin:0}body{font-family:ui-monospace,monospace;font-size:12px;width:80mm;margin:0 auto;padding:8px}';

    if (!isA4) {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Test Purchase</title><style>${pageStyle}</style></head><body>
        <div style="text-align:center;font-weight:900">PURCHASE</div>
        ${pis.includeShopName !== false ? `<div style="text-align:center;font-weight:700">${escapeHtml(d.shopName)}</div>` : ''}
        ${pis.includePurchaseDate !== false ? `<div style="text-align:center;font-size:10px">${escapeHtml(d.purchaseRef)}</div>` : ''}
        <hr style="border:none;border-top:1px dashed #999;margin:8px 0"/>
        ${pis.includeSupplierDetails !== false ? `<div>${escapeHtml(d.supplierName)}</div>` : ''}
        ${pis.includeBranchAddress !== false ? `<div style="font-size:10px">${escapeHtml(d.branchName)}</div>` : ''}
        ${pis.includeGstNumber ? `<div style="font-size:10px">GST: ${escapeHtml(d.gstNumber)}</div>` : ''}
        ${pis.includeFssai ? `<div style="font-size:10px">FSSAI: ${escapeHtml(d.fssai)}</div>` : ''}
        <hr style="border:none;border-top:1px dashed #999;margin:8px 0"/>
        <div style="display:flex;justify-content:space-between"><span>Sample Item</span><span>${escapeHtml(formatCurrency(2132))}</span></div>
        <hr style="border:none;border-top:1px dashed #999;margin:8px 0"/>
        <div style="display:flex;justify-content:space-between;font-weight:900"><span>Total</span><span>${escapeHtml(formatCurrency(2132))}</span></div>
        </body></html>`;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.onload = () => { w.print(); setTimeout(() => w.close(), 500); };
        return;
    }

    const rows = SAMPLE_PURCHASE_ITEMS.map((it, idx) => `
      <tr>
        <td>${String(idx + 1).padStart(2, '0')}</td>
        <td><div class="item-name">${escapeHtml(it.name)}</div>${pis.includeItemCode !== false ? `<div class="item-code">${escapeHtml(it.itemCode)}</div>` : ''}</td>
        <td style="text-align:center">${it.quantity}</td>
        <td style="text-align:right">${escapeHtml(formatCurrency(it.purchasePrice))}</td>
        <td style="text-align:right;font-weight:600">${escapeHtml(formatCurrency(it.quantity * it.purchasePrice + it.taxAmount))}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Test Purchase Invoice</title>
    <style>${pageStyle}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #eee;padding-bottom:20px;margin-bottom:24px}
    h1{margin:0;font-size:28px} .meta{font-size:12px;color:#444;margin-top:10px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .box{border:1px solid #eee;border-radius:10px;padding:12px} .box h3{font-size:10px;text-transform:uppercase;color:#666;margin:0 0 8px}
    table{width:100%;border-collapse:collapse} th,td{padding:10px;border-bottom:1px solid #eee;font-size:12px;text-align:left}
    th{text-transform:uppercase;font-size:10px;color:#666} .foot{margin-top:40px;text-align:center;font-size:10px;color:#999}
    </style></head><body>
    <div class="header"><div><h1>Purchase Invoice</h1>
    ${pis.includePurchaseDate !== false ? `<div class="meta"><strong>Date:</strong> 14/06/2026</div>` : ''}
    ${pis.includeInvoiceNumber !== false ? `<div class="meta"><strong>Ref:</strong> ${escapeHtml(d.purchaseRef)}</div>` : ''}
    </div>${pis.includeShopName !== false ? `<div style="text-align:right;font-weight:900">${escapeHtml(d.shopName)}</div>` : ''}</div>
    <div class="grid">
    ${pis.includeSupplierDetails !== false ? `<div class="box"><h3>Supplier</h3><strong>${escapeHtml(d.supplierName)}</strong><div>${escapeHtml(d.supplierAddress)}</div></div>` : ''}
    <div class="box"><h3>Billed To</h3><strong>${escapeHtml(d.branchName)}</strong>
    ${pis.includeBranchAddress !== false ? `<div>${escapeHtml(d.address)}</div>` : ''}
    ${pis.includeGstNumber ? `<div>GST: ${escapeHtml(d.gstNumber)}</div>` : ''}
    ${pis.includeFssai ? `<div>FSSAI: ${escapeHtml(d.fssai)}</div>` : ''}</div></div>
    <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    ${pis.includeNotes !== false ? `<div class="meta">Notes: Demo purchase note</div>` : ''}
    <div class="foot">${escapeHtml(pis.footerText || `Demo purchase invoice — ${d.shopName}`)}</div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.print(); setTimeout(() => w.close(), 500); };
};
