/**
 * Thermal Print Station Agent
 * 
 * Runs on the Counter PC (connected to the same local Wi-Fi / LAN router as the printers).
 * Relays print jobs from cloud backend (qa.filepeapp.com) sent by Waiter Mobile Phones
 * directly to local LAN thermal printers (e.g. 192.168.1.100:9100) or USB printers.
 */
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PORT = 3001;
const CONFIG_FILE = path.join(__dirname, '.bridge-config.json');

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag, fallback = '') {
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

function normalizeCloudUrl(url) {
    if (!url || typeof url !== 'string') return 'https://api.filepeapp.com/api';
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.includes('api-qa.filepeapp.com')) {
        if (!clean.endsWith('/api')) clean = `${clean}/api`;
        return clean;
    }
    if (clean.includes('qa.filepeapp.com')) {
        console.log(`[PRINT STATION] ℹ️ Auto-resolving QA cloudUrl from web host (${clean}) to API server (https://api-qa.filepeapp.com/api)`);
        return 'https://api-qa.filepeapp.com/api';
    }
    if (clean.includes('api.filepeapp.com')) {
        if (!clean.endsWith('/api')) clean = `${clean}/api`;
        return clean;
    }
    if (clean.includes('filepeapp.com')) {
        return 'https://api.filepeapp.com/api';
    }
    if (!clean.endsWith('/api') && !clean.includes('localhost') && !clean.includes('127.0.0.1')) {
        clean = `${clean}/api`;
    }
    return clean;
}

let activeConfig = {
    cloudUrl: normalizeCloudUrl(getArg('--cloud', process.env.BRIDGE_CLOUD_URL || savedConfig.cloudUrl || 'https://api.filepeapp.com/api')),
    mongoUri: getArg('--mongo', process.env.BRIDGE_MONGO_URI || savedConfig.mongoUri || ''),
    shopId: getArg('--shop', process.env.BRIDGE_SHOP_ID || savedConfig.shopId || ''),
    branchId: getArg('--branch', process.env.BRIDGE_BRANCH_ID || savedConfig.branchId || ''),
    pollIntervalMs: parseInt(getArg('--interval', process.env.BRIDGE_POLL_INTERVAL || savedConfig.pollIntervalMs || 1000), 10),
};

function saveActiveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(activeConfig, null, 2), 'utf8');
    } catch (e) {
        console.warn('Could not save bridge config:', e.message);
    }
}

// If CLI flags provided, update and save config
if (getArg('--shop') || getArg('--branch') || getArg('--cloud')) {
    saveActiveConfig();
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
    // Printer IP and Port are 100% dynamic from each incoming job
    const ip = job.printerIp || '192.168.1.100';
    const port = parseInt(job.printerPort || 9100, 10);
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

    console.log(`[PRINT STATION] 🖨️ Target: ${ip}:${port} (${paperWidthMm}mm ESC/POS)`);
    console.log(`[PRINT STATION] 🔌 Connecting TCP socket to ${ip}:${port}...`);
    await sendToNetworkPrinter(ip, port, buffer);
    console.log(`[PRINT STATION] 📄 Sent ${buffer.length} ESC/POS bytes. Buzzer: ${job.beepBuzzer !== false ? 'YES' : 'NO'}, Cut: ${job.autoCut !== false ? 'YES' : 'NO'}`);
}

/**
 * Throttled console logging to prevent spam
 */
