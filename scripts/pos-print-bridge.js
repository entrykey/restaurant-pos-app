/**
 * Local Thermal Print Bridge Agent
 * Listens on http://127.0.0.1:3001
 * Forwards print jobs from web browser / cloud backend directly to local LAN / Wi-Fi printers (Port 9100).
 */
const http = require('http');
const net = require('net');

const PORT = 3001;

function sendToNetworkPrinter(ip, port = 9100, buffer, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        if (!ip) return reject(new Error('Printer IP address is required'));
        const client = new net.Socket();
        let isDone = false;

        client.setTimeout(timeoutMs);
        client.on('timeout', () => {
            if (isDone) return;
            isDone = true;
            client.destroy();
            reject(new Error(`Connection to printer ${ip}:${port} timed out (${timeoutMs}ms)`));
        });

        client.connect(port, ip, () => {
            client.write(buffer, (err) => {
                if (err) {
                    if (isDone) return;
                    isDone = true;
                    client.destroy();
                    return reject(err);
                }
                setTimeout(() => {
                    if (isDone) return;
                    isDone = true;
                    client.destroy();
                    resolve({ success: true });
                }, 300);
            });
        });

        client.on('error', (err) => {
            if (isDone) return;
            isDone = true;
            client.destroy();
            reject(new Error(`Failed to reach printer at ${ip}:${port} (${err.message})`));
        });
    });
}

function buildEscPosKot({
    kotTitle = 'KITCHEN ORDER (KOT)',
    orderLabel = '',
    tableLabel = '',
    printedAt = '',
    staffName = '',
    items = [],
    paperWidthMm = 80,
    autoCut = true,
    beepBuzzer = true,
}) {
    const buffers = [];
    const cols = Number(paperWidthMm) === 58 ? 32 : 48;
    const divider = '-'.repeat(cols) + '\n';

    buffers.push(Buffer.from([0x1B, 0x40])); // Init

    if (beepBuzzer !== false) {
        buffers.push(Buffer.from([0x1B, 0x42, 0x02, 0x02])); // Beep buzzer
    }

    buffers.push(Buffer.from([0x1B, 0x61, 0x01])); // Center
    buffers.push(Buffer.from([0x1D, 0x21, 0x11])); // Double width + height
    buffers.push(Buffer.from(`${kotTitle}\n`));
    buffers.push(Buffer.from([0x1D, 0x21, 0x00])); // Normal

    const metaParts = [orderLabel, tableLabel].filter(Boolean);
    if (metaParts.length > 0) {
        buffers.push(Buffer.from([0x1B, 0x45, 0x01])); // Bold
        buffers.push(Buffer.from(`${metaParts.join('  |  ')}\n`));
        buffers.push(Buffer.from([0x1B, 0x45, 0x00]));
    }
    const timeStr = printedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    buffers.push(Buffer.from(`Time: ${timeStr}${staffName ? `  Billed: ${staffName}` : ''}\n`));
    buffers.push(Buffer.from(divider));

    buffers.push(Buffer.from([0x1B, 0x61, 0x00])); // Left
    buffers.push(Buffer.from([0x1B, 0x45, 0x01])); // Bold
    buffers.push(Buffer.from(cols === 32 ? ' QTY  ITEM                      \n' : ' QTY  ITEM                                      \n'));
    buffers.push(Buffer.from([0x1B, 0x45, 0x00]));
    buffers.push(Buffer.from(divider));

    (items || []).forEach((item) => {
        const qty = String(item.quantity ?? item.qty ?? 1).padStart(3, ' ');
        const name = String(item.itemName || item.name || 'Item');
        const variant = item.variant ? ` (${item.variant})` : '';
        const notes = item.notes ? ` [Note: ${item.notes}]` : '';

        buffers.push(Buffer.from([0x1B, 0x45, 0x01]));
        buffers.push(Buffer.from(`${qty}  ${name}${variant}\n`));
        buffers.push(Buffer.from([0x1B, 0x45, 0x00]));

        if (notes) {
            buffers.push(Buffer.from(`     ${notes}\n`));
        }
    });

    buffers.push(Buffer.from(divider));
    buffers.push(Buffer.from([0x1B, 0x61, 0x01]));
    buffers.push(Buffer.from('*** END OF KOT ***\n\n\n\n\n'));

    if (autoCut !== false) {
        buffers.push(Buffer.from([0x1D, 0x56, 0x00])); // Cut
    }

    return Buffer.concat(buffers);
}

