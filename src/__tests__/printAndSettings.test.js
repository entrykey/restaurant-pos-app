// Lightweight browser/DOM stubs so print & settings tests run cleanly in --env=node
// without requiring native canvas.node bindings in jsdom.
const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
};

const createdElements = {};
let writtenHtml = '';
const mockIframe = {
    id: '',
    style: {},
    setAttribute: () => {},
    contentWindow: {
        document: {
            open: () => { writtenHtml = ''; },
            write: (html) => { writtenHtml += html; },
            close: () => {},
            images: [],
            documentElement: {
                get outerHTML() { return writtenHtml; },
            },
        },
        addEventListener: () => {},
        focus: () => {},
        print: jest.fn(),
    },
    parentNode: {
        removeChild: () => { delete createdElements['__pos_print_iframe__']; },
    },
};

global.window = {
    location: { hostname: 'qa.filepeapp.com' },
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    open: jest.fn(),
};
global.navigator = global.window.navigator;
global.document = {
    getElementById: (id) => createdElements[id] || null,
    createElement: (tag) => {
        if (tag === 'iframe') {
            return {
                ...mockIframe,
                style: {},
                contentWindow: {
                    ...mockIframe.contentWindow,
                    print: jest.fn(),
                },
            };
        }
        return { style: {}, setAttribute: () => {} };
    },
    head: { appendChild: () => {} },
    body: {
        appendChild: (el) => {
            if (el.id) createdElements[el.id] = el;
        },
    },
};

jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

const mockApiPost = jest.fn(() => Promise.resolve({ data: { success: true } }));
jest.mock('../services/api', () => ({
    api: {
        post: (...args) => mockApiPost(...args),
    },
    settingService: {},
}));

const {
    mergeBillPrintSettings,
    mergeHardwarePrinterSettings,
} = require('../config/billPrintSettings');
const { getHardwarePrinterSettingsCached } = require('../utils/printSettingsUtils');
const { getResolvedCloudApiUrl } = require('../utils/printBridgeInstaller');
const { printHtml, printBill, printBillA4 } = require('../utils/print');

describe('billPrintSettings & printSettingsUtils', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('mergeBillPrintSettings and mergeHardwarePrinterSettings preserve defaults', () => {
        const bill = mergeBillPrintSettings({ thermal: { paperWidthMm: 58 } });
        expect(bill.thermal.paperWidthMm).toBe(58);
        expect(bill.a4.includeShopName).toBe(true);

        const hw = mergeHardwarePrinterSettings({ printMode: 'browser', cashierPrinter: { ip: '192.168.123.100' } });
        expect(hw.printMode).toBe('browser');
        expect(hw.cashierPrinter.ip).toBe('192.168.123.100');
    });

    test('getHardwarePrinterSettingsCached falls back to pos_activeBranchId when branchId is null', () => {
        localStorage.setItem('pos_activeBranchId', 'branch-123');
        localStorage.setItem('pos_hardware_printer_branch-123', JSON.stringify({ printMode: 'browser' }));

        const cached = getHardwarePrinterSettingsCached(null);
        expect(cached.printMode).toBe('browser');
    });
});

describe('printBridgeInstaller.js', () => {
    test('getResolvedCloudApiUrl resolves QA API URL from hostname', () => {
        const url = getResolvedCloudApiUrl();
        expect(url).toBe('https://api-qa.filepeapp.com/api');
    });
});

describe('print.js', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        localStorage.clear();
        delete createdElements['__pos_print_iframe__'];
        writtenHtml = '';
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('printHtml opens iframe print preview when printMode is browser even for LAN printer', () => {
        localStorage.setItem('pos_activeBranchId', 'b1');
        localStorage.setItem('pos_hardware_printer_b1', JSON.stringify({
            printMode: 'browser',
            cashierPrinter: { enabled: true, connectionType: 'lan', ip: '192.168.123.100' },
        }));

        const ok = printHtml({ title: 'Test Receipt', html: '<div class="paper">Hello</div>', branchId: 'b1' });
        expect(ok).toBe(true);

        const iframe = document.getElementById('__pos_print_iframe__');
        expect(iframe).not.toBeNull();
        expect(iframe.style.width).toBe('210mm');
        expect(iframe.style.height).toBe('297mm');
    });

    test('printBillA4 writes full A4 HTML without double-wrapping in 80mm document', () => {
        printBillA4({
            header: { shopName: 'Perota Hut', branchName: 'Main' },
            meta: { invoiceLabel: 'INV: INV-001', orderLabel: '#ORD-00001' },
            items: [{ name: 'Parotta', qty: 2, lineTotal: 40 }],
            totals: { subtotal: 40, taxAmount: 0, finalTotal: 40 },
            branchId: 'b1',
        });

        const iframe = document.getElementById('__pos_print_iframe__');
        expect(iframe).not.toBeNull();
        expect(writtenHtml).toContain('Perota Hut');
        expect(writtenHtml).not.toContain('size: 80mm auto');
    });

    test('printBill forwards header, meta, items, totals, and paymentMethod for silent LAN printing', async () => {
        mockApiPost.mockClear();
        localStorage.setItem('pos_activeBranchId', 'b1');
        localStorage.setItem('pos_hardware_printer_b1', JSON.stringify({
            printMode: 'silent',
            cashierPrinter: { enabled: true, connectionType: 'lan', ip: '192.168.123.100', port: 9100 },
        }));

        printBill({
            header: { shopName: 'Perota Hut', branchName: 'Main' },
            meta: { invoiceLabel: 'INV-001', orderLabel: 'ORD-00010', tableLabel: 'Table 2' },
            items: [{ name: 'Chicken Biryani', qty: 2, lineTotal: 320 }],
            totals: { subtotal: 320, taxAmount: 16, finalTotal: 336 },
            paymentMethod: 'CASH',
            branchId: 'b1',
        });

        await Promise.resolve();
        expect(mockApiPost).toHaveBeenCalledTimes(1);
        const [url, payload] = mockApiPost.mock.calls[0];
        expect(url).toBe('/print/network');
        expect(payload.header.shopName).toBe('Perota Hut');
        expect(payload.items).toHaveLength(1);
        expect(payload.items[0].name).toBe('Chicken Biryani');
        expect(payload.totals.finalTotal).toBe(336);
        expect(payload.meta.paymentMethod).toBe('CASH');
    });
});