const lastLogTime = new Map();
function logThrottled(key, message, intervalMs = 20000) {
    const now = Date.now();
    if (!lastLogTime.has(key) || (now - lastLogTime.get(key) > intervalMs)) {
        lastLogTime.set(key, now);
        console.warn(message);
    }
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

let mongoClient = null;
let mongoDb = null;
let mongoCol = null;

async function initMongoDirect() {
    if (!activeConfig.mongoUri) return;
    try {
        const { MongoClient } = require('mongodb');
        mongoClient = new MongoClient(activeConfig.mongoUri);
        await mongoClient.connect();
        mongoDb = mongoClient.db('filepe');
        mongoCol = mongoDb.collection('printjobs');
        console.log('[PRINT STATION] ⚡ Direct MongoDB Atlas connection established! Real-time instant printing active.');
    } catch (e) {
        console.log('[PRINT STATION] ℹ️ Direct MongoDB connection unavailable, using HTTP cloud polling:', e.message);
        mongoClient = null;
        mongoDb = null;
        mongoCol = null;
    }
}

/**
 * Cloud Queue Poller:
 * Polls the backend cloud for pending jobs placed by Waiter Phones or Tablets
 */
let isPolling = false;
async function pollCloudPrintQueue() {
    if (isPolling) return;
    if (!activeConfig.shopId && !activeConfig.branchId) return;
    isPolling = true;

    try {
        // Mode A: Direct MongoDB Atlas (fastest, zero HTTP/proxy overhead, avoids ObjectId string mismatch)
        if (mongoCol && activeConfig.shopId) {
            try {
                const { ObjectId } = require('mongodb');
                const shopOid = ObjectId.isValid(activeConfig.shopId) ? new ObjectId(activeConfig.shopId) : null;
                const branchOid = (activeConfig.branchId && ObjectId.isValid(activeConfig.branchId)) ? new ObjectId(activeConfig.branchId) : null;

                const shopFilter = shopOid ? { $in: [activeConfig.shopId, shopOid] } : activeConfig.shopId;
                const query = {
                    status: 'PENDING',
                    shopId: shopFilter
                };
                if (activeConfig.branchId) {
                    query.branchId = branchOid ? { $in: [activeConfig.branchId, branchOid] } : activeConfig.branchId;
                }

                const pendingJobs = await mongoCol.find(query).sort({ createdAt: 1 }).limit(5).toArray();
                for (const job of pendingJobs) {
                    const claimResult = await mongoCol.updateOne(
                        { _id: job._id, status: 'PENDING' },
                        { $set: { status: 'PROCESSING', claimedAt: new Date(), claimedBy: 'print-station-local' } }
                    );
                    if (claimResult.modifiedCount === 0) continue;

                    console.log(`\n=======================================================`);
                    console.log(`[PRINT STATION] 📥 Claimed Job (Direct Atlas): #${job._id} (Type: ${(job.type || 'kot').toUpperCase()})`);
                    console.log(`[PRINT STATION] 🏢 Shop: ${job.shopId} | Branch: ${job.branchId || 'default'}`);
                    try {
                        await processCloudJob(job);
                        await mongoCol.updateOne({ _id: job._id }, { $set: { status: 'COMPLETED', completedAt: new Date() } });
                        console.log(`[PRINT STATION] ✅ Job #${job._id} printed and marked COMPLETED`);
                        console.log(`=======================================================\n`);
                    } catch (err) {
                        console.error(`[PRINT STATION] ❌ Failed to print job #${job._id}:`, err.message);
                        await mongoCol.updateOne({ _id: job._id }, { $set: { status: 'FAILED', errorMessage: err.message } });
                        console.log(`=======================================================\n`);
                    }
                }
                return;
            } catch (mErr) {
                logThrottled('mongo_poll_err', `[PRINT STATION] MongoDB poll warning: ${mErr.message}, trying HTTP...`);
            }
        }

        // Mode B: HTTP API Polling Fallback
        const baseUrl = activeConfig.cloudUrl.replace(/\/+$/, '');
        const queryParts = [];
        if (activeConfig.shopId) queryParts.push(`shopId=${encodeURIComponent(activeConfig.shopId)}`);
        if (activeConfig.branchId) queryParts.push(`branchId=${encodeURIComponent(activeConfig.branchId)}`);
        const pollUrl = `${baseUrl}/print/jobs/pending?${queryParts.join('&')}`;

        const res = await makeRequest(pollUrl, {
            method: 'GET',
            headers: {
                'x-branch-id': activeConfig.branchId || '',
                'x-shop-id': activeConfig.shopId || '',
                'x-bridge-client': 'pos-print-station-v1',
            },
        });

        if (res.status === 200 && res.data && Array.isArray(res.data.jobs)) {
            for (const job of res.data.jobs) {
                console.log(`\n=======================================================`);
                console.log(`[PRINT STATION] 📥 Claimed Job: #${job._id} (Type: ${job.type.toUpperCase()})`);
                console.log(`[PRINT STATION] 🏢 Shop: ${job.shopId || activeConfig.shopId} | Branch: ${job.branchId || 'default'}`);
                try {
                    await processCloudJob(job);
                    const completeUrl = `${baseUrl}/print/jobs/${job._id}/complete`;
                    await makeRequest(completeUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-branch-id': activeConfig.branchId || '',
                            'x-shop-id': activeConfig.shopId || '',
                            'x-bridge-client': 'pos-print-station-v1',
                        },
                    }, { status: 'COMPLETED' });
                    console.log(`[PRINT STATION] ✅ Job #${job._id} marked COMPLETED on cloud queue`);
                    console.log(`=======================================================\n`);
                } catch (err) {
                    console.error(`[PRINT STATION] ❌ Failed to print job #${job._id}:`, err.message);
                    const completeUrl = `${baseUrl}/print/jobs/${job._id}/complete`;
                    await makeRequest(completeUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-branch-id': activeConfig.branchId || '',
                            'x-shop-id': activeConfig.shopId || '',
                            'x-bridge-client': 'pos-print-station-v1',
                        },
                    }, { status: 'FAILED', errorMessage: err.message });
                    console.log(`=======================================================\n`);
                }
            }
        } else if (res.status === 401 || res.status === 403) {
            logThrottled('auth_err', `[PRINT STATION] ⚠️ Authentication required (${res.status}) when polling ${baseUrl}. Check shopId or token.`);
        } else if (res.status !== 200) {
            logThrottled('poll_err', `[PRINT STATION] ⚠️ HTTP ${res.status} from ${pollUrl}: ${typeof res.data === 'string' ? res.data.slice(0, 100) : JSON.stringify(res.data)}`);
        }
    } catch (err) {
        logThrottled('net_err', `[PRINT STATION] ⚠️ Network error reaching cloud: ${err.message}`);
    } finally {
        isPolling = false;
    }
}

