import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer, Save, RefreshCw, Barcode, FileText, ShoppingCart, MapPin } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { settingService } from '../../services/api';
import CommonSelect from '../../components/ui/CommonSelect';
import toast from 'react-hot-toast';
import PrintSettingsPreview from './PrintSettingsPreview';
import {
    printTestBarcodeLabel,
    printTestSaleBill,
    printTestPurchaseInvoice,
} from '../../utils/printTestHelpers';
import { buildBillExtraInfo, buildPrintHeader } from '../../utils/printSettingsUtils';
import {
    BARCODE_PRINT_SETTINGS_KEY,
    DEFAULT_BARCODE_PRINT_SETTINGS,
    areBarcodeSettingsEqual,
    extractSavableBarcodeSettings,
    mergeBarcodePrintSettings,
} from '../../config/barcodePrintSettings';
import {
    BILL_PRINT_SETTINGS_KEY,
    PURCHASE_INVOICE_SETTINGS_KEY,
    BILL_FIELD_LABELS,
    PURCHASE_FIELD_LABELS,
    DEFAULT_BILL_PRINT_SETTINGS,
    DEFAULT_PURCHASE_INVOICE_SETTINGS,
    areBillPrintSettingsEqual,
    arePurchaseInvoiceSettingsEqual,
    mergeBillPrintSettings,
    mergePurchaseInvoiceSettings,
} from '../../config/billPrintSettings';

const BARCODE_FIELD_OPTIONS = [
    { key: 'includeLogo', label: 'Logo' },
    { key: 'includeShopName', label: 'Shop Name' },
    { key: 'includeName', label: 'Item Name' },
    { key: 'includeCode', label: 'Item Code' },
    { key: 'includePrice', label: 'Price' },
    { key: 'includeMRP', label: 'MRP' },
    { key: 'includeBatch', label: 'Batch' },
    { key: 'includeExpiry', label: 'Expiry' },
    { key: 'includeUnit', label: 'Unit/Qty' },
];

const BARCODE_LABEL_OPTIONS = [
    { key: 'showNameLabel', label: 'Item Name' },
    { key: 'showCodeLabel', label: 'Item Code' },
    { key: 'showPriceLabel', label: 'Price' },
    { key: 'showMRPLabel', label: 'MRP' },
    { key: 'showBatchLabel', label: 'Batch' },
    { key: 'showExpiryLabel', label: 'Expiry' },
    { key: 'showUnitLabel', label: 'Unit/Qty' },
];

const Toggle = ({ checked, onChange, label, theme }) => (
    <label className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${theme.inputBorder} ${theme.inputBg} cursor-pointer`}>
        <span className={`text-sm font-bold ${theme.textPrimary}`}>{label}</span>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${checked ? theme.buttonBg : 'bg-gray-300'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`} />
        </button>
    </label>
);