function buildEscPosBill({
    header = {},
    meta = {},
    items = [],
    totals = {},
    paymentMethod = '',
    footerText = '',
    paperWidthMm = 80,
    autoCut = true,
    openCashDrawer = false,
}) {
    const buffers = [];
    const cols = Number(paperWidthMm) === 58 ? 32 : 48;
    const divider = '-'.repeat(cols) + '\n';

    buffers.push(Buffer.from([0x1B, 0x40]));

    if (openCashDrawer) {
        buffers.push(Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]));
    }

    buffers.push(Buffer.from([0x1B, 0x61, 0x01]));
    if (header.shopName) {
        buffers.push(Buffer.from([0x1D, 0x21, 0x11]));
        buffers.push(Buffer.from(`${header.shopName}\n`));
        buffers.push(Buffer.from([0x1D, 0x21, 0x00]));
    }
    if (header.branchName) buffers.push(Buffer.from(`${header.branchName}\n`));
    (header.addressLines || []).forEach(l => l && buffers.push(Buffer.from(`${l}\n`)));
    if (header.contact) buffers.push(Buffer.from(`Tel: ${header.contact}\n`));
    buffers.push(Buffer.from(divider));

    buffers.push(Buffer.from([0x1B, 0x61, 0x00]));
    if (meta.invoiceNumber || meta.invoiceLabel) buffers.push(Buffer.from(`Invoice: ${meta.invoiceNumber || meta.invoiceLabel}\n`));
    if (meta.orderNumber || meta.orderLabel) buffers.push(Buffer.from(`Order: ${meta.orderNumber || meta.orderLabel}\n`));
    if (meta.table || meta.tableLabel) buffers.push(Buffer.from(`Table: ${meta.table || meta.tableLabel}\n`));
    buffers.push(Buffer.from(`Date: ${meta.printedAt || new Date().toLocaleString()}\n`));
    buffers.push(Buffer.from(divider));

    buffers.push(Buffer.from([0x1B, 0x45, 0x01]));
    buffers.push(Buffer.from(cols === 32 ? 'Item             Qty      Price\n' : 'Item                             Qty      Amount\n'));
    buffers.push(Buffer.from([0x1B, 0x45, 0x00]));
    buffers.push(Buffer.from(divider));

    (items || []).forEach(it => {
        const name = String(it.name || it.itemName || 'Item').slice(0, cols === 32 ? 16 : 28).padEnd(cols === 32 ? 16 : 30);
        const qty = String(it.quantity ?? it.qty ?? 1).padStart(4);
        const total = Number(it.lineTotal ?? it.price ?? 0).toFixed(2).padStart(cols === 32 ? 10 : 12);
        buffers.push(Buffer.from(`${name}${qty}${total}\n`));
    });

    buffers.push(Buffer.from(divider));
    buffers.push(Buffer.from([0x1B, 0x61, 0x02]));
    if (totals.subtotal != null) buffers.push(Buffer.from(`Subtotal: ${Number(totals.subtotal).toFixed(2)}\n`));
    if (totals.taxAmount) buffers.push(Buffer.from(`Tax: ${Number(totals.taxAmount).toFixed(2)}\n`));
    buffers.push(Buffer.from([0x1D, 0x21, 0x11]));
    buffers.push(Buffer.from(`TOTAL: ${Number(totals.finalTotal ?? totals.total ?? 0).toFixed(2)}\n`));
    buffers.push(Buffer.from([0x1D, 0x21, 0x00]));

    if (paymentMethod) buffers.push(Buffer.from(`Paid via: ${paymentMethod}\n`));
    buffers.push(Buffer.from([0x1B, 0x61, 0x01]));
    buffers.push(Buffer.from(divider));
    if (footerText) buffers.push(Buffer.from(`${footerText}\n`));
    buffers.push(Buffer.from('Thank You! Visit Again\n\n\n\n\n'));

    if (autoCut !== false) buffers.push(Buffer.from([0x1D, 0x56, 0x00]));

    return Buffer.concat(buffers);
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', bridge: 'POS Print Bridge Running', time: new Date().toISOString() }));
        return;
    }

    if (req.url === '/print' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const ip = data.ip || data.printerIp || '192.168.1.100';
                const port = parseInt(data.port || data.printerPort || 9100, 10);
                const type = data.type || 'kot';
                const paperWidthMm = data.paperWidthMm || data.paperWidth || 80;

                let buffer;
                if (type === 'bill') {
                    buffer = buildEscPosBill({
                        ...data,
                        paperWidthMm,
                        autoCut: data.autoCut !== false,
                        openCashDrawer: Boolean(data.openCashDrawer),
                    });
                } else {
                    // KOT
                    const meta = data.meta || {};
                    buffer = buildEscPosKot({
                        kotTitle: meta.kotTitle || data.title || 'KITCHEN ORDER (KOT)',
                        orderLabel: meta.orderLabel || data.orderLabel || '',
                        tableLabel: meta.tableLabel || data.tableLabel || '',
                        printedAt: meta.printedAt || '',
                        staffName: meta.staffName || '',
                        items: data.items && data.items.length > 0 ? data.items : [
                            { itemName: 'Appam', quantity: 2, notes: 'Extra Crispy' },
                            { itemName: 'Chicken Fry', quantity: 1, variant: 'Spicy' },
                            { itemName: 'Kadala Curry', quantity: 1 },
                        ],
                        paperWidthMm,
                        autoCut: data.autoCut !== false,
                        beepBuzzer: data.beepBuzzer !== false,
                    });
                }

                await sendToNetworkPrinter(ip, port, buffer);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `Successfully printed to ${ip}:${port}` }));
            } catch (err) {
                console.error('Print Bridge Error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: err.message }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`POS Print Bridge Agent running at http://127.0.0.1:${PORT}`);
});

