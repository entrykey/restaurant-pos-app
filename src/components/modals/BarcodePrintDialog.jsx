import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { api, settingService } from '../../services/api';
import { Printer, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from '../ui/DatePicker';
import {
    BARCODE_PRINT_SETTINGS_KEY,
    areBarcodeSettingsEqual,
    extractSavableBarcodeSettings,
    mergeBarcodePrintSettings,
} from '../../config/barcodePrintSettings';

const BarcodePrintDialog = ({ 
    isOpen, 
    onClose, 
    dialogState, 
    setDialogState, 
    onConfirmPrint 
}) => {
    const { theme } = useTheme();
    const { organization, formatCurrency, activeBranchId, currentShopId } = useApp();
    const [savedBaseline, setSavedBaseline] = useState(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const loadedForRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            loadedForRef.current = null;
            return;
        }

        const loadKey = `${currentShopId || ''}:${activeBranchId || ''}`;
        if (!currentShopId || !activeBranchId || loadedForRef.current === loadKey) return;

        let cancelled = false;

        const loadBranchSettings = async () => {
            setIsLoadingSettings(true);
            try {
                let savedValue = null;
                try {
                    const response = await settingService.getSettingByKey(
                        BARCODE_PRINT_SETTINGS_KEY,
                        currentShopId,
                        activeBranchId
                    );
                    savedValue = response?.value || null;
                } catch (error) {
                    const status = error?.response?.status || error?.status;
                    if (status && status !== 404) {
                        console.error('Failed to load barcode print settings:', error);
                    }
                }

                if (cancelled) return;

                let nextBaseline = null;
                setDialogState((prev) => {
                    const merged = mergeBarcodePrintSettings(prev, savedValue);
                    nextBaseline = extractSavableBarcodeSettings(merged);
                    return merged;
                });
                setSavedBaseline(nextBaseline);
                loadedForRef.current = loadKey;
            } finally {
                if (!cancelled) setIsLoadingSettings(false);
            }
        };

        loadBranchSettings();
        return () => {
            cancelled = true;
        };
    }, [isOpen, currentShopId, activeBranchId, setDialogState]);

    const isSettingsDirty = useMemo(() => {
        if (!savedBaseline || isLoadingSettings) return false;
        return !areBarcodeSettingsEqual(dialogState, savedBaseline);
    }, [dialogState, savedBaseline, isLoadingSettings]);

    const handleSaveSettings = async () => {
        if (!currentShopId || !activeBranchId || !isSettingsDirty) return;

        setIsSavingSettings(true);
        try {
            const value = extractSavableBarcodeSettings(dialogState);
            await settingService.updateSetting(BARCODE_PRINT_SETTINGS_KEY, {
                shopId: currentShopId,
                branchId: activeBranchId,
                value,
                type: 'json',
                displayString: 'Barcode Print Settings',
                description: 'Branch-specific barcode label print preferences',
            });
            setSavedBaseline(value);
            toast.success('Barcode print settings saved for this branch');
        } catch (error) {
            console.error('Failed to save barcode print settings:', error);
            toast.error('Failed to save barcode print settings');
        } finally {
            setIsSavingSettings(false);
        }
    };

    if (!isOpen) return null;

    const handleConfirmBarcodePrint = () => {
        if (onConfirmPrint) {
            onConfirmPrint();
        } else {
            // Default print implementation if not provided
            const {
                copies,
                item,
                barcode,
                includeName,
                includeCode,
                includePrice,
                includeMRP,
                includeLogo,
                includeShopName,
                includeBatch,
                includeExpiry,
                includeUnit,
                showNameLabel,
                showCodeLabel,
                showPriceLabel,
                showMRPLabel,
                showBatchLabel,
                showExpiryLabel,
                showUnitLabel,
                batchOverride,
                expiryOverride,
                unitValueOverride,
                customText,
                layout,
                labelWidth,
                labelHeight,
                labelGapX,
                labelGapY,
                barcodeHeight,
                baseFontSize,
                printMode,
                labelsPerRow,
                elementsOrder
            } = dialogState;

            const count = parseInt(copies) || 1;
            
            const renderLabelInner = () => {
                const parts = [];
                const actualShopName = organization?.name || organization?.businessName;

                elementsOrder.forEach((key) => {
                    if (key === "shopName" && includeShopName && actualShopName) {
                        parts.push(`<div class="slot line shop-name">${actualShopName}</div>`);
                    }
                    if (key === "logo" && includeLogo && organization?.logoUrl) {
                        const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
                        const logoUrl = organization.logoUrl.startsWith("http") ? organization.logoUrl : `${root}${organization.logoUrl}`;
                        parts.push(`<div class="slot"><img class="logo-img" src="${logoUrl}" alt="Logo" /></div>`);
                    }
                    if (key === "barcode" && barcode?.fullUrl) {
                        parts.push(`<div class="slot"><img class="barcode-img" src="${barcode.fullUrl}" alt="Barcode" /></div>`);
                    }
                    if (key === "name" && includeName && item?.name) {
                        parts.push(`<div class="slot line name">${showNameLabel ? 'Item: ' : ''}${item.name}</div>`);
                    }
                    if (key === "code" && includeCode && item?.itemCode) {
                        parts.push(`<div class="slot line code">${showCodeLabel ? 'Code: ' : ''}${item.itemCode}</div>`);
                    }
                    if (key === "unit" && includeUnit && unitValueOverride) {
                        parts.push(`<div class="slot line unit">${showUnitLabel ? 'Qty: ' : ''}${unitValueOverride}</div>`);
                    }
                    if (key === "price" && includePrice && item?.sellingPrice != null) {
                        const p = formatCurrency ? formatCurrency(item.sellingPrice) : Number(item.sellingPrice).toFixed(2);
                        parts.push(`<div class="slot line price">${showPriceLabel ? 'Price: ' : ''}${p}</div>`);
                    }
                    if (key === "mrp" && includeMRP && item?.mrp != null) {
                        const m = formatCurrency ? formatCurrency(item.mrp) : Number(item.mrp).toFixed(2);
                        parts.push(`<div class="slot line mrp">${showMRPLabel ? 'MRP: ' : ''}${m}</div>`);
                    }
                    if (key === "batch" && includeBatch && batchOverride) {
                        parts.push(`<div class="slot line batch">${showBatchLabel ? 'Batch: ' : ''}${batchOverride}</div>`);
                    }
                    if (key === "expiry" && includeExpiry && expiryOverride) {
                        parts.push(`<div class="slot line expiry">${showExpiryLabel ? 'Exp: ' : ''}${expiryOverride}</div>`);
                    }
                    if (key === "custom" && customText) {
                        parts.push(`<div class="slot line custom">${customText}</div>`);
                    }
                });
                return parts.join("");
            };

            const labelHtml = renderLabelInner();
            const labels = Array(count).fill(`<div class="label">${labelHtml}</div>`);
            const layoutClass = layout === "COLUMNS" ? "columns" : "rows";

            const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>Barcode Labels</title>
                <style>
                  @page { 
                    ${printMode === 'ROLL' ? `size: ${(labelWidth * (labelsPerRow || 1)) + (labelGapX * ((labelsPerRow || 1) - 1))}mm ${labelHeight}mm;` : 'size: auto;'}
                    margin: ${printMode === 'ROLL' ? '0' : '10mm'}; 
                  }
                  body {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: ${baseFontSize}px;
                    margin: 0;
                    padding: 0;
                  }
                  .labels {
                    display: flex;
                    flex-wrap: wrap;
                    margin: 0;
                    padding: 0;
                    gap: ${labelGapY}mm ${labelGapX}mm;
                    width: 100%;
                  }
                  .label {
                    width: ${labelWidth}mm;
                    height: ${labelHeight}mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 1mm;
                    overflow: hidden;
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                  .label img.barcode-img {
                    display: block;
                    width: auto;
                    max-width: 95%;
                    max-height: ${barcodeHeight}%;
                    margin: 0 auto;
                    padding-bottom: 0.5mm;
                  }
                  .label img.logo-img {
                    display: block;
                    width: auto;
                    max-width: 80%;
                    max-height: 12mm;
                    margin: 0 auto;
                    padding-bottom: 0.5mm;
                    object-fit: contain;
                  }
                  .slot { margin: 0; padding: 0.2mm 0; line-height: 1.1; width: 100%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
                  .line { margin: 0; padding: 0; line-height: 1.1; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
                  .line.shop-name { font-weight: 800; font-size: ${baseFontSize * 1.05}px; text-transform: uppercase; margin-bottom: 0.5mm; }
                  .line.name { font-weight: 600; margin-top: 0.2mm; }
                  .line.code { font-size: ${baseFontSize * 0.9}px; }
                  .line.unit { font-weight: 600; font-size: ${baseFontSize * 0.85}px; }
                  .line.price { font-weight: 700; font-size: ${baseFontSize * 0.9}px; }
                  .line.mrp { font-weight: 700; font-size: ${baseFontSize * 0.9}px; }
                </style>
              </head>
              <body>
                <div class="labels ${layoutClass}">${labels.join("")}</div>
                <script>
                  window.onload = function() {
                    window.focus();
                    window.print();
                    setTimeout(() => window.close(), 500);
                  };
                </script>
              </body>
            </html>`;

            const win = window.open("", "_blank");
            if (!win) {
                toast.error("Popup blocked. Please allow popups to print labels.");
                return;
            }
            win.document.open();
            win.document.write(html);
            win.document.close();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Print Barcodes"
            className="max-w-4xl"
        >
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Panel: Settings */}
                <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1 col-span-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Selected Item</label>
                            <div className={`text-sm font-black ${theme.textPrimary} p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border ${theme.borderLight} min-h-[44px] flex items-center`}>
                                {dialogState.item?.name || "—"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Number of Copies</label>
                            <input
                                type="number"
                                min={1}
                                value={dialogState.copies}
                                onChange={e => setDialogState(prev => ({ ...prev, copies: e.target.value }))}
                                className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-sm`}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Label Size (W×H mm)</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min={1}
                                        value={dialogState.labelWidth}
                                        onChange={e => setDialogState(prev => ({ ...prev, labelWidth: parseFloat(e.target.value || 0) }))}
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
                                    />
                                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>W</span>
                                </div>
                                <span className={theme.textMuted}>×</span>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min={1}
                                        value={dialogState.labelHeight}
                                        onChange={e => setDialogState(prev => ({ ...prev, labelHeight: parseFloat(e.target.value || 0) }))}
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
                                    />
                                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>H</span>
                                </div>
                            </div>
                        </div>
                        
                        {dialogState.printMode === 'ROLL' && (
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Labels per Row</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={dialogState.labelsPerRow}
                                    onChange={e => setDialogState(prev => ({ ...prev, labelsPerRow: parseInt(e.target.value || 1) }))}
                                    className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-sm`}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Barcode Size (%)</label>
                                <input
                                    type="number"
                                    min={10}
                                    max={100}
                                    value={dialogState.barcodeHeight}
                                    onChange={e => setDialogState(prev => ({ ...prev, barcodeHeight: parseInt(e.target.value || 0) }))}
                                    className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Font Size (px)</label>
                                <input
                                    type="number"
                                    min={6}
                                    max={30}
                                    value={dialogState.baseFontSize}
                                    onChange={e => setDialogState(prev => ({ ...prev, baseFontSize: parseInt(e.target.value || 0) }))}
                                    className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                />
                            </div>
                        </div>
                    </div>

                    {Number(dialogState.copies) > 1 && (
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50">
                            <div className="space-y-1 col-span-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Printer / Paper Type</label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setDialogState(prev => ({ ...prev, printMode: 'ROLL' }))}
                                        className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all ${dialogState.printMode === 'ROLL' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : theme.textMuted}`}
                                    >
                                        THERMAL ROLL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDialogState(prev => ({ ...prev, printMode: 'SHEET' }))}
                                        className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all ${dialogState.printMode === 'SHEET' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : theme.textMuted}`}
                                    >
                                        A4 / STICKER SHEETS
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2 mt-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Layout Direction</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDialogState(prev => ({ ...prev, layout: "ROWS" }))}
                                        className={`flex-1 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${dialogState.layout === "ROWS"
                                            ? (theme.mode === 'dark' ? "border-indigo-400 text-indigo-300 bg-indigo-400/10" : "border-indigo-500 text-indigo-600 bg-indigo-50")
                                            : `${theme.borderLight} ${theme.textSecondary} ${theme.surfaceBg}`
                                            }`}
                                    >
                                        Row-wise
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDialogState(prev => ({ ...prev, layout: "COLUMNS" }))}
                                        className={`flex-1 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${dialogState.layout === "COLUMNS"
                                            ? (theme.mode === 'dark' ? "border-indigo-400 text-indigo-300 bg-indigo-400/10" : "border-indigo-500 text-indigo-600 bg-indigo-50")
                                            : `${theme.borderLight} ${theme.textSecondary} ${theme.surfaceBg}`
                                            }`}
                                    >
                                        Column-wise
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Label Gaps (H / V mm)</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min={0}
                                            value={dialogState.labelGapX}
                                            onChange={e => setDialogState(prev => ({ ...prev, labelGapX: parseFloat(e.target.value || 0) }))}
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
                                        />
                                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>X</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min={0}
                                            value={dialogState.labelGapY}
                                            onChange={e => setDialogState(prev => ({ ...prev, labelGapY: parseFloat(e.target.value || 0) }))}
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
                                        />
                                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>Y</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeLogo}
                                onChange={e => setDialogState(prev => ({ ...prev, includeLogo: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Logo</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeName}
                                onChange={e => setDialogState(prev => ({ ...prev, includeName: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Name</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeCode}
                                onChange={e => setDialogState(prev => ({ ...prev, includeCode: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Item Code</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includePrice}
                                onChange={e => setDialogState(prev => ({ ...prev, includePrice: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Price</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeMRP}
                                onChange={e => setDialogState(prev => ({ ...prev, includeMRP: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>MRP</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeBatch}
                                onChange={e => setDialogState(prev => ({ ...prev, includeBatch: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Batch</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeExpiry}
                                onChange={e => setDialogState(prev => ({ ...prev, includeExpiry: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Expiry</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeUnit}
                                onChange={e => setDialogState(prev => ({ ...prev, includeUnit: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Unit/Qty</span>
                        </label>
                        <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                            <input
                                type="checkbox"
                                checked={dialogState.includeShopName}
                                onChange={e => setDialogState(prev => ({ ...prev, includeShopName: e.target.checked }))}
                                className="rounded text-indigo-500"
                            />
                            <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Shop Name</span>
                        </label>
                    </div>

                    {/* Label Toggles Section */}
                    <div className={`space-y-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/10 border ${theme.borderLight}`}>
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Include Label Text</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { key: 'showNameLabel', label: 'Item Name', enabled: dialogState.includeName },
                                { key: 'showCodeLabel', label: 'Item Code', enabled: dialogState.includeCode },
                                { key: 'showPriceLabel', label: 'Price', enabled: dialogState.includePrice },
                                { key: 'showMRPLabel', label: 'MRP', enabled: dialogState.includeMRP },
                                { key: 'showBatchLabel', label: 'Batch', enabled: dialogState.includeBatch },
                                { key: 'showExpiryLabel', label: 'Expiry', enabled: dialogState.includeExpiry },
                                { key: 'showUnitLabel', label: 'Unit/Qty', enabled: dialogState.includeUnit }
                            ].map(item => (
                                <label 
                                    key={item.key} 
                                    className={`flex items-center gap-2 cursor-pointer transition-opacity ${!item.enabled ? 'opacity-40 pointer-events-none' : 'hover:opacity-80'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={dialogState[item.key]}
                                        onChange={e => setDialogState(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                        disabled={!item.enabled}
                                        className="w-3.5 h-3.5 rounded text-indigo-500"
                                    />
                                    <span className={`text-[9px] font-bold uppercase ${theme.textSecondary}`}>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {(dialogState.includeBatch || dialogState.includeExpiry || dialogState.includeUnit) && (
                        <div className="grid grid-cols-2 gap-4">
                            {dialogState.includeBatch && (
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Batch Override</label>
                                    <input
                                        type="text"
                                        value={dialogState.batchOverride ?? ""}
                                        onChange={e => setDialogState(prev => ({ ...prev, batchOverride: e.target.value }))}
                                        placeholder="Enter batch"
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                    />
                                </div>
                            )}
                            {dialogState.includeExpiry && (
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Expiry Override</label>
                                    <DatePicker
                                        value={dialogState.expiryOverride ?? ""}
                                        onChange={val => setDialogState(prev => ({ ...prev, expiryOverride: val }))}
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                    />
                                </div>
                            )}
                            {dialogState.includeUnit && (
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Unit/Qty Override</label>
                                    <input
                                        type="text"
                                        value={dialogState.unitValueOverride ?? ""}
                                        onChange={e => setDialogState(prev => ({ ...prev, unitValueOverride: e.target.value }))}
                                        placeholder="e.g. 500g, 1 Box"
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Custom Text</label>
                        <input
                            type="text"
                            value={dialogState.customText}
                            onChange={e => setDialogState(prev => ({ ...prev, customText: e.target.value }))}
                            placeholder="Additional text to show on label"
                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                        />
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="w-full md:w-[320px] space-y-6 md:sticky md:top-8 h-fit transition-all">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Label Preview</label>
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div
                            className={`${theme.surfaceBg} border-2 border-dashed ${theme.borderLight} rounded-2xl flex items-center justify-center overflow-auto p-4`}
                            style={{ width: "240px", height: "180px" }}
                        >
                            <div
                                className="bg-white text-black shadow-lg"
                                style={{
                                    width: `${dialogState.labelWidth * 3}px`,
                                    minHeight: `${dialogState.labelHeight * 3}px`,
                                    padding: "10px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    fontSize: `${dialogState.baseFontSize}px`,
                                    boxSizing: "border-box"
                                }}
                            >
                                {dialogState.elementsOrder.map((key) => {
                                    const actualShopName = organization?.name || organization?.businessName;
                                    if (key === "shopName" && dialogState.includeShopName && actualShopName) {
                                        return <div key="shopName" style={{ fontWeight: 800, fontSize: `${dialogState.baseFontSize * 1.05}px`, textTransform: 'uppercase', marginBottom: '2px', lineHeight: 1, textAlign: "center", width: "100%" }}>{actualShopName}</div>;
                                    }
                                    if (key === "logo" && dialogState.includeLogo && organization?.logoUrl) {
                                        const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
                                        const logoUrl = organization.logoUrl.startsWith("http") ? organization.logoUrl : `${root}${organization.logoUrl}`;
                                        return <img key="logo" src={logoUrl} alt="Logo" style={{ maxHeight: "40px", maxWidth: "80%", objectFit: "contain", marginBottom: "4px" }} />;
                                    }
                                    if (key === "barcode" && dialogState.barcode?.fullUrl) {
                                        return <img key="barcode" src={dialogState.barcode.fullUrl} alt="Barcode" style={{ maxHeight: `${dialogState.labelHeight * 3 * (dialogState.barcodeHeight / 100)}px`, maxWidth: "95%", height: "auto", marginBottom: "2px" }} />;
                                    }
                                    if (key === "price" && dialogState.includePrice && dialogState.item?.sellingPrice != null) {
                                        return <div key="price" style={{ fontWeight: 800, fontSize: `${dialogState.baseFontSize * 0.9}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{dialogState.showPriceLabel ? 'Price: ' : ''}{formatCurrency ? formatCurrency(dialogState.item.sellingPrice) : Number(dialogState.item.sellingPrice).toFixed(2)}</div>;
                                    }
                                    if (key === "mrp" && dialogState.includeMRP && dialogState.item?.mrp != null) {
                                        return <div key="mrp" style={{ fontWeight: 800, fontSize: `${dialogState.baseFontSize * 0.9}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{dialogState.showMRPLabel ? 'MRP: ' : ''}{formatCurrency ? formatCurrency(dialogState.item.mrp) : Number(dialogState.item.mrp).toFixed(2)}</div>;
                                    }
                                    if (key === "name" && dialogState.includeName && dialogState.item?.name) {
                                        return <div key="name" style={{ fontWeight: 700, lineHeight: 1, textAlign: "center", width: "100%" }}>{dialogState.showNameLabel ? 'Item: ' : ''}{dialogState.item.name}</div>;
                                    }
                                    if (key === "code" && dialogState.includeCode && dialogState.item?.itemCode) {
                                        return <div key="code" style={{ fontSize: `${dialogState.baseFontSize * 0.8}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{dialogState.showCodeLabel ? 'Code: ' : ''}{dialogState.item.itemCode}</div>;
                                    }
                                    if (key === "unit" && dialogState.includeUnit && dialogState.unitValueOverride) {
                                        return <div key="unit" style={{ fontWeight: 600, fontSize: `${dialogState.baseFontSize * 0.85}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{dialogState.showUnitLabel ? 'Qty: ' : ''}{dialogState.unitValueOverride}</div>;
                                    }
                                    if (key === "batch" && dialogState.includeBatch && (dialogState.batchOverride)) {
                                        return <div key="batch" style={{ fontSize: `${dialogState.baseFontSize * 0.8}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{dialogState.showBatchLabel ? 'Batch: ' : ''}{dialogState.batchOverride}</div>;
                                    }
                                    if (key === "expiry" && dialogState.includeExpiry && (dialogState.expiryOverride)) {
                                        return <div key="expiry" style={{ fontSize: `${dialogState.baseFontSize * 0.8}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{dialogState.showExpiryLabel ? 'Exp: ' : ''}{dialogState.expiryOverride}</div>;
                                    }
                                    if (key === "custom" && dialogState.customText) {
                                        return <div key="custom" style={{ fontSize: "8px", lineHeight: 1 }}>{dialogState.customText}</div>;
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                        <p className={`text-[10px] ${theme.textMuted} text-center`}>
                            Drag elements to reorder or click print to send to your label printer.
                        </p>
                    </div>
                </div>
            </div>

            <div className={`mt-10 py-4 border-t ${theme.borderLight} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isSettingsDirty ? 'text-amber-500' : theme.textMuted}`}>
                    {isLoadingSettings
                        ? 'Loading branch print settings...'
                        : isSettingsDirty
                            ? 'You have unsaved print setting changes for this branch'
                            : 'Print settings are saved for this branch'}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className={`px-8 py-3 rounded-xl font-bold ${theme.textSecondary} hover:${theme.inputBg.replace('bg-', '')} transition-colors`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveSettings}
                        disabled={!isSettingsDirty || isSavingSettings || isLoadingSettings}
                        className={`px-8 py-3 rounded-xl font-black border flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSettingsDirty
                                ? 'border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300'
                                : `${theme.borderLight} ${theme.textMuted} ${theme.surfaceBg}`
                        }`}
                    >
                        <Save size={18} />
                        {isSavingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                        onClick={handleConfirmBarcodePrint}
                        className={`${theme.buttonBg} ${theme.buttonText} px-10 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95 transition-all`}
                    >
                        <Printer size={20} />
                        Print Labels
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BarcodePrintDialog;