const CheckboxGrid = ({ options, values, onChange, theme }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {options.map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer`}>
                <input
                    type="checkbox"
                    checked={!!values[key]}
                    onChange={(e) => onChange(key, e.target.checked)}
                    className="rounded text-indigo-500"
                />
                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>{label}</span>
            </label>
        ))}
    </div>
);

const SectionLayout = ({ children, preview }) => (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">{children}</div>
        <div className="min-w-0">{preview}</div>
    </div>
);

const BarcodeBillSettings = ({ currentUser }) => {
    const { theme } = useTheme();
    const { branches, currentShopId, activeBranchId, organization, formatCurrency } = useApp();
    const isSuperAdmin = currentUser?.isSuperAdmin === true;

    const [activeSection, setActiveSection] = useState('barcode');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [barcodeSettings, setBarcodeSettings] = useState({ ...DEFAULT_BARCODE_PRINT_SETTINGS });
    const [barcodeBaseline, setBarcodeBaseline] = useState(null);
    const [billSettings, setBillSettings] = useState({ ...DEFAULT_BILL_PRINT_SETTINGS });
    const [billBaseline, setBillBaseline] = useState(null);
    const [purchaseSettings, setPurchaseSettings] = useState({ ...DEFAULT_PURCHASE_INVOICE_SETTINGS });
    const [purchaseBaseline, setPurchaseBaseline] = useState(null);

    const activeBranch = useMemo(
        () => branches.find((b) => String(b._id || b.id) === String(activeBranchId)),
        [branches, activeBranchId]
    );

    const saveShopId = isSuperAdmin ? null : (currentShopId || null);
    const saveBranchId = isSuperAdmin ? null : (activeBranchId || null);
    const canSave = isSuperAdmin || !!activeBranchId;

    const previewHeader = useMemo(
        () => buildPrintHeader({ organization, branch: activeBranch, currentUser }),
        [organization, activeBranch, currentUser]
    );
    const previewExtraInfo = useMemo(
        () => buildBillExtraInfo(activeBranch, organization),
        [activeBranch, organization]
    );

    const loadSettings = useCallback(async () => {
        if (!isSuperAdmin && !activeBranchId) return;

        setIsRefreshing(true);
        try {
            const loadKey = async (key, mergeFn) => {
                try {
                    const res = await settingService.getSettingByKey(key, saveShopId, saveBranchId);
                    return mergeFn(res?.value);
                } catch {
                    return mergeFn(null);
                }
            };

            const [barcode, bill, purchase] = await Promise.all([
                loadKey(BARCODE_PRINT_SETTINGS_KEY, (v) => extractSavableBarcodeSettings(mergeBarcodePrintSettings({}, v))),
                loadKey(BILL_PRINT_SETTINGS_KEY, mergeBillPrintSettings),
                loadKey(PURCHASE_INVOICE_SETTINGS_KEY, mergePurchaseInvoiceSettings),
            ]);

            setBarcodeSettings(barcode);
            setBarcodeBaseline(barcode);
            setBillSettings(bill);
            setBillBaseline(bill);
            setPurchaseSettings(purchase);
            setPurchaseBaseline(purchase);
        } catch (error) {
            console.error('Failed to load print settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setIsRefreshing(false);
        }
    }, [isSuperAdmin, saveShopId, saveBranchId, activeBranchId]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const isBarcodeDirty = barcodeBaseline && !areBarcodeSettingsEqual(barcodeSettings, barcodeBaseline);
    const isBillDirty = billBaseline && !areBillPrintSettingsEqual(billSettings, billBaseline);
    const isPurchaseDirty = purchaseBaseline && !arePurchaseInvoiceSettingsEqual(purchaseSettings, purchaseBaseline);
    const isDirty = isBarcodeDirty || isBillDirty || isPurchaseDirty;

    const handleSave = async () => {
        if (!canSave) {
            toast.error('Select a branch from the top bar before saving');
            return;
        }
        setIsSaving(true);
        try {
            const scopeLabel = isSuperAdmin
                ? 'system defaults'
                : `branch "${activeBranch?.name || 'selected'}"`;

            if (isBarcodeDirty) {
                await settingService.updateSetting(BARCODE_PRINT_SETTINGS_KEY, {
                    shopId: saveShopId,
                    branchId: saveBranchId,
                    value: extractSavableBarcodeSettings(barcodeSettings),
                    type: 'json',
                    displayString: 'Barcode Print Settings',
                    description: 'Branch-specific barcode label print preferences',
                });
                setBarcodeBaseline(extractSavableBarcodeSettings(barcodeSettings));
            }
            if (isBillDirty) {
                await settingService.updateSetting(BILL_PRINT_SETTINGS_KEY, {
                    shopId: saveShopId,
                    branchId: saveBranchId,
                    value: billSettings,
                    type: 'json',
                    displayString: 'Bill Print Settings',
                    description: 'Sale bill print preferences for thermal and A4 formats',
                });
                setBillBaseline({ ...billSettings });
            }
            if (isPurchaseDirty) {
                await settingService.updateSetting(PURCHASE_INVOICE_SETTINGS_KEY, {
                    shopId: saveShopId,
                    branchId: saveBranchId,
                    value: purchaseSettings,
                    type: 'json',
                    displayString: 'Purchase Invoice Settings',
                    description: 'Purchase invoice print preferences',
                });
                setPurchaseBaseline({ ...purchaseSettings });
            }
            toast.success(`Print settings saved for ${scopeLabel}`);
        } catch (error) {
            console.error('Failed to save print settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const updateBillFormat = (format, key, value) => {
        setBillSettings((prev) => ({
            ...prev,
            [format]: { ...prev[format], [key]: value },
        }));
    };

    const renderBillFormatSection = (format, label) => {
        const fmt = billSettings[format] || {};
        return (
            <div className="space-y-6">
                <h4 className={`text-lg font-black ${theme.textHeading}`}>{label} Bill Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(BILL_FIELD_LABELS).map(([key, fieldLabel]) => (
                        <Toggle
                            key={key}
                            label={fieldLabel}
                            checked={!!fmt[key]}
                            onChange={(val) => updateBillFormat(format, key, val)}
                            theme={theme}
                        />
                    ))}
                </div>
                {format === 'thermal' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Paper Width (mm)</label>
                            <input
                                type="number"
                                min={58}
                                max={120}
                                value={fmt.paperWidthMm ?? 80}
                                onChange={(e) => updateBillFormat(format, 'paperWidthMm', parseInt(e.target.value) || 80)}
                                className={`w-full p-3 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-bold`}
                            />
                        </div>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Font Size (px)</label>
                            <input
                                type="number"
                                min={8}
                                max={24}
                                value={fmt.baseFontSize ?? 12}
                                onChange={(e) => updateBillFormat(format, 'baseFontSize', parseInt(e.target.value) || 12)}
                                className={`w-full p-3 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-bold`}
                            />
                        </div>
                    </div>
                )}
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Footer Text</label>
                    <input
                        value={fmt.footerText ?? ''}
                        onChange={(e) => updateBillFormat(format, 'footerText', e.target.value)}
                        className={`w-full p-3 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-bold`}
                        placeholder="Thank you message"
                    />
                </div>
            </div>
        );
    };

    const sections = [
        { id: 'barcode', label: 'Barcode Labels', icon: Barcode },
        { id: 'thermal', label: 'Sale Bill (Thermal)', icon: Printer },
        { id: 'a4', label: 'Sale Bill (A4)', icon: FileText },
        { id: 'purchase', label: 'Purchase Invoice', icon: ShoppingCart },
    ];

    const previewProps = { theme, formatCurrency };

    return (
        <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                    <Printer className={theme.primaryIconText} /> Barcode & Bill Settings
                </h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadSettings}
                        disabled={isRefreshing}
                        className={`p-2 rounded-xl ${theme.inputBg} ${theme.textSecondary} transition-all`}
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty || !canSave}
                        className={`px-6 py-3 ${theme.buttonBg} ${theme.buttonText} rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2`}
                    >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            <div className={`p-3 rounded-2xl border ${theme.borderLight} ${theme.inputBg} shrink-0 flex items-center gap-2 flex-wrap`}>
                {isSuperAdmin ? (
                    <span className={`text-xs font-bold ${theme.textSecondary}`}>
                        Editing <span className={theme.textPrimary}>system defaults</span>
                    </span>
                ) : (
                    <>
                        <MapPin size={14} className={theme.primaryIconText} />
                        <span className={`text-xs font-bold ${theme.textSecondary}`}>
                            Branch: <span className={theme.textPrimary}>{activeBranch?.name || '—'}</span>
                        </span>
                    </>
                )}
            </div>

            <div className={`flex gap-1 p-1.5 rounded-2xl border ${theme.borderLight} overflow-x-auto shrink-0`}>
                {sections.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveSection(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                            activeSection === id ? `${theme.buttonBg} ${theme.buttonText} shadow-md` : `${theme.textSecondary}`
                        }`}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            {!isSuperAdmin && !activeBranchId && (
                <p className={`text-sm font-bold ${theme.textSecondary}`}>Select a branch from the top bar to load print settings.</p>
            )}

            {activeSection === 'barcode' && (
                <SectionLayout
                    preview={
                        <PrintSettingsPreview
                            type="barcode"
                            settings={barcodeSettings}
                            {...previewProps}
                            onTestPrint={() => {
                                if (!printTestBarcodeLabel({ settings: barcodeSettings, organization, formatCurrency })) {
                                    toast.error('Allow popups to test print');
                                }
                            }}
                        />
                    }
                >
                    <p className={`text-sm ${theme.textSecondary}`}>
                        Same settings used in the Print Barcodes dialog. Changes here apply to inventory barcode printing.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { key: 'labelWidth', label: 'Label Width (mm)', parse: (v) => parseFloat(v) || 50 },
                            { key: 'labelHeight', label: 'Label Height (mm)', parse: (v) => parseFloat(v) || 25 },
                            { key: 'barcodeHeight', label: 'Barcode Size (%)', parse: (v) => parseInt(v) || 30 },
                            { key: 'baseFontSize', label: 'Font Size (px)', parse: (v) => parseInt(v) || 10 },
                        ].map(({ key, label, parse }) => (
                            <div key={key}>
                                <label className={`text-[10px] font-black uppercase ${theme.textMuted} block mb-1`}>{label}</label>
                                <input
                                    type="number"
                                    value={barcodeSettings[key]}
                                    onChange={(e) => setBarcodeSettings((p) => ({ ...p, [key]: parse(e.target.value) }))}
                                    className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} font-bold`}
                                />
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-3`}>Show on Label</p>
                        <CheckboxGrid options={BARCODE_FIELD_OPTIONS} values={barcodeSettings} onChange={(key, val) => setBarcodeSettings((p) => ({ ...p, [key]: val }))} theme={theme} />
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-3`}>Include Label Text</p>
                        <CheckboxGrid options={BARCODE_LABEL_OPTIONS} values={barcodeSettings} onChange={(key, val) => setBarcodeSettings((p) => ({ ...p, [key]: val }))} theme={theme} />
                    </div>
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Custom Text</label>
                        <input
                            value={barcodeSettings.customText || ''}
                            onChange={(e) => setBarcodeSettings((p) => ({ ...p, customText: e.target.value }))}
                            placeholder="Additional text on label"
                            className={`w-full p-3 rounded-xl border ${theme.borderLight} ${theme.inputBg} font-bold`}
                        />
                    </div>
                </SectionLayout>
            )}

            {activeSection === 'thermal' && (
                <SectionLayout
                    preview={
                        <PrintSettingsPreview
                            type="thermal"
                            billSettings={billSettings}
                            {...previewProps}
                            onTestPrint={() => printTestSaleBill({
                                format: 'thermal',
                                billSettings,
                                header: previewHeader,
                                extraInfo: previewExtraInfo,
                                formatCurrency,
                            })}
                        />
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle
                            label="Print invoice on manual sale complete"
                            checked={!!billSettings.printOnCompleteSale}
                            onChange={(val) => setBillSettings((p) => ({ ...p, printOnCompleteSale: val }))}
                            theme={theme}
                        />
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Default Print Format</label>
                            <CommonSelect
                                options={[{ label: 'Thermal', value: 'thermal' }, { label: 'A4', value: 'a4' }]}
                                value={billSettings.defaultFormat}
                                onChange={(val) => setBillSettings((p) => ({ ...p, defaultFormat: val }))}
                                labelKey="label"
                                valueKey="value"
                            />
                        </div>
                    </div>
                    {renderBillFormatSection('thermal', 'Thermal (80mm)')}
                </SectionLayout>
            )}

            {activeSection === 'a4' && (
                <SectionLayout
                    preview={
                        <PrintSettingsPreview
                            type="a4"
                            billSettings={billSettings}
                            {...previewProps}
                            onTestPrint={() => printTestSaleBill({
                                format: 'a4',
                                billSettings,
                                header: previewHeader,
                                extraInfo: previewExtraInfo,
                                formatCurrency,
                            })}
                        />
                    }
                >
                    {renderBillFormatSection('a4', 'A4 Tax Invoice')}
                </SectionLayout>
            )}

            {activeSection === 'purchase' && (
                <SectionLayout
                    preview={
                        <PrintSettingsPreview
                            type="purchase"
                            purchaseSettings={purchaseSettings}
                            {...previewProps}
                            onTestPrint={() => printTestPurchaseInvoice({ purchaseSettings, formatCurrency })}
                        />
                    }
                >
                    <p className={`text-sm ${theme.textSecondary}`}>Controls which fields appear on printed purchase invoices.</p>
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Default Paper Size</label>
                        <CommonSelect
                            options={[{ label: 'A4', value: 'a4' }, { label: 'Thermal (80mm)', value: 'thermal' }]}
                            value={purchaseSettings.defaultPaperSize || 'a4'}
                            onChange={(val) => setPurchaseSettings((p) => ({ ...p, defaultPaperSize: val }))}
                            labelKey="label"
                            valueKey="value"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(PURCHASE_FIELD_LABELS).map(([key, label]) => (
                            <Toggle
                                key={key}
                                label={label}
                                checked={!!purchaseSettings[key]}
                                onChange={(val) => setPurchaseSettings((p) => ({ ...p, [key]: val }))}
                                theme={theme}
                            />
                        ))}
                    </div>
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Footer Text</label>
                        <input
                            value={purchaseSettings.footerText || ''}
                            onChange={(e) => setPurchaseSettings((p) => ({ ...p, footerText: e.target.value }))}
                            className={`w-full p-3 rounded-xl border ${theme.borderLight} ${theme.inputBg} font-bold`}
                        />
                    </div>
                </SectionLayout>
            )}
        </div>
    );
};

export default BarcodeBillSettings;
