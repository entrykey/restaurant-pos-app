import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Printer, Save, RefreshCw, Barcode, FileText, ShoppingCart, MapPin,
    Wifi, Zap, CheckCircle2, Server, Usb, Info, Bluetooth, Network, Scissors, Cpu
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { settingService, api } from '../../services/api';
import CommonSelect from '../../components/ui/CommonSelect';
import toast from 'react-hot-toast';
import PrintSettingsPreview from './PrintSettingsPreview';
import {
    printTestBarcodeLabel,
    printTestSaleBill,
    printTestPurchaseInvoice,
} from '../../utils/printTestHelpers';
import { printKot } from '../../utils/print';
import { buildBillExtraInfo, buildPrintHeader } from '../../utils/printSettingsUtils';
import { hasPermission as checkPermission, hasPermissionFor as checkPermissionFor } from '../../utils/permissions';
import LanPrinterSetupModal from './LanPrinterSetupModal';
import { getResolvedCloudApiUrl } from '../../utils/printBridgeInstaller';
import { Download } from 'lucide-react';
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
    HARDWARE_PRINTER_SETTINGS_KEY,
    BILL_FIELD_LABELS,
    PURCHASE_FIELD_LABELS,
    DEFAULT_BILL_PRINT_SETTINGS,
    DEFAULT_PURCHASE_INVOICE_SETTINGS,
    DEFAULT_HARDWARE_PRINTER_SETTINGS,
    areBillPrintSettingsEqual,
    arePurchaseInvoiceSettingsEqual,
    areHardwarePrinterSettingsEqual,
    mergeBillPrintSettings,
    mergePurchaseInvoiceSettings,
    mergeHardwarePrinterSettings,
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

const PRINTER_MODEL_OPTIONS = [
    { label: 'POS-80C Thermal (80mm USB / LAN)', value: 'POS-80C' },
    { label: 'Epson TM Series (TM-T82 / TM-T88)', value: 'Epson TM Series' },
    { label: 'TVS Electronics (RP-3200 / RP-3150)', value: 'TVS RP-3200' },
    { label: 'NGX / Everycom / Rugtek Thermal', value: 'NGX / Everycom' },
    { label: 'Generic ESC/POS Thermal (58mm / 80mm)', value: 'Generic ESC/POS' },
    { label: 'Custom / Other Device Model', value: 'Custom' },
];

