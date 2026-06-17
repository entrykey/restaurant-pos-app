export const BILL_PRINT_SETTINGS_KEY = 'BILL_PRINT_SETTINGS';
export const PURCHASE_INVOICE_SETTINGS_KEY = 'PURCHASE_INVOICE_SETTINGS';

const FORMAT_FIELDS = [
    'includeLogo', 'includeShopName', 'includeBranchName', 'includeAddress', 'includeContact',
    'includeGstNumber', 'includeFssai', 'includeUpiCode', 'includeInvoiceNumber', 'includeOrderNumber',
    'includeCustomer', 'includeTable', 'includeStaff', 'includeTaxBreakdown', 'includeOffers',
    'includePaymentMethod', 'includeThankYou', 'footerText', 'elementsOrder',
];

export const DEFAULT_THERMAL_BILL_SETTINGS = {
    includeLogo: true,
    includeShopName: true,
    includeBranchName: true,
    includeAddress: true,
    includeContact: true,
    includeGstNumber: true,
    includeFssai: true,
    includeUpiCode: false,
    includeInvoiceNumber: true,
    includeOrderNumber: true,
    includeCustomer: true,
    includeTable: true,
    includeStaff: false,
    includeTaxBreakdown: true,
    includeOffers: true,
    includePaymentMethod: true,
    includeThankYou: true,
    footerText: 'Thank you! Visit Again',
    paperWidthMm: 80,
    baseFontSize: 12,
    elementsOrder: ['logo', 'shopName', 'branchName', 'address', 'contact', 'gstNumber', 'fssai', 'billTitle', 'meta', 'items', 'totals', 'upiCode', 'footer'],
};

export const DEFAULT_A4_BILL_SETTINGS = {
    includeLogo: true,
    includeShopName: true,
    includeBranchName: true,
    includeAddress: true,
    includeContact: true,
    includeGstNumber: true,
    includeFssai: true,
    includeUpiCode: false,
    includeInvoiceNumber: true,
    includeOrderNumber: true,
    includeCustomer: true,
    includeTable: true,
    includeStaff: false,
    includeTaxBreakdown: true,
    includeOffers: true,
    includePaymentMethod: true,
    includeThankYou: true,
    footerText: 'Thank you! Visit Again',
    elementsOrder: ['logo', 'shopName', 'branchName', 'address', 'contact', 'gstNumber', 'fssai', 'billTitle', 'meta', 'items', 'totals', 'upiCode', 'footer'],
};

export const DEFAULT_BILL_PRINT_SETTINGS = {
    defaultFormat: 'thermal',
    printOnCompleteSale: true,
    thermal: DEFAULT_THERMAL_BILL_SETTINGS,
    a4: DEFAULT_A4_BILL_SETTINGS,
};

export const DEFAULT_PURCHASE_INVOICE_SETTINGS = {
    defaultPaperSize: 'a4',
    includeShopName: true,
    includeBranchAddress: true,
    includeSupplierDetails: true,
    includeGstNumber: true,
    includeFssai: true,
    includeItemCode: true,
    includeTaxBreakdown: true,
    includeNotes: true,
    includePurchaseDate: true,
    includeInvoiceNumber: true,
    footerText: '',
};

export const BILL_FIELD_LABELS = {
    includeLogo: 'Logo',
    includeShopName: 'Shop Name',
    includeBranchName: 'Branch Name',
    includeAddress: 'Address',
    includeContact: 'Contact',
    includeGstNumber: 'GST Number',
    includeFssai: 'FSSAI Number',
    includeUpiCode: 'UPI QR Code',
    includeInvoiceNumber: 'Invoice Number',
    includeOrderNumber: 'Order Number',
    includeCustomer: 'Customer',
    includeTable: 'Table / Order Type',
    includeStaff: 'Staff Name',
    includeTaxBreakdown: 'Tax Breakdown (CGST/SGST/IGST)',
    includeOffers: 'Applied Offers',
    includePaymentMethod: 'Payment Method',
    includeThankYou: 'Thank You Footer',
};

export const PURCHASE_FIELD_LABELS = {
    includeShopName: 'Shop Name',
    includeBranchAddress: 'Branch Address',
    includeSupplierDetails: 'Supplier Details',
    includeGstNumber: 'GST Number',
    includeFssai: 'FSSAI Number',
    includeItemCode: 'Item Code',
    includeTaxBreakdown: 'Tax Breakdown',
    includeNotes: 'Notes',
    includePurchaseDate: 'Purchase Date',
    includeInvoiceNumber: 'Invoice Number',
};

export const mergeBillPrintSettings = (saved) => {
    if (!saved) return { ...DEFAULT_BILL_PRINT_SETTINGS };
    return {
        defaultFormat: saved.defaultFormat ?? DEFAULT_BILL_PRINT_SETTINGS.defaultFormat,
        printOnCompleteSale: saved.printOnCompleteSale ?? DEFAULT_BILL_PRINT_SETTINGS.printOnCompleteSale,
        thermal: { ...DEFAULT_THERMAL_BILL_SETTINGS, ...(saved.thermal || {}) },
        a4: { ...DEFAULT_A4_BILL_SETTINGS, ...(saved.a4 || {}) },
    };
};

export const mergePurchaseInvoiceSettings = (saved) => {
    if (!saved) return { ...DEFAULT_PURCHASE_INVOICE_SETTINGS };
    return { ...DEFAULT_PURCHASE_INVOICE_SETTINGS, ...saved };
};

export const areBillPrintSettingsEqual = (a, b) =>
    JSON.stringify(mergeBillPrintSettings(a)) === JSON.stringify(mergeBillPrintSettings(b));

export const arePurchaseInvoiceSettingsEqual = (a, b) =>
    JSON.stringify(mergePurchaseInvoiceSettings(a)) === JSON.stringify(mergePurchaseInvoiceSettings(b));

export { FORMAT_FIELDS };
