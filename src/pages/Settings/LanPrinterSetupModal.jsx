import React, { useState, useEffect } from 'react';
import {
    Network, Server, Download, Copy, Check, Terminal,
    X, AlertTriangle, CheckCircle2, RefreshCw, Printer, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import {
    generateWindowsBatInstaller,
    getBridgeScriptContent,
    triggerBrowserDownload,
    getResolvedCloudApiUrl
} from '../../utils/printBridgeInstaller';

const LanPrinterSetupModal = ({
    isOpen,
    onClose,
    theme,
    bridgeStatus = { online: false, checking: false },
    shopId = '',
    branchId = '',
    cloudUrl: cloudUrlProp = '',
    targetPrinter = {},
    onSendTestPrint = null,
    isTestingPrint = false,
    onRefreshStatus = null,
}) => {
    const [copiedCommand, setCopiedCommand] = useState(false);
    const [copiedShopId, setCopiedShopId] = useState(false);
    const [activeTab, setActiveTab] = useState('installer'); // 'installer' | 'manual'
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRechecking, setIsRechecking] = useState(false);

    // Fast polling while modal is open so the user sees instant green confirmation
    useEffect(() => {
        if (!isOpen) return;

        const checkNow = () => {
            if (typeof onRefreshStatus === 'function') {
                onRefreshStatus(false);
            }
        };

        checkNow();
        const intervalId = setInterval(checkNow, 3000);
        return () => clearInterval(intervalId);
    }, [isOpen, onRefreshStatus]);

    if (!isOpen) return null;

    const configuredIp = (targetPrinter?.ip || '').trim();
    const printerPort = targetPrinter?.port || 9100;
    const printerName = targetPrinter?.name || 'LAN Thermal Printer';
    const defaultCloudUrl = getResolvedCloudApiUrl();
    const cloudUrl = cloudUrlProp || defaultCloudUrl;

    const manualCommand = `node scripts/pos-print-bridge.js --shop ${shopId || 'YOUR_SHOP_ID'}`;
    const npmCommand = `npm run bridge`;

    const handleCopy = (text, type) => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text);
        if (type === 'cmd') {
            setCopiedCommand(true);
            setTimeout(() => setCopiedCommand(false), 2000);
            toast.success("Command copied to clipboard!");
        } else if (type === 'shopId') {
            setCopiedShopId(true);
            setTimeout(() => setCopiedShopId(false), 2000);
            toast.success("Printer Key copied!");
        }
    };

    const handleManualRefresh = async () => {
        setIsRechecking(true);
        try {
            if (typeof onRefreshStatus === 'function') {
                await onRefreshStatus(true);
            }
        } finally {
            setTimeout(() => setIsRechecking(false), 500);
        }
    };

    const handleDownloadInstaller = async () => {
        try {
            setIsDownloading(true);
            const batContent = await generateWindowsBatInstaller({
                shopId,
                branchId,
                cloudUrl,
            });
            triggerBrowserDownload('Install-FilePe-PrintBridge.bat', batContent, 'application/x-bat');
            toast.success("Downloaded Install-FilePe-PrintBridge.bat! Double-click it to start.", {
                duration: 6000,
                icon: '⬇️'
            });
        } catch (error) {
            console.error("Failed to generate installer:", error);
            toast.error("Failed to generate installer: " + error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className={`relative w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-3xl border shadow-2xl ${theme.borderLight} ${theme.surfaceBg} animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={`p-5 sm:p-6 border-b ${theme.borderLight} flex items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent`}>
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
                            <Network size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className={`text-base sm:text-lg font-black ${theme.textHeading}`}>
                                    LAN Thermal Printer Auto-Print Setup
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                                Universal Background Print Relay for FilePe Cloud POS
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">

                    {/* Universal Bridge Scope Notice */}
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
                            <AlertTriangle size={15} className="shrink-0" />
                            <span>Why is a local Print Bridge needed for LAN Cable?</span>
                        </div>
                        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-normal">
                            Your POS runs securely on AWS Cloud. Cloud web browsers cannot directly connect to private router IP addresses on your local shop network.
                            The lightweight <strong>FilePe Print Station</strong> runs once on your counter computer to relay print jobs sent from waiter mobile phones and POS checkout instantly to any thermal printer on your local network (Kitchen KOT, Cashier, Bar, etc.).
                        </p>
                        <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                            <Info size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                            <span><strong>Universal Setup:</strong> You only install FilePe Print Station ONCE on this counter PC. It handles all printer IPs configured in your POS Settings automatically!</span>
                        </div>
                    </div>

                    {/* Live Bridge Status Card with Refresh Button */}
                    <div className={`p-4 rounded-2xl border ${bridgeStatus.online ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${bridgeStatus.online ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                <Server size={18} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-800 dark:text-slate-100">PC Print Bridge (Local Service)</span>
                                    {bridgeStatus.online ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Service Running (Port 3001)
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                            Service Offline / Not Started
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block pt-0.5">
                                    {bridgeStatus.online
                                        ? (bridgeStatus.source === 'local'
                                            ? 'The local bridge service is running on this PC. (Use "Send Test Print" below to test your physical printer hardware)'
                                            : 'The bridge service is connected via Cloud Relay. (Use "Send Test Print" below to test your physical printer hardware)')
                                        : 'Double-click the downloaded .bat installer below. The badge turns green automatically once the background service starts.'}
                                </span>
                            </div>
                        </div>

                        {/* Actions & Shop ID pill */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                disabled={isRechecking}
                                onClick={handleManualRefresh}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                title="Check bridge connection status now"
                            >
                                <RefreshCw size={13} className={isRechecking ? 'animate-spin text-indigo-600' : ''} />
                                <span>{isRechecking ? 'Checking...' : 'Check Status'}</span>
                            </button>

                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Printer Key:</span>
                                <code className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {shopId ? `${shopId.slice(0, 8)}...` : 'Auto'}
                                </code>
                                {shopId && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(shopId, 'shopId')}
                                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Copy full Printer Key"
                                    >
                                        {copiedShopId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Method Switcher Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab('installer')}
                            className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === 'installer'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Download size={14} /> 1-Click Windows Auto-Installer (Recommended)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('manual')}
                            className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === 'manual'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Terminal size={14} /> Manual / Node.js CLI
                        </button>
                    </div>

                    {/* Tab 1: 1-Click Windows Auto-Installer */}
                    {activeTab === 'installer' && (
                        <div className="space-y-4">
                            <div className={`p-5 rounded-2xl border ${theme.borderLight} bg-gradient-to-br from-amber-50/50 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 dark:to-transparent space-y-4`}>
                                <div className="space-y-1">
                                    <h4 className={`text-sm font-black ${theme.textHeading} flex items-center gap-2`}>
                                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                        Download & Run the Auto-Installer
                                    </h4>
                                    <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
                                        Download the standalone Windows application. It runs silently in your Windows system tray, connects FilePe Cloud to your LAN thermal printers, and auto-starts on boot.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                                    <a
                                        href="/FilePe-Print-Bridge-Setup.exe"
                                        download="FilePe-Print-Bridge-Setup.exe"
                                        className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer text-center"
                                    >
                                        <Download size={16} />
                                        <span>Download Windows App (.exe) - Recommended</span>
                                    </a>

                                    <button
                                        type="button"
                                        disabled={isDownloading}
                                        onClick={handleDownloadInstaller}
                                        className="px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                        title="Download lightweight batch installer"
                                    >
                                        <Download size={14} />
                                        <span>Download Script (.bat)</span>
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
                                    <p className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                                        <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        Standalone Desktop Application (No Node.js Required)
                                    </p>
                                    <p className="leading-relaxed">
                                        The standalone Windows application includes the embedded print relay engine. Your staff does not need to install Node.js, Python, or run terminal commands.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-2 text-slate-600 dark:text-slate-300">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">How to install (3 quick steps):</p>
                                    <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                                        <li>Double-click the downloaded <strong>FilePe-Print-Bridge-Setup.exe</strong> on the counter computer.</li>
                                        <li>Paste your <strong>Printer Key</strong> (<code className="font-mono font-bold">{shopId ? `${shopId.slice(0, 8)}...` : 'from above'}</code>) and click <strong>Save Settings</strong>.</li>
                                        <li>Click <strong>Send Test Ticket</strong> to test your printer. The bridge runs in the system tray and the badge turns green <strong>Active (Online)</strong> automatically!</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Manual / CLI */}
                    {activeTab === 'manual' && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-2xl border ${theme.borderLight} bg-slate-50 dark:bg-slate-900/40 space-y-3`}>
                                <div className="space-y-1">
                                    <h4 className={`text-xs font-black uppercase tracking-wider ${theme.textHeading}`}>
                                        Option A: Run from your POS code repository
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        If this counter computer already has the pos app repository open in terminal:
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs">
                                    <code>{npmCommand}</code>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(npmCommand, 'cmd')}
                                        className="text-slate-400 hover:text-white transition-colors shrink-0"
                                    >
                                        {copiedCommand ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl border ${theme.borderLight} bg-slate-50 dark:bg-slate-900/40 space-y-3`}>
                                <div className="space-y-1">
                                    <h4 className={`text-xs font-black uppercase tracking-wider ${theme.textHeading}`}>
                                        Option B: Run Standalone Script with Node
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        Download <code className="font-bold text-slate-700 dark:text-slate-300">pos-print-bridge.js</code> and run directly:
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto">
                                    <code className="truncate">{manualCommand}</code>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(manualCommand, 'cmd')}
                                        className="text-slate-400 hover:text-white transition-colors shrink-0"
                                    >
                                        {copiedCommand ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                                    💡 Tip: For 1-click automatic setup with Windows auto-start on boot, switch back to the <strong>1-Click Windows Auto-Installer (.bat)</strong> tab.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Printer Verification & Test Print */}
                    <div className={`p-4 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    Target LAN Printer Hardware: {printerName}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    Raw Port 9100
                                </span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {configuredIp
                                    ? `Target IP: ${configuredIp} • Port: ${printerPort} (Raw ESC/POS)`
                                    : 'No IP entered yet — configure printer IP in settings above'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                Ensure your physical printer is powered ON and connected to your router via LAN cable or Wi-Fi. Click "Send Test Print" to verify paper output.
                            </p>
                        </div>

                        {typeof onSendTestPrint === 'function' && (
                            <button
                                type="button"
                                disabled={isTestingPrint || !configuredIp}
                                onClick={onSendTestPrint}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                title={!configuredIp ? 'Please enter a Printer IP address in settings above first' : 'Send test print to printer hardware'}
                            >
                                <Printer size={15} />
                                <span>{isTestingPrint ? 'Sending Test...' : 'Send Test Print'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className={`p-4 sm:p-5 border-t ${theme.borderLight} flex items-center justify-between ${theme.inputBg}`}>
                    <span className="text-[11px] text-slate-400 font-medium">
                        Universal Port 9100 Raw Socket Relay &bull; Zero Browser Popups
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer`}
                    >
                        Got It / Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LanPrinterSetupModal;
