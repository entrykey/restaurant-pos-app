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
      @page { size: 80mm auto; margin: 0mm; }
      html, body { padding: 0; margin: 0; }
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .paper { width: 80mm; padding: 10px 10px 12px; box-sizing: border-box; }
      .center { text-align: center; }
      .muted { color: #555; }
      .bold { font-weight: 700; }
      .tiny { font-size: 10px; line-height: 1.2; }
      .sm { font-size: 12px; line-height: 1.25; }
      .md { font-size: 14px; line-height: 1.3; }
      .row { display: flex; justify-content: space-between; gap: 8px; }
      .hr { border-top: 1px dashed #333; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 4px 0; vertical-align: top; }
      th { font-size: 11px; border-bottom: 1px dashed #333; text-align: left; }
      td { font-size: 12px; }
      .right { text-align: right; }
      .wrap { word-break: break-word; }
      img.logo { max-height: 50px; max-width: 70mm; object-fit: contain; display: block; margin: 0 auto 4px; }
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
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      // Cleanup after giving the print dialog a moment to open
      setTimeout(removeExistingPrintFrame, 1000);
    }
  };

  // Some browsers need a tick to finish layout
  setTimeout(doPrint, 50);
  return true;
}

function openPrintWindow({ title = "", html }) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=420,height=720");
  if (!w) return false;

  w.document.open();
  w.document.write(getPrintDocumentHtml({ title, html }));
  w.document.close();

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

function buildHeaderHtml({ logoUrl, shopName, branchName, contact, addressLines }) {
  const addr = (addressLines || []).filter(Boolean).map(escapeHtml).join("<br/>");
  return `
    <div class="center">
      ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="logo" />` : ""}
      ${shopName ? `<div class="md bold">${escapeHtml(shopName)}</div>` : ""}
      ${branchName ? `<div class="sm bold">${escapeHtml(branchName)}</div>` : ""}
      ${contact ? `<div class="tiny muted">${escapeHtml(contact)}</div>` : ""}
      ${addr ? `<div class="tiny muted">${addr}</div>` : ""}
    </div>
  `;
}

export function printKot({
  header,
  meta,
  items,
}) {
  const headerHtml = buildHeaderHtml(header || {});
  const metaLines = [
    meta?.orderLabel,
    meta?.tableLabel,
    meta?.printedAt,
  ].filter(Boolean);

  const rows = (items || []).map((it) => {
    const notes = it?.notes ? `<div class="tiny muted wrap">Note: ${escapeHtml(it.notes)}</div>` : "";
    return `
      <tr>
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
      <div class="hr"></div>
      <table>
        <thead>
          <tr>
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
  formatCurrency = (n) => String(n ?? ""),
}) {
  const headerHtml = buildHeaderHtml(header || {});
  const metaLines = [
    meta?.orderLabel,
    meta?.tableLabel,
    meta?.customerLabel,
    meta?.printedAt,
  ].filter(Boolean);

  const rows = (items || []).map((it) => {
    const lineTotal = it?.lineTotal ?? 0;
    return `
      <tr>
        <td class="wrap">
          <div class="bold">${escapeHtml(it.name)}</div>
          ${it.variant ? `<div class="tiny muted">${escapeHtml(it.variant)}</div>` : ""}
        </td>
        <td class="right">${escapeHtml(it.qty)}</td>
        <td class="right">${escapeHtml(formatCurrency(lineTotal))}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <div class="paper">
      ${headerHtml}
      <div class="hr"></div>
      <div class="center md bold">BILL</div>
      ${metaLines.length ? `<div class="center tiny muted">${metaLines.map(escapeHtml).join(" • ")}</div>` : ""}
      <div class="hr"></div>

      <table>
        <thead>
          <tr>
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
        ${totals?.discountAmount ? `<div class="row"><span class="muted">Discount</span><span>- ${escapeHtml(formatCurrency(totals.discountAmount))}</span></div>` : ""}
        <div class="row"><span class="muted">Tax</span><span>${escapeHtml(formatCurrency(totals?.taxAmount ?? 0))}</span></div>
        ${totals?.roundOff ? `<div class="row"><span class="muted">Round off</span><span>${escapeHtml(formatCurrency(totals.roundOff))}</span></div>` : ""}
        <div class="row md bold"><span>Total</span><span>${escapeHtml(formatCurrency(totals?.finalTotal ?? 0))}</span></div>
      </div>

      <div class="hr"></div>
    </div>
  `;

  printHtml({ title: "", html });
}

export function printBillA4({
  header,
  meta,
  items,
  totals,
  formatCurrency = (n) => String(n ?? ""),
}) {
  const addr = (header?.addressLines || []).filter(Boolean);
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
              ${meta?.orderLabel ? `<div><strong>Invoice:</strong> ${escapeHtml(meta.orderLabel)}</div>` : ""}
              ${meta?.tableLabel ? `<div><strong>Table:</strong> ${escapeHtml(meta.tableLabel)}</div>` : ""}
              ${meta?.customerLabel ? `<div><strong>Customer:</strong> ${escapeHtml(meta.customerLabel)}</div>` : ""}
              ${meta?.printedAt ? `<div><strong>Date:</strong> ${escapeHtml(meta.printedAt)}</div>` : ""}
            </div>
          </div>
          <div class="brand">
            ${header?.logoUrl ? `<img src="${escapeHtml(header.logoUrl)}" alt="logo" />` : ""}
            <div class="shop">${escapeHtml(header?.shopName || "")}</div>
            <div style="font-size:12px; color:#444; font-weight:700;">${escapeHtml(header?.branchName || "")}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h3>Sold By</h3>
            <div class="name">${escapeHtml(header?.shopName || "")}</div>
            ${addr.map((l) => `<div class="line">${escapeHtml(l)}</div>`).join("")}
            ${header?.contact ? `<div class="line">Ph: ${escapeHtml(header.contact)}</div>` : ""}
          </div>
          <div class="box">
            <h3>Branch</h3>
            <div class="name">${escapeHtml(header?.branchName || "")}</div>
            ${addr.map((l) => `<div class="line">${escapeHtml(l)}</div>`).join("")}
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
            ${(totals?.discountAmount ?? 0) ? `<div class="row"><span>Discount</span><span>- ${escapeHtml(formatCurrency(totals.discountAmount))}</span></div>` : ""}
            <div class="row"><span>Tax</span><span>${escapeHtml(formatCurrency(totals?.taxAmount ?? 0))}</span></div>
            <div class="row grand"><span>Grand Total</span><span>${escapeHtml(formatCurrency(totals?.finalTotal ?? 0))}</span></div>
          </div>
        </div>

        <div class="foot">
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