/**
 * Send periodic heartbeat to cloud so POS shows station as ACTIVE (ONLINE)
 */
async function sendHeartbeat() {
    if (!activeConfig.shopId && !activeConfig.branchId) return;
    try {
        const baseUrl = activeConfig.cloudUrl.replace(/\/+$/, '');
        await makeRequest(`${baseUrl}/print/bridge/status`, {
            method: 'GET',
            headers: {
                'x-branch-id': activeConfig.branchId || '',
                'x-shop-id': activeConfig.shopId || '',
                'x-bridge-client': 'pos-print-station-v1',
            },
        });
    } catch (e) {
        // ignore
    }
}

// Initialize direct MongoDB Atlas connection on startup, then start polling
initMongoDirect().finally(() => {
    setInterval(pollCloudPrintQueue, activeConfig.pollIntervalMs);
    setInterval(sendHeartbeat, 10000);
    setTimeout(sendHeartbeat, 1000);
});

/**
 * Local HTTP Server for local health check & dynamic session sync
 */
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-branch-id, x-shop-id');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            station: 'Counter PC Print Station Running',
            config: activeConfig,
            time: new Date().toISOString(),
        }));
        return;
    }

    // Dynamic session sync from web browser
    if (req.url === '/session' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const patch = JSON.parse(body || '{}');
                if (patch.shopId) activeConfig.shopId = patch.shopId;
                if (patch.branchId) activeConfig.branchId = patch.branchId;
                if (patch.cloudUrl) activeConfig.cloudUrl = patch.cloudUrl;
                saveActiveConfig();
                console.log(`[PRINT STATION] 🔄 Synced session dynamically: Shop ${activeConfig.shopId}, Branch ${activeConfig.branchId}`);
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

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`[PRINT STATION] ⚠️ Port ${PORT} is already in use by another instance on this PC.`);
    } else {
        console.error(`[PRINT STATION] Server error:`, err.message);
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`=======================================================`);
    console.log(`  Counter PC Thermal Print Station running on port ${PORT}`);
    console.log(`  Hosted Cloud API:  ${activeConfig.cloudUrl}`);
    console.log(`  Target Shop ID:    ${activeConfig.shopId || '(waiting for session)'}`);
    console.log(`  Target Branch ID:  ${activeConfig.branchId || '(all branches)'}`);
    console.log(`  Printer IP / Port: Dynamically read from each print job`);
    console.log(`=======================================================`);
});
