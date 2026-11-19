/**
 * Local Thermal Print Bridge Agent
 * 
 * Runs on the Restaurant PC (connected to the same local Wi-Fi / LAN router as the printers).
 * 1. Listens on http://127.0.0.1:3001 for instant local prints.
 * 2. Continuously polls the cloud backend (https://qa.filepeapp.com/api/print/jobs/pending)
 *    so orders and KOTs sent from Waiter Mobile Phones or Tablets are printed automatically
 *    to local LAN thermal printers (e.g. 192.168.1.100:9100) or USB printers.
 */
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const CONFIG_FILE = path.join(__dirname, '.bridge-config.json');

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag, fallback) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    return fallback;
}

let savedConfig = {};
try {
    if (fs.existsSync(CONFIG_FILE)) {
        savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
} catch (e) {
    // ignore
}

let activeConfig = {
    cloudUrl: getArg('--cloud', process.env.BRIDGE_CLOUD_URL || savedConfig.cloudUrl || 'https://qa.filepeapp.com/api'),
    shopId: getArg('--shop', process.env.BRIDGE_SHOP_ID || savedConfig.shopId || '6aa7abc9329212a3c4ce2cde'),
    branchId: getArg('--branch', process.env.BRIDGE_BRANCH_ID || savedConfig.branchId || '6aa7abc9329212a3c4ce2ce0'),
    printerIp: getArg('--ip', process.env.BRIDGE_PRINTER_IP || savedConfig.printerIp || '192.168.1.100'),
    printerPort: parseInt(getArg('--port', process.env.BRIDGE_PRINTER_PORT || savedConfig.printerPort || 9100), 10),
    pollIntervalMs: parseInt(getArg('--interval', process.env.BRIDGE_POLL_INTERVAL || savedConfig.pollIntervalMs || 1200), 10),
};

if (getArg('--shop') || getArg('--branch') || getArg('--cloud') || getArg('--ip') || getArg('--port')) {
    saveActiveConfig();
}

function saveActiveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(activeConfig, null, 2), 'utf8');
    } catch (e) {
        console.warn('Could not save bridge config:', e.message);
    }
}

/**
 * Send raw ESC/POS binary data to thermal network printer via TCP
 */
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
                    resolve({ success: true, ip, port });
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

/**
 * Build ESC/POS bytes for Kitchen Order Ticket (KOT)
 */
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

/**
 * Build ESC/POS bytes for Sale Invoice Bill
 */
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

/**
 * Execute a print job received from the cloud queue
 */
async function processCloudJob(job) {
    const ip = job.printerIp || activeConfig.printerIp || '192.168.1.100';
    const port = parseInt(job.printerPort || activeConfig.printerPort || 9100, 10);
    const paperWidthMm = job.paperWidthMm || 80;

    let buffer;
    if (job.type === 'bill') {
        buffer = buildEscPosBill({
            ...job,
            paperWidthMm,
            autoCut: job.autoCut !== false,
            openCashDrawer: Boolean(job.openCashDrawer),
        });
    } else {
        buffer = buildEscPosKot({
            kotTitle: job.title || job.meta?.kotTitle || 'KITCHEN ORDER (KOT)',
            orderLabel: job.meta?.orderLabel || '',
            tableLabel: job.meta?.tableLabel || '',
            printedAt: job.meta?.printedAt || '',
            staffName: job.meta?.staffName || '',
            items: job.items && job.items.length > 0 ? job.items : [
                { itemName: 'Appam', quantity: 2, notes: 'Extra Crispy' },
                { itemName: 'Chicken Fry', quantity: 1, variant: 'Spicy' },
            ],
            paperWidthMm,
            autoCut: job.autoCut !== false,
            beepBuzzer: job.beepBuzzer !== false,
        });
    }

    console.log(`[BRIDGE] 🖨️ Printing ${job.type.toUpperCase()} (#${job._id}) to ${ip}:${port}...`);
    await sendToNetworkPrinter(ip, port, buffer);
    console.log(`[BRIDGE] ✅ Successfully printed job #${job._id} to ${ip}:${port}`);
}

/**
 * Helper to make HTTP/HTTPS requests
 */
function makeRequest(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const transport = parsed.protocol === 'https:' ? https : http;

        const req = transport.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data || '{}');
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

/**
 * Cloud Queue Poller:
 * Polls the backend cloud for pending jobs placed by Waiter Phones or Tablets
 */
let isPolling = false;
async function pollCloudPrintQueue() {
    if (isPolling) return;
    isPolling = true;

    try {
        const baseUrl = activeConfig.cloudUrl.replace(/\/+$/, '');
        const pollUrl = `${baseUrl}/print/jobs/pending?branchId=${activeConfig.branchId}&shopId=${activeConfig.shopId}`;

        const res = await makeRequest(pollUrl, {
            method: 'GET',
            headers: {
                'x-branch-id': activeConfig.branchId,
                'x-shop-id': activeConfig.shopId,
                'x-bridge-client': 'pos-print-bridge-v1',
            },
        });

        if (res.status === 200 && res.data && Array.isArray(res.data.jobs)) {
            for (const job of res.data.jobs) {
                try {
                    await processCloudJob(job);
                    // Acknowledge completion
                    const completeUrl = `${baseUrl}/print/jobs/${job._id}/complete`;
                    await makeRequest(completeUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-branch-id': activeConfig.branchId,
                        },
                    }, { status: 'COMPLETED' });
                } catch (err) {
                    console.error(`[BRIDGE] ❌ Failed to print job #${job._id}:`, err.message);
                    const completeUrl = `${baseUrl}/print/jobs/${job._id}/complete`;
                    await makeRequest(completeUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-branch-id': activeConfig.branchId,
                        },
                    }, { status: 'FAILED', errorMessage: err.message });
                }
            }
        }
    } catch (err) {
        // Silently retry on next tick
    } finally {
        isPolling = false;
    }
}

// Start cloud polling interval
setInterval(pollCloudPrintQueue, activeConfig.pollIntervalMs);

/**
 * Local HTTP Server for local loopback prints
 */
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-branch-id, x-shop-id');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            bridge: 'POS Thermal Print Relay Bridge Running',
            config: activeConfig,
            time: new Date().toISOString(),
        }));
        return;
    }

    if (req.url === '/config' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const patch = JSON.parse(body || '{}');
                activeConfig = { ...activeConfig, ...patch };
                saveActiveConfig();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, config: activeConfig }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: e.message }));
            }
        });
        return;
    }

    if (req.url === '/print' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const ip = data.ip || data.printerIp || activeConfig.printerIp || '192.168.1.100';
                const port = parseInt(data.port || data.printerPort || activeConfig.printerPort || 9100, 10);
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
    console.log(`=======================================================`);
    console.log(`  POS Thermal Print Relay Bridge running on port ${PORT}`);
    console.log(`  Cloud Polling URL: ${activeConfig.cloudUrl}`);
    console.log(`  Target Branch ID:  ${activeConfig.branchId}`);
    console.log(`  LAN Printer IP:    ${activeConfig.printerIp}:${activeConfig.printerPort}`);
    console.log(`=======================================================`);
});
