import { settingService } from '../services/api';
import { api } from '../services/api';
import { printBill, printBillA4 } from './print';
import { BARCODE_PRINT_SETTINGS_KEY, mergeBarcodePrintSettings } from '../config/barcodePrintSettings';
import {
    BILL_PRINT_SETTINGS_KEY,
    PURCHASE_INVOICE_SETTINGS_KEY,
    mergeBillPrintSettings,
    mergePurchaseInvoiceSettings,
} from '../config/billPrintSettings';

export const loadBarcodePrintSettings = async (shopId, branchId) => {
    try {
        const response = await settingService.getSettingByKey(BARCODE_PRINT_SETTINGS_KEY, shopId, branchId);
        return mergeBarcodePrintSettings({}, response?.value);
    } catch {
        return mergeBarcodePrintSettings({}, null);
    }
};

export const loadBillPrintSettings = async (shopId, branchId) => {
    try {
        const response = await settingService.getSettingByKey(BILL_PRINT_SETTINGS_KEY, shopId, branchId);
        return mergeBillPrintSettings(response?.value);
    } catch {
        return mergeBillPrintSettings(null);
    }
};

export const loadPurchaseInvoiceSettings = async (shopId, branchId) => {
    try {
        const response = await settingService.getSettingByKey(PURCHASE_INVOICE_SETTINGS_KEY, shopId, branchId);
        return mergePurchaseInvoiceSettings(response?.value);
    } catch {
        return mergePurchaseInvoiceSettings(null);
    }
};

export const buildBillExtraInfo = (branch, organization) => ({
    gstNumber: branch?.taxProfile?.registrationNumber || branch?.taxConfig?.gstin || '',
    fssai: branch?.fssai || '',
    upiId: branch?.upiId || organization?.defaultUpiId || '',
    payeeName: organization?.businessName || organization?.name || branch?.name || 'Shop',
});

export const buildPrintHeader = ({ organization, branch, orderFromBackend, settings, currentUser }) => {
    const backendShop = orderFromBackend?.shopId || null;
    const backendBranch = orderFromBackend?.branchId || null;
    const activeBranch = backendBranch || branch || null;
    const address = activeBranch?.address || {};
    const addressLines = [
        address?.line1,
        address?.line2,
        [address?.city, address?.state?.name || address?.state].filter(Boolean).join(', '),
        [address?.country?.name || address?.country, address?.pincode].filter(Boolean).join(' - '),
    ].filter(Boolean);

    const toAbsoluteLogoUrl = (logoUrl) => {
        if (!logoUrl) return null;
        if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
        const base = (api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');
        if (!base) return logoUrl;
        return `${base}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
    };

    return {
        logoUrl: toAbsoluteLogoUrl(backendShop?.logoUrl || organization?.logoUrl || null),
        shopName: backendShop?.name || organization?.businessName || settings?.shopName || 'Shop',
        branchName: backendBranch?.name || activeBranch?.name || 'Branch',
        contact: backendShop?.ownerContact || organization?.ownerContact || settings?.shopPhone || settings?.phone || currentUser?.phone || '',
        addressLines,
    };
};

export const printSaleOrder = async ({
    order,
    format,
    billSettings,
    header,
    extraInfo,
    formatCurrency,
    staffName,
    paymentMethod,
}) => {
    const mergedSettings = mergeBillPrintSettings(billSettings);
    const printFormat = format || mergedSettings.defaultFormat || 'thermal';
    const fmtSettings = printFormat === 'a4' ? mergedSettings.a4 : mergedSettings.thermal;

    const backendItems = order?.items || [];
    const itemsForPrint = backendItems.map((it) => ({
        name: it?.itemId?.name || it?.itemName || it?.name || 'Item',
        qty: it?.quantity ?? 0,
        variant: '',
        lineTotal: it?.totalAmount ?? (Number(it?.price || 0) * Number(it?.quantity || 0)),
    }));

    const totals = {
        subtotal: order?.subtotal ?? 0,
        discountAmount: order?.discountTotal ?? 0,
        taxAmount: order?.taxTotal ?? 0,
        taxBreakdown: order?.taxBreakdown ?? null,
        roundOff: 0,
        finalTotal: order?.grandTotal ?? 0,
    };

    const printer = printFormat === 'a4' ? printBillA4 : printBill;
    printer({
        header,
        meta: {
            invoiceLabel: order?.invoiceNumber || '',
            orderLabel: order?.orderNumber || '',
            tableLabel: order?.tableId?.name ? order.tableId.name : (order?.orderType === 'DIRECT_SALE' ? 'Direct Sale' : ''),
            customerLabel: order?.customerId?.name
                ? `${order.customerId.name}${order.customerId.phone ? ` (${order.customerId.phone})` : ''}`
                : (order?.customerName || ''),
            printedAt: new Date().toLocaleString(),
        },
        items: itemsForPrint,
        totals,
        offers: (order?.appliedOffers || []).map((o) => ({
            name: o.offerName || o.name,
            discount: o.discountAmount || o.discount || 0,
        })),
        staffName: order?.createdBy?.name || staffName || '',
        formatCurrency,
        billSettings: mergedSettings,
        extraInfo,
        paymentMethod,
    });
};
