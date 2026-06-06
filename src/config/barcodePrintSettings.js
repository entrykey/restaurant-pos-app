export const BARCODE_PRINT_SETTINGS_KEY = 'BARCODE_PRINT_SETTINGS';

export const DEFAULT_BARCODE_PRINT_SETTINGS = {
    includeName: true,
    includeCode: true,
    includePrice: false,
    includeLogo: false,
    includeShopName: false,
    includeBatch: false,
    includeExpiry: false,
    includeUnit: false,
    includeMRP: false,
    showNameLabel: false,
    showCodeLabel: false,
    showPriceLabel: false,
    showMRPLabel: false,
    showBatchLabel: false,
    showExpiryLabel: false,
    showUnitLabel: false,
    customText: '',
    layout: 'ROWS',
    labelWidth: 50,
    labelHeight: 25,
    labelGapX: 2,
    labelGapY: 2,
    barcodeHeight: 30,
    baseFontSize: 10,
    printMode: 'ROLL',
    labelsPerRow: 1,
    elementsOrder: ['shopName', 'logo', 'barcode', 'name', 'code', 'unit', 'price', 'mrp', 'batch', 'expiry', 'custom'],
};

const SESSION_KEYS = new Set(['isOpen', 'item', 'barcode', 'copies']);

export const extractSavableBarcodeSettings = (state = {}) => {
    const saved = {};
    Object.keys(DEFAULT_BARCODE_PRINT_SETTINGS).forEach((key) => {
        saved[key] = state[key] ?? DEFAULT_BARCODE_PRINT_SETTINGS[key];
    });
    return saved;
};

export const mergeBarcodePrintSettings = (currentState, savedSettings) => {
    if (!savedSettings) return currentState;
    const merged = { ...currentState };
    Object.keys(DEFAULT_BARCODE_PRINT_SETTINGS).forEach((key) => {
        if (savedSettings[key] !== undefined) {
            merged[key] = savedSettings[key];
        }
    });
    SESSION_KEYS.forEach((key) => {
        if (currentState[key] !== undefined) {
            merged[key] = currentState[key];
        }
    });
    return merged;
};

export const areBarcodeSettingsEqual = (a, b) => {
    return JSON.stringify(extractSavableBarcodeSettings(a)) === JSON.stringify(extractSavableBarcodeSettings(b));
};