const CONNECTION_TYPES = [
    { key: 'usb', label: 'USB Cable', desc: 'Direct USB Port (POS-80C)', icon: Usb },
    { key: 'lan', label: 'LAN Cable', desc: 'Ethernet Router (Port 9100)', icon: Network },
    { key: 'wifi', label: 'Wi-Fi', desc: 'Wireless Network (Port 9100)', icon: Wifi },
    { key: 'bluetooth', label: 'Bluetooth', desc: 'Mobile Thermal (BT 4.0/5.0)', icon: Bluetooth },
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

const BarcodeBillSettings = ({ currentUser, hasPermission, hasPermissionFor }) => {
    const { theme } = useTheme();
    const { branches, currentShopId, activeBranchId, organization, formatCurrency } = useApp();
    const isSuperAdmin = currentUser?.isSuperAdmin === true;

    // Check whether user has privilege for Send KOT button in POS
    const canSendKot = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.isSuperAdmin === true) return true;
        if (typeof hasPermission === 'function') {
            if (hasPermission('orders.ORDERS.KOS') || hasPermission('orders.kos')) return true;
        }
        if (typeof hasPermissionFor === 'function') {
            if (hasPermissionFor('orders', 'orders', 'kos') || hasPermissionFor('orders', 'order', 'kos') || hasPermissionFor('pos', 'orders', 'kos')) return true;
        }
        return Boolean(
            checkPermission(currentUser, 'orders.ORDERS.KOS') ||
            checkPermission(currentUser, 'orders.kos') ||
            checkPermission(currentUser, 'ORDERS.KOS') ||
            checkPermission(currentUser, '69a29174d746466875686a83') ||
            checkPermissionFor(currentUser, 'orders', 'orders', 'kos') ||
            checkPermissionFor(currentUser, 'orders', 'order', 'kos') ||
            checkPermissionFor(currentUser, 'pos', 'orders', 'kos')
        );
    }, [currentUser, hasPermission, hasPermissionFor]);

    const [activeSection, setActiveSection] = useState('barcode');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [barcodeSettings, setBarcodeSettings] = useState({ ...DEFAULT_BARCODE_PRINT_SETTINGS });
    const [barcodeBaseline, setBarcodeBaseline] = useState(null);
    const [billSettings, setBillSettings] = useState({ ...DEFAULT_BILL_PRINT_SETTINGS });
    const [billBaseline, setBillBaseline] = useState(null);
    const [purchaseSettings, setPurchaseSettings] = useState({ ...DEFAULT_PURCHASE_INVOICE_SETTINGS });
    const [purchaseBaseline, setPurchaseBaseline] = useState(null);
    const [hardwareSettings, setHardwareSettings] = useState({ ...DEFAULT_HARDWARE_PRINTER_SETTINGS });
    const [hardwareBaseline, setHardwareBaseline] = useState(null);
    const [bridgeStatus, setBridgeStatus] = useState({ online: false, checking: true, source: null });

    // LAN Print Relay Setup Modal State
    const [isLanModalOpen, setIsLanModalOpen] = useState(false);
    const [lanModalTargetPrinter, setLanModalTargetPrinter] = useState(null);
    const [isTestingLanPrint, setIsTestingLanPrint] = useState(false);

    const activeBranch = useMemo(
        () => branches.find((b) => String(b._id || b.id) === String(activeBranchId)),
        [branches, activeBranchId]
    );

    const saveShopId = isSuperAdmin ? null : (currentShopId || null);
    const saveBranchId = isSuperAdmin ? null : (activeBranchId || null);
    const canSave = isSuperAdmin || !!activeBranchId;

    const activeResolvedShopId = currentShopId || activeBranch?.shopId || activeBranch?.shop || currentUser?.shopId || currentUser?.shop || organization?.currentShopId || organization?._id || '';
    const activeResolvedBranchId = activeBranchId || activeBranch?._id || activeBranch?.id || saveBranchId || '';

    const handleLanModalTestPrint = async () => {
        const target = lanModalTargetPrinter || hardwareSettings.kitchenPrinter || hardwareSettings.cashierPrinter;
        const ip = target?.ip || '192.168.1.100';
        const port = parseInt(target?.port || 9100, 10);
        const toastId = toast.loading(`Sending test print to ${ip}:${port}...`);
        setIsTestingLanPrint(true);
        try {
            const payload = {
                ip,
                port,
                printerName: target?.name || 'LAN Thermal Printer',
                type: (target?.name || '').toLowerCase().includes('bill') ? 'bill' : 'kot',
                paperWidthMm: target?.paperWidthMm || 80,
                autoCut: true,
                beepBuzzer: true,
                shopId: activeResolvedShopId,
                branchId: activeResolvedBranchId,
                meta: {
                    kotTitle: 'TEST LAN PRINT RELAY',
                    orderLabel: 'TEST-LAN-01',
                    tableLabel: 'Counter PC',
                    printedAt: new Date().toLocaleTimeString(),
                },
                items: [
                    { itemName: 'FilePe LAN Print Bridge Test', quantity: 1, notes: 'Direct ESC/POS socket' },
                    { itemName: 'Status: Connected', quantity: 1 },
                ]
            };
            const res = await api.post('/print/test', payload);
            const msg = res.data?.message || `Test print sent to ${ip}:${port}!`;
            if (res.data?.status === 'COMPLETED' || res.data?.printed) {
                toast.success(msg, { id: toastId, icon: '🖨️', duration: 4000 });
            } else if (res.data?.status === 'PENDING' || res.data?.status === 'PROCESSING') {
                toast(msg, { id: toastId, icon: '⏳', duration: 5000 });
            } else {
                toast.success(msg, { id: toastId, icon: '🖨️', duration: 4000 });
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to connect to printer';
            toast.error(`Print failed: ${msg}`, { id: toastId, duration: 5000 });
        } finally {
            setIsTestingLanPrint(false);
        }
    };

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

            const [barcode, bill, purchase, hardware] = await Promise.all([
                loadKey(BARCODE_PRINT_SETTINGS_KEY, (v) => extractSavableBarcodeSettings(mergeBarcodePrintSettings({}, v))),
                loadKey(BILL_PRINT_SETTINGS_KEY, mergeBillPrintSettings),
                loadKey(PURCHASE_INVOICE_SETTINGS_KEY, mergePurchaseInvoiceSettings),
                loadKey(HARDWARE_PRINTER_SETTINGS_KEY, mergeHardwarePrinterSettings),
            ]);

            setBarcodeSettings(barcode);
            setBarcodeBaseline(barcode);
            setBillSettings(bill);
            setBillBaseline(bill);
            setPurchaseSettings(purchase);
            setPurchaseBaseline(purchase);
            setHardwareSettings(hardware);
            setHardwareBaseline(hardware);

            if (saveBranchId) {
                try {
                    localStorage.setItem(`pos_hardware_printer_${saveBranchId}`, JSON.stringify(hardware));
                } catch (e) { }
            }
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

    const checkBridgeStatus = useCallback(async (showFeedback = false) => {
        // 1. Direct local probe to http://127.0.0.1:3001/health (fastest response on counter PC)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            const localRes = await fetch('http://127.0.0.1:3001/health', {
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            if (localRes.ok) {
                const localData = await localRes.json();
                if (localData?.status === 'ok') {
                    const statusObj = {
                        online: true,
                        checking: false,
                        source: 'local',
                        port: 3001,
                        station: localData.station || 'FilePe Print Station',
                        lastSeen: Date.now()
                    };
                    setBridgeStatus(statusObj);
                    if (showFeedback) toast.success("FilePe Print Station is Active on this computer!", { icon: '🟢' });
                    return statusObj;
                }
            }
        } catch (e) {
            // Local probe failed (not on counter PC or bridge not started)
        }

        // 2. Fallback to Cloud Heartbeat status
        try {
            const cloudRes = await api.get('/print/bridge/status', {
                params: {
                    branchId: activeResolvedBranchId,
                    shopId: activeResolvedShopId,
                },
            });
            if (cloudRes.data && cloudRes.data.online) {
                const statusObj = {
                    online: true,
                    checking: false,
                    source: 'cloud',
                    lastSeen: cloudRes.data.lastSeen
                };
                setBridgeStatus(statusObj);
                if (showFeedback) toast.success("FilePe Print Station is Online via Cloud Relay!", { icon: '🟢' });
                return statusObj;
            }
        } catch (e) {
            // Cloud status check error
        }

        const offlineObj = { online: false, checking: false, source: null };
        setBridgeStatus(offlineObj);
        if (showFeedback) toast.error("FilePe Print Station not detected. Please run the installer on this counter PC.", { icon: '⚠️' });
        return offlineObj;
    }, [activeResolvedBranchId, activeResolvedShopId]);

    useEffect(() => {
        let isMounted = true;
        checkBridgeStatus(false);
        const intervalId = setInterval(() => {
            if (isMounted) checkBridgeStatus(false);
        }, 8000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [checkBridgeStatus]);

    const isBarcodeDirty = barcodeBaseline && !areBarcodeSettingsEqual(barcodeSettings, barcodeBaseline);
    const isBillDirty = billBaseline && !areBillPrintSettingsEqual(billSettings, billBaseline);
    const isPurchaseDirty = purchaseBaseline && !arePurchaseInvoiceSettingsEqual(purchaseSettings, purchaseBaseline);
    const isHardwareDirty = hardwareBaseline && !areHardwarePrinterSettingsEqual(hardwareSettings, hardwareBaseline);
    const isDirty = isBarcodeDirty || isBillDirty || isPurchaseDirty || isHardwareDirty;

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
            if (isHardwareDirty) {
                await settingService.updateSetting(HARDWARE_PRINTER_SETTINGS_KEY, {
                    shopId: saveShopId,
                    branchId: saveBranchId,
                    value: hardwareSettings,
                    type: 'json',
                    displayString: 'LAN & Network Thermal Printers',
                    description: 'Branch network printer configuration for silent POS and KOT printing',
                });
                setHardwareBaseline({ ...hardwareSettings });
                if (saveBranchId) {
                    try {
                        localStorage.setItem(`pos_hardware_printer_${saveBranchId}`, JSON.stringify(hardwareSettings));
                    } catch (e) { }
                }
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
        { id: 'hardware', label: canSendKot ? 'Network Printers (LAN / KOT)' : 'Hardware Printers', icon: Wifi },
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeSection === id ? `${theme.buttonBg} ${theme.buttonText} shadow-md` : `${theme.textSecondary}`
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

            {activeSection === 'hardware' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Header Info Banner */}
                    <div className={`p-5 rounded-3xl border ${theme.borderLight} bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-indigo-50/70 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
                        <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/25">
                                <Printer size={22} />
                            </div>
                            <div>
                                <h4 className={`text-base font-black ${theme.textHeading}`}>Thermal Hardware Printers &amp; Auto-Print</h4>
                                <p className={`text-xs ${theme.textSecondary} mt-0.5 max-w-xl`}>
                                    Select your printer device, connection method (USB, LAN, Wi-Fi, or Bluetooth), and configure zero-dialog silent printing for Bills &amp; KOTs.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setHardwareSettings((p) => ({ ...p, printMode: 'silent' }))}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${hardwareSettings.printMode === 'silent'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                                    : `${theme.inputBg} ${theme.textSecondary} hover:opacity-80`
                                    }`}
                            >
                                <Zap size={14} className={hardwareSettings.printMode === 'silent' ? 'fill-current' : ''} />
                                Silent Auto-Print (No Dialog)
                            </button>
                            <button
                                type="button"
                                onClick={() => setHardwareSettings((p) => ({ ...p, printMode: 'browser' }))}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${hardwareSettings.printMode === 'browser'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                                    : `${theme.inputBg} ${theme.textSecondary} hover:opacity-80`
                                    }`}
                            >
                                <Printer size={14} />
                                Print Preview Dialog
                            </button>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 ${canSendKot ? 'lg:grid-cols-2' : 'max-w-3xl'} gap-6`}>
                        {/* 1. Cashier Receipt Thermal Printer */}
                        <div className={`p-6 rounded-3xl border ${theme.borderLight} ${theme.surfaceBg} space-y-5 shadow-sm relative overflow-hidden`}>
                            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                        <Printer size={20} />
                                    </div>
                                    <div>
                                        <h5 className={`text-base font-black ${theme.textHeading}`}>Cashier Bill Printer</h5>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Invoices &amp; Receipts</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${hardwareSettings.cashierPrinter?.enabled !== false
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                                    }`}>
                                    {hardwareSettings.cashierPrinter?.enabled !== false ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>

                            <Toggle
                                label="Enable Cashier Bill Printer"
                                checked={hardwareSettings.cashierPrinter?.enabled !== false}
                                onChange={(val) => setHardwareSettings((p) => ({
                                    ...p,
                                    cashierPrinter: { ...p.cashierPrinter, enabled: val },
                                }))}
                                theme={theme}
                            />

                            {/* Connection Method Selection */}
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>
                                    Connection Method
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {CONNECTION_TYPES.map(({ key, label, icon: Icon }) => {
                                        const isSelected = (hardwareSettings.cashierPrinter?.connectionType || 'usb') === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => {
                                                    setHardwareSettings((p) => ({
                                                        ...p,
                                                        cashierPrinter: { ...p.cashierPrinter, connectionType: key }
                                                    }));
                                                    if (key === 'lan') {
                                                        setLanModalTargetPrinter({
                                                            name: hardwareSettings.cashierPrinter?.name || 'Cashier Bill Printer',
                                                            ip: hardwareSettings.cashierPrinter?.ip || '192.168.1.100',
                                                            port: hardwareSettings.cashierPrinter?.port || 9100,
                                                            paperWidthMm: hardwareSettings.cashierPrinter?.paperWidthMm || 80
                                                        });
                                                        setIsLanModalOpen(true);
                                                    }
                                                }}
                                                className={`p-3 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${isSelected
                                                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/20'
                                                    : `${theme.borderLight} ${theme.textSecondary} hover:bg-gray-50 dark:hover:bg-slate-800/60`
                                                    }`}
                                            >
                                                <Icon size={18} />
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {hardwareSettings.cashierPrinter?.connectionType === 'lan' && (
                                    <div className="mt-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                                            <Server size={15} className="shrink-0" />
                                            <span>LAN Bridge: {bridgeStatus.online ? 'Active (Online)' : 'Not Running'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLanModalTargetPrinter({
                                                    name: hardwareSettings.cashierPrinter?.name || 'Cashier Bill Printer',
                                                    ip: hardwareSettings.cashierPrinter?.ip || '192.168.1.100',
                                                    port: hardwareSettings.cashierPrinter?.port || 9100,
                                                    paperWidthMm: hardwareSettings.cashierPrinter?.paperWidthMm || 80
                                                });
                                                setIsLanModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                        >
                                            <Download size={12} /> Setup / Download Bridge
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Device Model Preset Selector */}
                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>
                                    Printer Device / Model
                                </label>
                                <CommonSelect
                                    options={PRINTER_MODEL_OPTIONS}
                                    value={hardwareSettings.cashierPrinter?.deviceModel || 'POS-80C'}
                                    onChange={(val) => setHardwareSettings((p) => ({
                                        ...p,
                                        cashierPrinter: {
                                            ...p.cashierPrinter,
                                            deviceModel: val,
                                            name: p.cashierPrinter?.name || (val === 'POS-80C' ? 'POS-80C (USB Thermal)' : `${val} Printer`),
                                        },
                                    }))}
                                    labelKey="label"
                                    valueKey="value"
                                />
                            </div>

                            {/* Connection-specific Helper Badges */}
                            {(hardwareSettings.cashierPrinter?.connectionType || 'usb') === 'usb' && (
                                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Usb size={14} className="shrink-0" />
                                        <span>Windows USB Spooler (Port: USB002 / POS-80C)</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90">
                                        Prints via Windows default printer driver. To make printing 100% silent without any print popup dialog, launch Chrome with <code className="font-mono bg-emerald-500/20 px-1 rounded text-[10px]">--kiosk-printing</code>.
                                    </p>
                                </div>
                            )}

                            {hardwareSettings.cashierPrinter?.connectionType === 'lan' && (
                                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Network size={14} className="shrink-0" />
                                        <span>Direct LAN Cable (Ethernet / TCP Port 9100)</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90">
                                        Prints silently over the restaurant router directly to the printer IP. No browser print preview window is ever shown.
                                    </p>
                                </div>
                            )}

                            {hardwareSettings.cashierPrinter?.connectionType === 'wifi' && (
                                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Wifi size={14} className="shrink-0" />
                                        <span>Wireless Wi-Fi Thermal Printer (Port 9100)</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90">
                                        Printer is connected to restaurant Wi-Fi. Prints instantly across all devices on the same Wi-Fi.
                                    </p>
                                </div>
                            )}

                            {hardwareSettings.cashierPrinter?.connectionType === 'bluetooth' && (
                                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Bluetooth size={14} className="shrink-0" />
                                        <span>Bluetooth Thermal Printer</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90">
                                        Paired with your POS PC or tablet via Windows/Android Bluetooth settings.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Printer Display Name</label>
                                    <input
                                        type="text"
                                        value={hardwareSettings.cashierPrinter?.name || ''}
                                        onChange={(e) => setHardwareSettings((p) => ({
                                            ...p,
                                            cashierPrinter: { ...p.cashierPrinter, name: e.target.value },
                                        }))}
                                        placeholder="e.g. POS-80C (Cashier USB)"
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-xs font-bold`}
                                    />
                                </div>
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Paper Width</label>
                                    <CommonSelect
                                        options={[
                                            { label: '80mm (Standard POS Bill)', value: 80 },
                                            { label: '58mm (Compact Receipt)', value: 58 },
                                        ]}
                                        value={hardwareSettings.cashierPrinter?.paperWidthMm || 80}
                                        onChange={(val) => setHardwareSettings((p) => ({
                                            ...p,
                                            cashierPrinter: { ...p.cashierPrinter, paperWidthMm: Number(val) },
                                        }))}
                                        labelKey="label"
                                        valueKey="value"
                                    />
                                </div>
                                {(hardwareSettings.cashierPrinter?.connectionType === 'lan' || hardwareSettings.cashierPrinter?.connectionType === 'wifi') && (
                                    <>
                                        <div>
                                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Printer IP Address</label>
                                            <input
                                                type="text"
                                                value={hardwareSettings.cashierPrinter?.ip || ''}
                                                onChange={(e) => setHardwareSettings((p) => ({
                                                    ...p,
                                                    cashierPrinter: { ...p.cashierPrinter, ip: e.target.value },
                                                }))}
                                                placeholder="192.168.1.100"
                                                className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-xs font-mono font-bold`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Port (RAW ESC/POS)</label>
                                            <input
                                                type="number"
                                                value={hardwareSettings.cashierPrinter?.port || 9100}
                                                onChange={(e) => setHardwareSettings((p) => ({
                                                    ...p,
                                                    cashierPrinter: { ...p.cashierPrinter, port: parseInt(e.target.value) || 9100 },
                                                }))}
                                                placeholder="9100"
                                                className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-xs font-mono font-bold`}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Detailed Hardware Features */}
                            <div className="space-y-2.5 pt-1">
                                <Toggle
                                    label="Auto-print bill receipt upon sale checkout"
                                    checked={hardwareSettings.cashierPrinter?.autoPrintOnComplete !== false}
                                    onChange={(val) => setHardwareSettings((p) => ({
                                        ...p,
                                        cashierPrinter: { ...p.cashierPrinter, autoPrintOnComplete: val },
                                    }))}
                                    theme={theme}
                                />
                                <Toggle
                                    label="Auto-cut receipt paper (ESC/POS Cut Command)"
                                    checked={hardwareSettings.cashierPrinter?.autoCut !== false}
                                    onChange={(val) => setHardwareSettings((p) => ({
                                        ...p,
                                        cashierPrinter: { ...p.cashierPrinter, autoCut: val },
                                    }))}
                                    theme={theme}
                                />
                                <Toggle
                                    label="Pulse kick cash drawer on print (RJ-11 Port)"
                                    checked={Boolean(hardwareSettings.cashierPrinter?.openCashDrawer)}
                                    onChange={(val) => setHardwareSettings((p) => ({
                                        ...p,
                                        cashierPrinter: { ...p.cashierPrinter, openCashDrawer: val },
                                    }))}
                                    theme={theme}
                                />
                            </div>

                            <div className="pt-2 flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-400">
                                    {(hardwareSettings.cashierPrinter?.connectionType || 'usb').toUpperCase()} &bull; {hardwareSettings.cashierPrinter?.paperWidthMm || 80}mm
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cp = hardwareSettings.cashierPrinter || {};
                                        const conn = cp.connectionType || 'usb';
                                        if (conn === 'usb') {
                                            printTestSaleBill({
                                                format: 'thermal',
                                                billSettings,
                                                header: previewHeader,
                                                extraInfo: previewExtraInfo,
                                                formatCurrency,
                                            });
                                            toast.success('Sent test receipt to Windows USB printer (POS-80C)!', { icon: '🖨️' });
                                        } else {
                                            const toastId = toast.loading(`Connecting to cashier printer at ${cp.ip || '192.168.1.100'}:${cp.port || 9100}...`);
                                            const bridgeUrl = hardwareSettings.bridgeUrl || 'http://127.0.0.1:3001';
                                            const payload = {
                                                ip: cp.ip || '192.168.1.100',
                                                port: cp.port || 9100,
                                                printerName: cp.name || 'Cashier Bill Printer',
                                                paperWidthMm: cp.paperWidthMm || 80,
                                                type: 'bill',
                                                header: { shopName: 'TEST SALE INVOICE', branchName: cp.name, contact: '123-456-7890' },
                                                meta: { invoiceNumber: 'INV-TEST-001', printedAt: new Date().toLocaleTimeString() },
                                                items: [
                                                    { name: 'Demo Food Item 1', qty: 2, lineTotal: 150.00 },
                                                    { name: 'Demo Drink 2', qty: 1, lineTotal: 50.00 },
                                                ],
                                                totals: { subtotal: 200.00, taxAmount: 10.00, finalTotal: 210.00 },
                                                paymentMethod: 'Cash (Test)',
                                                footerText: `Tested via LAN IP: ${cp.ip || '192.168.1.100'}:${cp.port || 9100}`,
                                                autoCut: cp.autoCut !== false,
                                                openCashDrawer: Boolean(cp.openCashDrawer),
                                            };

                                            api.post('/print/test', payload)
                                                .then(res => {
                                                    const msg = res.data?.message || `Test bill sent to ${payload.ip}:${payload.port}!`;
                                                    if (res.data?.status === 'COMPLETED' || res.data?.printed) {
                                                        toast.success(msg, { id: toastId, icon: '🖨️', duration: 4000 });
                                                    } else if (res.data?.status === 'PENDING' || res.data?.status === 'PROCESSING') {
                                                        toast(msg, { id: toastId, icon: '⏳', duration: 5000 });
                                                    } else {
                                                        toast.success(msg, { id: toastId, icon: '🖨️', duration: 4000 });
                                                    }
                                                })
                                                .catch(err => {
                                                    const msg = err?.response?.data?.message || err?.message || 'Failed to connect to printer';
                                                    toast.error(`Print failed: ${msg}`, { id: toastId, duration: 5000 });
                                                });
                                        }
                                    }}
                                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border ${theme.borderLight} ${theme.textPrimary} hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-2`}
                                >
                                    <Printer size={14} />
                                    Test Cashier Printer
                                </button>
                            </div>
                        </div>

                        {/* 2. Kitchen KOT Thermal Printer (Visible only to users with Send KOT permission) */}
                        {canSendKot && (
                            <div className={`p-6 rounded-3xl border ${theme.borderLight} ${theme.surfaceBg} space-y-5 shadow-sm relative overflow-hidden`}>
                                <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                            <Wifi size={20} />
                                        </div>
                                        <div>
                                            <h5 className={`text-base font-black ${theme.textHeading}`}>Kitchen KOT Printer</h5>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kitchen Order Tickets</span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${hardwareSettings.kitchenPrinter?.enabled !== false
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                        : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                                        }`}>
                                        {hardwareSettings.kitchenPrinter?.enabled !== false ? 'Enabled' : 'Disabled (Uses Cashier USB)'}
                                    </span>
                                </div>

                                <Toggle
                                    label="Enable Separate Kitchen KOT Printer"
                                    checked={hardwareSettings.kitchenPrinter?.enabled !== false}
                                    onChange={(val) => setHardwareSettings((p) => ({
                                        ...p,
                                        kitchenPrinter: { ...p.kitchenPrinter, enabled: val },
                                    }))}
                                    theme={theme}
                                />

                                {hardwareSettings.kitchenPrinter?.enabled !== false ? (
                                    <>
                                        {/* Connection Method Selection */}
                                        <div>
                                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>
                                                Connection Method
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {CONNECTION_TYPES.map(({ key, label, icon: Icon }) => {
                                                    const isSelected = (hardwareSettings.kitchenPrinter?.connectionType || 'lan') === key;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => {
                                                                setHardwareSettings((p) => ({
                                                                    ...p,
                                                                    kitchenPrinter: { ...p.kitchenPrinter, connectionType: key }
                                                                }));
                                                                if (key === 'lan') {
                                                                    setLanModalTargetPrinter({
                                                                        name: hardwareSettings.kitchenPrinter?.name || 'Kitchen KOT Printer',
                                                                        ip: hardwareSettings.kitchenPrinter?.ip || '192.168.1.100',
                                                                        port: hardwareSettings.kitchenPrinter?.port || 9100,
                                                                        paperWidthMm: hardwareSettings.kitchenPrinter?.paperWidthMm || 80
                                                                    });
                                                                    setIsLanModalOpen(true);
                                                                }
                                                            }}
                                                            className={`p-3 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${isSelected
                                                                ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/20'
                                                                : `${theme.borderLight} ${theme.textSecondary} hover:bg-gray-50 dark:hover:bg-slate-800/60`
                                                                }`}
                                                        >
                                                            <Icon size={18} />
                                                            <span>{label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {(hardwareSettings.kitchenPrinter?.connectionType || 'lan') === 'lan' && (
                                                <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                                                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                                                        <Server size={15} className="shrink-0" />
                                                        <span>LAN Bridge: {bridgeStatus.online ? 'Active (Online)' : 'Not Running'}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setLanModalTargetPrinter({
                                                                name: hardwareSettings.kitchenPrinter?.name || 'Kitchen KOT Printer',
                                                                ip: hardwareSettings.kitchenPrinter?.ip || '192.168.1.100',
                                                                port: hardwareSettings.kitchenPrinter?.port || 9100,
                                                                paperWidthMm: hardwareSettings.kitchenPrinter?.paperWidthMm || 80
                                                            });
                                                            setIsLanModalOpen(true);
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                                    >
                                                        <Download size={12} /> Setup / Download Bridge
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Device Model Preset Selector */}
                                        <div>
                                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>
                                                Kitchen Printer Model
                                            </label>
                                            <CommonSelect
                                                options={PRINTER_MODEL_OPTIONS}
                                                value={hardwareSettings.kitchenPrinter?.deviceModel || 'Generic ESC/POS'}
                                                onChange={(val) => setHardwareSettings((p) => ({
                                                    ...p,
                                                    kitchenPrinter: {
                                                        ...p.kitchenPrinter,
                                                        deviceModel: val,
                                                        name: p.kitchenPrinter?.name || `${val} KOT`,
                                                    },
                                                }))}
                                                labelKey="label"
                                                valueKey="value"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Printer Display Name</label>
                                                <input
                                                    type="text"
                                                    value={hardwareSettings.kitchenPrinter?.name || ''}
                                                    onChange={(e) => setHardwareSettings((p) => ({
                                                        ...p,
                                                        kitchenPrinter: { ...p.kitchenPrinter, name: e.target.value },
                                                    }))}
                                                    placeholder="e.g. Kitchen Section 1"
                                                    className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-xs font-bold`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Paper Width</label>
                                                <CommonSelect
                                                    options={[
                                                        { label: '80mm (Standard POS)', value: 80 },
                                                        { label: '58mm (Compact)', value: 58 },
                                                    ]}
                                                    value={hardwareSettings.kitchenPrinter?.paperWidthMm || 80}
                                                    onChange={(val) => setHardwareSettings((p) => ({
                                                        ...p,
                                                        kitchenPrinter: { ...p.kitchenPrinter, paperWidthMm: Number(val) },
                                                    }))}
                                                    labelKey="label"
                                                    valueKey="value"
                                                />
                                            </div>
                                            {(hardwareSettings.kitchenPrinter?.connectionType === 'lan' || hardwareSettings.kitchenPrinter?.connectionType === 'wifi') && (
                                                <>
                                                    <div>
                                                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Kitchen Printer IP Address</label>
                                                        <input
                                                            type="text"
                                                            value={hardwareSettings.kitchenPrinter?.ip || ''}
                                                            onChange={(e) => setHardwareSettings((p) => ({
                                                                ...p,
                                                                kitchenPrinter: { ...p.kitchenPrinter, ip: e.target.value },
                                                            }))}
                                                            placeholder="192.168.1.101"
                                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-xs font-mono font-bold`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1.5`}>Port (RAW ESC/POS)</label>
                                                        <input
                                                            type="number"
                                                            value={hardwareSettings.kitchenPrinter?.port || 9100}
                                                            onChange={(e) => setHardwareSettings((p) => ({
                                                                ...p,
                                                                kitchenPrinter: { ...p.kitchenPrinter, port: parseInt(e.target.value) || 9100 },
                                                            }))}
                                                            placeholder="9100"
                                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-xs font-mono font-bold`}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Detailed Hardware Features */}
                                        <div className="space-y-2.5 pt-1">
                                            <Toggle
                                                label="Auto-print KOT ticket immediately on Send KOT"
                                                checked={hardwareSettings.kitchenPrinter?.autoPrintOnKOT !== false}
                                                onChange={(val) => setHardwareSettings((p) => ({
                                                    ...p,
                                                    kitchenPrinter: { ...p.kitchenPrinter, autoPrintOnKOT: val },
                                                }))}
                                                theme={theme}
                                            />
                                            <Toggle
                                                label="Auto-cut KOT ticket paper (ESC/POS Cut)"
                                                checked={hardwareSettings.kitchenPrinter?.autoCut !== false}
                                                onChange={(val) => setHardwareSettings((p) => ({
                                                    ...p,
                                                    kitchenPrinter: { ...p.kitchenPrinter, autoCut: val },
                                                }))}
                                                theme={theme}
                                            />
                                            <Toggle
                                                label="Beep kitchen printer buzzer on new KOT order"
                                                checked={hardwareSettings.kitchenPrinter?.beepBuzzer !== false}
                                                onChange={(val) => setHardwareSettings((p) => ({
                                                    ...p,
                                                    kitchenPrinter: { ...p.kitchenPrinter, beepBuzzer: val },
                                                }))}
                                                theme={theme}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">Single Printer Setup (Using Cashier USB)</p>
                                        <p className="text-[11px] leading-relaxed">
                                            All KOT tickets will automatically print on your main cashier printer (<strong>POS-80C</strong>) at the counter whenever a cashier or waiter taps <strong>Send KOT</strong>.
                                        </p>
                                    </div>
                                )}

                                <div className="pt-2 flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {(hardwareSettings.kitchenPrinter?.connectionType || 'lan').toUpperCase()} &bull; {hardwareSettings.kitchenPrinter?.paperWidthMm || 80}mm
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const kp = hardwareSettings.kitchenPrinter || {};
                                            const conn = kp.connectionType || 'lan';
                                            if (conn === 'usb' || !kp.enabled) {
                                                printKot({
                                                    meta: { kotTitle: 'TEST KITCHEN ORDER (KOT)', orderLabel: 'ORD-TEST', tableLabel: 'Table 1', printedAt: new Date().toLocaleTimeString() },
                                                    items: [
                                                        { name: 'Appam', qty: 2, notes: 'Crispy' },
                                                        { name: 'Chicken Fry', qty: 1, variant: 'Spicy' },
                                                    ],
                                                    forceBrowser: true,
                                                });
                                                toast.success('Sent test KOT to USB printer (POS-80C)!', { icon: '🧑‍🍳' });
                                            } else {
                                                const toastId = toast.loading(`Sending test KOT to kitchen printer (${kp.ip || '192.168.1.100'}:${kp.port || 9100})...`);
                                                const bridgeUrl = hardwareSettings.bridgeUrl || 'http://127.0.0.1:3001';
                                                const payload = {
                                                    ip: kp.ip || '192.168.1.100',
                                                    port: kp.port || 9100,
                                                    printerName: kp.name || 'Kitchen KOT Printer',
                                                    paperWidthMm: kp.paperWidthMm || 80,
                                                    type: 'kot',
                                                    title: 'TEST KITCHEN ORDER (KOT)',
                                                    meta: {
                                                        kotTitle: 'TEST KITCHEN ORDER (KOT)',
                                                        orderLabel: 'ORD-TEST',
                                                        tableLabel: 'Table 1',
                                                        printedAt: new Date().toLocaleTimeString(),
                                                    },
                                                    items: [
                                                        { itemName: 'Appam', quantity: 2, notes: 'Extra Crispy' },
                                                        { itemName: 'Chicken Fry', quantity: 1, variant: 'Spicy' },
                                                        { itemName: 'Kadala Curry', quantity: 1 },
                                                    ],
                                                    autoCut: kp.autoCut !== false,
                                                    beepBuzzer: kp.beepBuzzer !== false,
                                                };

                                                api.post('/print/test', payload)
                                                    .then(res => {
                                                        const msg = res.data?.message || `Test KOT sent to ${payload.ip}:${payload.port}!`;
                                                        if (res.data?.status === 'COMPLETED' || res.data?.printed) {
                                                            toast.success(msg, { id: toastId, icon: '🧑‍🍳', duration: 5000 });
                                                        } else if (res.data?.status === 'PENDING' || res.data?.status === 'PROCESSING') {
                                                            toast(msg, { id: toastId, icon: '⏳', duration: 6000 });
                                                        } else {
                                                            toast.success(msg, { id: toastId, icon: '🧑‍🍳', duration: 5000 });
                                                        }
                                                    })
                                                    .catch(err => {
                                                        const msg = err?.response?.data?.message || err?.message || 'Failed to connect to printer';
                                                        toast.error(`Print failed: ${msg}`, { id: toastId, duration: 6000 });
                                                    });
                                            }
                                        }}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border ${theme.borderLight} ${theme.textPrimary} hover:border-amber-500 hover:text-amber-600 transition-all flex items-center gap-2`}
                                    >
                                        <Printer size={14} />
                                        Test Kitchen KOT Printer
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Zero-Dialog Silent Printing Guide Banner */}
                    <div className={`p-6 rounded-3xl border ${theme.borderLight} bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-blue-50/50 dark:from-indigo-950/20 dark:via-purple-950/15 dark:to-blue-950/20 space-y-3.5 shadow-sm`}>
                        <div className="flex items-center gap-2.5 font-black text-sm text-indigo-700 dark:text-indigo-400">
                            <Zap size={18} className="fill-current" />
                            <span>How to Never See the Print Preview Dialog Screen Again (Zero-Dialog Silent Printing)</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
                            By default, web browsers (Chrome/Edge) pop up a print dialog asking for confirmation before sending a job to a USB printer. Follow these 3 steps to completely suppress the window so all orders and KOTs print <strong>instantaneously with 0 clicks</strong>:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                            <div className={`p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border ${theme.borderLight} space-y-1.5 shadow-sm`}>
                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">Step 1</span>
                                <h6 className="text-xs font-black text-slate-800 dark:text-slate-200">Set POS-80C as Default</h6>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    In Windows Settings &gt; <em>Printers &amp; scanners</em>, click <strong>POS-80C</strong> and select <strong>Set as default</strong>.
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border ${theme.borderLight} space-y-1.5 shadow-sm`}>
                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">Step 2</span>
                                <h6 className="text-xs font-black text-slate-800 dark:text-slate-200">Add Kiosk Shortcut Flag</h6>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Right-click your Chrome/Edge desktop icon &gt; <strong>Properties</strong>. In <em>Target</em>, add a space and <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-indigo-600 font-bold">--kiosk-printing</code> at the end.
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border ${theme.borderLight} space-y-1.5 shadow-sm`}>
                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">Step 3</span>
                                <h6 className="text-xs font-black text-slate-800 dark:text-slate-200">Instant Silent Printing</h6>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Launch Chrome from that shortcut. Click Checkout or Send KOT &mdash; it prints <strong>instantly to POS-80C with zero popup dialogs</strong>!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Counter PC Print Station info & Status (Zero Local URLs) */}
                    <div className={`p-5 rounded-3xl border ${bridgeStatus.online ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' : theme.borderLight} ${theme.surfaceBg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-medium`}>
                        <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-2xl ${bridgeStatus.online ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} flex items-center justify-center shrink-0 shadow-sm`}>
                                <Server size={18} />
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className={`font-black ${theme.textHeading} text-sm`}>PC Print Bridge Service</span>
                                    {bridgeStatus.online ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Bridge Service Running
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            Setup Required
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs ${theme.textMuted} max-w-2xl leading-relaxed`}>
                                    {bridgeStatus.online
                                        ? 'The local relay service is running on this counter PC. Waiter mobile phones & checkout can print to all LAN printers. Use "Send Test Print" below to test physical printer hardware.'
                                        : 'To enable waiter phones to print automatically to your LAN thermal printers, install FilePe Print Station on this counter PC.'}
                                </p>
                            </div>
                        </div>

                        {/* Shop ID info for Multi-Shop Setup & Recheck button */}
                        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => checkBridgeStatus(true)}
                                className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                title="Check FilePe Print Station connection"
                            >
                                <RefreshCw size={13} />
                                <span>Check Status</span>
                            </button>

                            <div className="bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-0.5">
                                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Restaurant Shop ID</span>
                                <code className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{activeResolvedShopId || 'Auto-Detected'}</code>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LAN Network Printer Bridge Setup Modal */}
            <LanPrinterSetupModal
                isOpen={isLanModalOpen}
                onClose={() => setIsLanModalOpen(false)}
                theme={theme}
                bridgeStatus={bridgeStatus}
                shopId={activeResolvedShopId}
                branchId={activeResolvedBranchId}
                cloudUrl={getResolvedCloudApiUrl()}
                targetPrinter={lanModalTargetPrinter || (hardwareSettings.kitchenPrinter?.enabled ? hardwareSettings.kitchenPrinter : hardwareSettings.cashierPrinter)}
                onSendTestPrint={handleLanModalTestPrint}
                isTestingPrint={isTestingLanPrint}
                onRefreshStatus={checkBridgeStatus}
            />
        </div>
    );
};

export default BarcodeBillSettings;
