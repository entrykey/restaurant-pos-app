import { buildUpiQrPrintHtml } from './upiQr';

export function escapeHtml(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPrintDocumentHtml({ title = "", html }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @media print {
        @page { size: 80mm auto; margin: 0; }
        body { margin: 0; padding: 0; }
      }
      html, body { padding: 0; margin: 0; }
      body { 
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; 
        font-weight: 600;
        color: #000;
      }
      .paper { width: 80mm; padding: 0 8px 12px; box-sizing: border-box; }
      .center { text-align: center; }
      .muted { color: #333; }
      .bold { font-weight: 900; }
      .tiny { font-size: 12px; line-height: 1.2; }
      .sm { font-size: 16px; line-height: 1.25; }
      .md { font-size: 19px; line-height: 1.3; }
      .lg { font-size: 22px; line-height: 1.2; }
      .row { display: flex; justify-content: space-between; gap: 8px; }
      .hr { border-top: 1px dashed #000; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 5px 0; vertical-align: top; }
      th { font-size: 13px; border-bottom: 2px dashed #000; text-align: left; font-weight: 900; }
      td { font-size: 15px; font-weight: 700; }
      .right { text-align: right; }
      .wrap { word-break: break-word; }
      img.logo { 
        max-height: 120px; 
        max-width: 80mm; 
        object-fit: contain; 
        display: block; 
        margin: -8px auto 6px; 
        padding: 0;
      }
    </style>
  </head>
  <body>
    ${html}
  </body>
</html>`;
}

function removeExistingPrintFrame() {
  const existing = document.getElementById("__pos_print_iframe__");
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
}

function printViaIframe({ title = "", html }) {
  removeExistingPrintFrame();

  const iframe = document.createElement("iframe");
  iframe.id = "__pos_print_iframe__";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    removeExistingPrintFrame();
    return false;
  }

  doc.open();
  doc.write(getPrintDocumentHtml({ title, html }));
  doc.close();

  const doPrint = () => {
    try {
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Print failed:', e);
    } finally {
      setTimeout(removeExistingPrintFrame, 1000);
    }
  };

  const waitForImages = () => {
    const images = Array.from(doc.images || []);
    const pending = images.filter((img) => !img.complete);
    if (!pending.length) {
      setTimeout(doPrint, 50);
      return;
    }
    let loaded = 0;
    const onDone = () => {
      loaded += 1;
      if (loaded >= pending.length) setTimeout(doPrint, 50);
    };
    pending.forEach((img) => {
      img.addEventListener('load', onDone);
      img.addEventListener('error', onDone);
    });
    setTimeout(doPrint, 1500);
  };

  waitForImages();
  return true;
}

function openPrintWindow({ title = "", html }) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=420,height=720");
  if (!w) return false;

  try {
    w.document.open();
    w.document.write(getPrintDocumentHtml({ title, html }));
    w.document.close();
  } catch (e) {
    console.warn('Print window write failed:', e);
    return false;
  }

  // Trigger print from the opened window
  try {
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } finally {
        setTimeout(() => {
          try { w.close(); } catch (e) {}
        }, 200);
      }
    }, 50);
  } catch (e) {
    // ignore
  }
  return true;
}

function printHtml({ title = "", html }) {
  // Prefer iframe printing to avoid popup blockers.
  const ok = printViaIframe({ title, html });
  if (ok) return;

  // Fallback: try popup printing (may be blocked).
  const popupOk = openPrintWindow({ title, html });
  if (!popupOk) {
    alert("Printing blocked by the browser. Please allow popups or enable printing permissions for this site.");
  }
}

function buildHeaderHtml({ logoUrl, shopName, branchName, contact, addressLines, extraInfo, formatSettings }) {
  const settings = formatSettings || {};
  const parts = [];

  const order = settings.elementsOrder || ['logo', 'shopName', 'branchName', 'address', 'contact', 'gstNumber', 'fssai'];
  order.forEach((key) => {
    if (key === 'logo' && settings.includeLogo !== false && logoUrl) {
      parts.push(`<img class="logo" src="${escapeHtml(logoUrl)}" alt="logo" />`);
    }
    if (key === 'shopName' && settings.includeShopName !== false && shopName) {
      parts.push(`<div class="lg bold">${escapeHtml(shopName)}</div>`);
    }
    if (key === 'branchName' && settings.includeBranchName !== false && branchName) {
      parts.push(`<div class="md bold">${escapeHtml(branchName)}</div>`);
    }
    if (key === 'address' && settings.includeAddress !== false) {
      const addr = (addressLines || []).filter(Boolean).map(escapeHtml).join("<br/>");
      if (addr) parts.push(`<div class="tiny muted">${addr}</div>`);
    }
    if (key === 'contact' && settings.includeContact !== false && contact) {
      parts.push(`<div class="sm bold">${escapeHtml(contact)}</div>`);
    }
    if (key === 'gstNumber' && settings.includeGstNumber && extraInfo?.gstNumber) {
      parts.push(`<div class="tiny muted">GSTIN: ${escapeHtml(extraInfo.gstNumber)}</div>`);
    }
    if (key === 'fssai' && settings.includeFssai && extraInfo?.fssai) {
      parts.push(`<div class="tiny muted">FSSAI: ${escapeHtml(extraInfo.fssai)}</div>`);
    }
  });

  // Fallback when no elementsOrder
  if (!settings.elementsOrder) {
    const addr = (addressLines || []).filter(Boolean).map(escapeHtml).join("<br/>");
    return `
    <div class="center">
      ${settings.includeLogo !== false && logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="logo" />` : ""}
      ${settings.includeShopName !== false && shopName ? `<div class="lg bold">${escapeHtml(shopName)}</div>` : ""}
      ${settings.includeBranchName !== false && branchName ? `<div class="md bold">${escapeHtml(branchName)}</div>` : ""}
      ${settings.includeContact !== false && contact ? `<div class="sm bold">${escapeHtml(contact)}</div>` : ""}
      ${settings.includeAddress !== false && addr ? `<div class="tiny muted">${addr}</div>` : ""}
      ${settings.includeGstNumber && extraInfo?.gstNumber ? `<div class="tiny muted">GSTIN: ${escapeHtml(extraInfo.gstNumber)}</div>` : ""}
      ${settings.includeFssai && extraInfo?.fssai ? `<div class="tiny muted">FSSAI: ${escapeHtml(extraInfo.fssai)}</div>` : ""}
    </div>
  `;
  }

  return `<div class="center">${parts.join("")}</div>`;
}

function buildUpiHtml(extraInfo, formatSettings, amount, payeeName) {
  if (!formatSettings?.includeUpiCode || !extraInfo?.upiId) return "";
  return buildUpiQrPrintHtml({
    upiId: extraInfo.upiId,
    payeeName: extraInfo.payeeName || payeeName || 'Shop',
    amount: amount ?? extraInfo.billAmount,
    label: 'Scan to pay',
  });
}

export function printKot({
  header,
  meta,
  items,
  staffName,
}) {
  const headerHtml = buildHeaderHtml(header || {});
  const metaLines = [
    meta?.orderLabel,
    meta?.tableLabel,
    meta?.printedAt,
  ].filter(Boolean);

  const rows = (items || []).map((it, idx) => {
    const notes = it?.notes ? `<div class="tiny muted wrap">Note: ${escapeHtml(it.notes)}</div>` : "";
    return `
      <tr>
        <td style="width: 25px;">${idx + 1}</td>
        <td class="wrap">
          <div class="bold">${escapeHtml(it.name)}</div>
          ${it.variant ? `<div class="tiny muted">${escapeHtml(it.variant)}</div>` : ""}
          ${notes}
        </td>
        <td class="right bold">${escapeHtml(it.qty)}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <div class="paper">
      ${headerHtml}
      <div class="hr"></div>
      <div class="center md bold">KOT</div>
      ${metaLines.length ? `<div class="center tiny muted">${metaLines.map(escapeHtml).join(" • ")}</div>` : ""}
      ${staffName ? `<div class="center tiny muted">Billed by: ${escapeHtml(staffName)}</div>` : ""}
      <div class="hr"></div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th>Item</th>
            <th class="right">Qty</th>
          </tr>
        </thead>
        <tbody>${rows || ""}</tbody>
      </table>
      <div class="hr"></div>
    </div>
  `;

  printHtml({ title: "", html });
}

export function printBill({
  header,
  meta,
  items,
  totals,
  offers = [],
  staffName,
  formatCurrency = (n) => String(n ?? ""),
  billSettings,
  extraInfo,
  paymentMethod,
}) {
  const formatSettings = billSettings?.thermal || billSettings || {};
  const paperWidth = formatSettings.paperWidthMm || 80;
  const baseFont = formatSettings.baseFontSize || 12;

  const headerHtml = buildHeaderHtml({ ...header, extraInfo, formatSettings });
  const metaLines = [
    formatSettings.includeInvoiceNumber !== false ? meta?.invoiceLabel : null,
    formatSettings.includeOrderNumber !== false ? meta?.orderLabel : null,
    formatSettings.includeTable !== false ? meta?.tableLabel : null,
    formatSettings.includeCustomer !== false ? meta?.customerLabel : null,
    meta?.printedAt,
    formatSettings.includePaymentMethod && paymentMethod ? `Payment: ${paymentMethod}` : null,
  ].filter(Boolean);

  const rows = (items || []).map((it, idx) => {
    const lineTotal = it?.lineTotal ?? 0;
    return `
      <tr>
        <td style="width: 25px;">${idx + 1}</td>
        <td class="wrap">
          <div class="bold">${escapeHtml(it.name)}</div>
          ${it.variant ? `<div class="tiny muted">${escapeHtml(it.variant)}</div>` : ""}
        </td>
        <td class="right">${escapeHtml(it.qty)}</td>
        <td class="right">${escapeHtml(formatCurrency(lineTotal))}</td>
      </tr>
    `;
  }).join("");

  // Build offer rows
  const offerRows = formatSettings.includeOffers !== false
    ? (offers || []).filter(o => o && (o.discount || o.discountAmount) > 0).map(o =>
        `<div class="row" style="color:#16a34a;"><span>${escapeHtml(o.name || o.offerName || "Offer")}</span><span>- ${escapeHtml(formatCurrency(o.discount || o.discountAmount || 0))}</span></div>`
      ).join("")
    : "";

  const taxBreakdownHtml = formatSettings.includeTaxBreakdown !== false ? `
        ${totals?.taxBreakdown && totals.taxBreakdown.cgst > 0 ? `<div class="row tiny muted" style="padding-left: 10px;"><span>CGST</span><span>${escapeHtml(formatCurrency(totals.taxBreakdown.cgst))}</span></div>` : ""}
        ${totals?.taxBreakdown && totals.taxBreakdown.sgst > 0 ? `<div class="row tiny muted" style="padding-left: 10px;"><span>SGST</span><span>${escapeHtml(formatCurrency(totals.taxBreakdown.sgst))}</span></div>` : ""}
        ${totals?.taxBreakdown && totals.taxBreakdown.igst > 0 ? `<div class="row tiny muted" style="padding-left: 10px;"><span>IGST</span><span>${escapeHtml(formatCurrency(totals.taxBreakdown.igst))}</span></div>` : ""}
  ` : "";

  const footerText = formatSettings.includeThankYou !== false
    ? (formatSettings.footerText || "Thank you! Visit Again")
    : "";

  const upiHtml = buildUpiHtml(extraInfo, formatSettings, totals?.finalTotal, header?.shopName);
  const staffHtml = formatSettings.includeStaff !== false && staffName
    ? `<div class="center tiny muted">Billed by: ${escapeHtml(staffName)}</div>`
    : "";

  const html = `
    <div class="paper" style="width:${paperWidth}mm; font-size:${baseFont}px;">
      ${headerHtml}
      <div class="hr"></div>
      <div class="center md bold">BILL</div>
      ${metaLines.length ? `<div class="center tiny muted">${metaLines.map(escapeHtml).join(" • ")}</div>` : ""}
      ${staffHtml}
      <div class="hr"></div>

      <table>
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th>Item</th>
            <th class="right">Qty</th>
            <th class="right">Amt</th>
          </tr>
        </thead>
        <tbody>${rows || ""}</tbody>
      </table>

      <div class="hr"></div>

      <div class="sm">
        <div class="row"><span class="muted">Subtotal</span><span>${escapeHtml(formatCurrency(totals?.subtotal ?? 0))}</span></div>
        ${offerRows}
        ${totals?.discountAmount ? `<div class="row"><span class="muted">Discount</span><span>- ${escapeHtml(formatCurrency(totals.discountAmount))}</span></div>` : ""}
        <div class="row"><span class="muted text-xs">Tax</span><span>${escapeHtml(formatCurrency(totals?.taxAmount ?? 0))}</span></div>
        ${taxBreakdownHtml}
        ${totals?.roundOff ? `<div class="row"><span class="muted">Round off</span><span>${escapeHtml(formatCurrency(totals.roundOff))}</span></div>` : ""}
        <div class="row md bold"><span>Total</span><span>${escapeHtml(formatCurrency(totals?.finalTotal ?? 0))}</span></div>
      </div>

      ${upiHtml}
      <div class="hr"></div>
      ${footerText ? `<div class="center sm muted" style="margin-top: 6px; font-style: italic;">${escapeHtml(footerText)}</div>` : ""}
    </div>
  `;

  printHtml({ title: "", html });
}

export function printBillA4({
  header,
  meta,
  items,
  totals,
  offers = [],
  staffName,
  formatCurrency = (n) => String(n ?? ""),
  billSettings,
  extraInfo,
  paymentMethod,
}) {
  const formatSettings = billSettings?.a4 || billSettings || {};
  const addr = (header?.addressLines || []).filter(Boolean);
  const showGst = formatSettings.includeGstNumber && extraInfo?.gstNumber;
  const showFssai = formatSettings.includeFssai && extraInfo?.fssai;
  const showUpi = formatSettings.includeUpiCode && extraInfo?.upiId;
  const upiQrHtml = showUpi ? buildUpiHtml(extraInfo, formatSettings, totals?.finalTotal, header?.shopName) : '';
  const footerText = formatSettings.includeThankYou !== false
    ? (formatSettings.footerText || "Thank you! Visit Again")
    : "";
  const html = `
    <div style="padding: 0; margin: 0;">
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Inter, -apple-system, system-ui, sans-serif; color: #111; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #eee; padding-bottom:18px; margin-bottom:22px; }
        .title { font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px; text-transform: uppercase; }
        .meta { font-size: 12px; color:#444; margin-top: 10px; line-height: 1.5; }
        .meta strong { color:#000; text-transform: uppercase; font-size: 10px; letter-spacing: 0.8px; }
        .brand { text-align:right; }
        .brand img { max-height: 60px; margin-bottom: 8px; object-fit: contain; }
        .brand .shop { font-size: 16px; font-weight: 900; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 16px 0 20px; }
        .box { border:1px solid #eee; border-radius: 12px; padding: 14px; }
        .box h3 { margin:0 0 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color:#666; }
        .box .name { font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .box .line { font-size: 12px; color:#444; line-height: 1.4; }
        table { width:100%; border-collapse: collapse; }
        th { text-align:left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color:#666; padding: 10px 8px; border-bottom: 2px solid #111; background:#fafafa; }
        td { padding: 10px 8px; border-bottom: 1px solid #f0f0f0; font-size: 12px; vertical-align: top; }
        td.right, th.right { text-align:right; }
        .item { font-weight: 700; color:#000; }
        .totals { display:flex; justify-content:flex-end; margin-top: 14px; }
        .totalsBox { width: 320px; border:1px solid #eee; border-radius: 12px; padding: 12px 14px; }
        .row { display:flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color:#444; }
        .grand { border-top: 2px solid #111; margin-top: 10px; padding-top: 10px; font-weight: 900; font-size: 16px; color:#000; }
        .foot { margin-top: 40px; padding-top: 14px; border-top: 1px solid #eee; text-align:center; font-size: 10px; color:#999; letter-spacing: 1.5px; text-transform: uppercase; }
      </style>

      <div class="container">
        <div class="header">
          <div>
            <h1 class="title">Tax Invoice</h1>
            <div class="meta">
              ${formatSettings.includeInvoiceNumber !== false && meta?.invoiceLabel ? `<div><strong>Invoice:</strong> ${escapeHtml(meta.invoiceLabel)}</div>` : ""}
              ${formatSettings.includeOrderNumber !== false && meta?.orderLabel ? `<div><strong>Order:</strong> ${escapeHtml(meta.orderLabel)}</div>` : ""}
              ${formatSettings.includeTable !== false && meta?.tableLabel ? `<div><strong>Table:</strong> ${escapeHtml(meta.tableLabel)}</div>` : ""}
              ${formatSettings.includeCustomer !== false && meta?.customerLabel ? `<div><strong>Customer:</strong> ${escapeHtml(meta.customerLabel)}</div>` : ""}
              ${meta?.printedAt ? `<div><strong>Date:</strong> ${escapeHtml(meta.printedAt)}</div>` : ""}
              ${formatSettings.includePaymentMethod && paymentMethod ? `<div><strong>Payment:</strong> ${escapeHtml(paymentMethod)}</div>` : ""}
            </div>
          </div>
          <div class="brand">
            ${formatSettings.includeLogo !== false && header?.logoUrl ? `<img src="${escapeHtml(header.logoUrl)}" alt="logo" />` : ""}
            ${formatSettings.includeShopName !== false ? `<div class="shop">${escapeHtml(header?.shopName || "")}</div>` : ""}
            ${formatSettings.includeBranchName !== false ? `<div style="font-size:12px; color:#444; font-weight:700;">${escapeHtml(header?.branchName || "")}</div>` : ""}
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h3>Sold By</h3>
            ${formatSettings.includeShopName !== false ? `<div class="name">${escapeHtml(header?.shopName || "")}</div>` : ""}
            ${formatSettings.includeAddress !== false ? addr.map((l) => `<div class="line">${escapeHtml(l)}</div>`).join("") : ""}
            ${formatSettings.includeContact !== false && header?.contact ? `<div class="line">Ph: ${escapeHtml(header.contact)}</div>` : ""}
            ${showGst ? `<div class="line">GSTIN: ${escapeHtml(extraInfo.gstNumber)}</div>` : ""}
            ${showFssai ? `<div class="line">FSSAI: ${escapeHtml(extraInfo.fssai)}</div>` : ""}
          </div>
          <div class="box">
            <h3>Branch</h3>
            ${formatSettings.includeBranchName !== false ? `<div class="name">${escapeHtml(header?.branchName || "")}</div>` : ""}
            ${formatSettings.includeAddress !== false ? addr.map((l) => `<div class="line">${escapeHtml(l)}</div>`).join("") : ""}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:6%;">#</th>
              <th>Item</th>
              <th class="right" style="width:10%;">Qty</th>
              <th class="right" style="width:18%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(items || []).map((it, idx) => `
              <tr>
                <td style="color:#888;">${String(idx + 1).padStart(2, "0")}</td>
                <td>
                  <div class="item">${escapeHtml(it?.name)}</div>
                  ${it?.variant ? `<div style="font-size:10px; color:#666; margin-top:2px;">${escapeHtml(it.variant)}</div>` : ""}
                </td>
                <td class="right">${escapeHtml(it?.qty)}</td>
                <td class="right" style="font-weight:700;">${escapeHtml(formatCurrency(it?.lineTotal ?? 0))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totals">
          <div class="totalsBox">
            <div class="row"><span>Subtotal</span><span>${escapeHtml(formatCurrency(totals?.subtotal ?? 0))}</span></div>
            ${formatSettings.includeOffers !== false ? (offers || []).filter(o => o && (o.discount || o.discountAmount) > 0).map(o =>
              `<div class="row" style="color:#16a34a;"><span>${escapeHtml(o.name || o.offerName || "Offer")}</span><span>- ${escapeHtml(formatCurrency(o.discount || o.discountAmount || 0))}</span></div>`
            ).join("") : ""}
            ${(totals?.discountAmount ?? 0) ? `<div class="row"><span>Discount</span><span>- ${escapeHtml(formatCurrency(totals.discountAmount))}</span></div>` : ""}
            <div class="row"><span>Tax</span><span>${escapeHtml(formatCurrency(totals?.taxAmount ?? 0))}</span></div>
            
            ${formatSettings.includeTaxBreakdown !== false && totals?.taxBreakdown && totals.taxBreakdown.cgst > 0 ? `<div class="row" style="font-size: 10px; color: #888; padding-left: 12px;"><span>CGST</span><span>${escapeHtml(formatCurrency(totals.taxBreakdown.cgst))}</span></div>` : ""}
            ${formatSettings.includeTaxBreakdown !== false && totals?.taxBreakdown && totals.taxBreakdown.sgst > 0 ? `<div class="row" style="font-size: 10px; color: #888; padding-left: 12px;"><span>SGST</span><span>${escapeHtml(formatCurrency(totals.taxBreakdown.sgst))}</span></div>` : ""}
            ${formatSettings.includeTaxBreakdown !== false && totals?.taxBreakdown && totals.taxBreakdown.igst > 0 ? `<div class="row" style="font-size: 10px; color: #888; padding-left: 12px;"><span>IGST</span><span>${escapeHtml(formatCurrency(totals.taxBreakdown.igst))}</span></div>` : ""}

            <div class="row grand"><span>Grand Total</span><span>${escapeHtml(formatCurrency(totals?.finalTotal ?? 0))}</span></div>
            ${upiQrHtml}
          </div>
        </div>

        <div class="foot">
          ${formatSettings.includeStaff !== false && staffName ? `Billed by: ${escapeHtml(staffName)} &nbsp;|&nbsp; ` : ""}
          ${footerText ? `${escapeHtml(footerText)} &nbsp;|&nbsp; ` : ""}
          Invoice generated by ${escapeHtml(header?.shopName || "POS")}
        </div>
      </div>
    </div>
  `;

  printHtml({ title: "", html });
}

export function printCustomHtml({
  title = "",
  bodyHtml,
}) {
  printHtml({ title, html: bodyHtml });
}


