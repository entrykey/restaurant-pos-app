import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { 
    X, Upload, Camera, FileText, CheckCircle2, AlertCircle, 
    Sparkles, Fuel, Coffee, Zap, Droplet, Wrench, Car, Wifi, 
    ArrowRight, Loader2, RefreshCw, Plus, Check, Receipt, CreditCard,
    Hash, Building, Tag, Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scanExpenseBill, COMMON_EXPENSE_CATEGORIES, FUEL_CATEGORIES } from '../../utils/expenseOcrHelper';

const CATEGORY_ICONS = {
    'Diesel': Fuel,
    'Petrol': Fuel,
    'Food & Refreshments': Coffee,
    'Electricity': Zap,
    'Water': Droplet,
    'Maintenance & Repairs': Wrench,
    'Travel & Conveyance': Car,
    'Internet & Phone': Wifi,
    'Stationery & Office': FileText,
};

const ExpenseBillScanModal = ({
    isOpen,
    onClose,
    onSaveExpense,
    onOpenSheetWithData,
    existingExpenses = []
}) => {
    const { theme } = useTheme();
    const { organization, formatCurrency } = useApp();
    const currency = organization?.defaultCurrency || 'INR';

    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatusText, setScanStatusText] = useState('');
    const [scannedData, setScannedData] = useState(null);
    const [error, setError] = useState(null);

    // Form state from scan & Top POS details
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [term, setTerm] = useState('daily');
    const [mergeAction, setMergeAction] = useState('add'); // 'add', 'replace', 'new'
    const [isSaving, setIsSaving] = useState(false);

    // Enterprise metadata fields
    const [vendorName, setVendorName] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [billDate, setBillDate] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [paymentMode, setPaymentMode] = useState('CASH');
    const [gstNumber, setGstNumber] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [itemDetails, setItemDetails] = useState([]);
    const [notes, setNotes] = useState('');

    // Fuel & Volume calculation states
    const [litres, setLitres] = useState('');
    const [unitRate, setUnitRate] = useState('');

    // Reactive bidirectional fuel calculators
    const handleLitresChange = (newLitres) => {
        setLitres(newLitres);
        const l = parseFloat(newLitres);
        const r = parseFloat(unitRate);
        if (!isNaN(l) && l > 0 && !isNaN(r) && r > 0) {
            setAmount((l * r).toFixed(2));
        }
    };

    const handleUnitRateChange = (newRate) => {
        setUnitRate(newRate);
        const l = parseFloat(litres);
        const r = parseFloat(newRate);
        if (!isNaN(l) && l > 0 && !isNaN(r) && r > 0) {
            setAmount((l * r).toFixed(2));
        }
    };

    const handleAmountChange = (newAmount) => {
        setAmount(newAmount);
        const a = parseFloat(newAmount);
        const l = parseFloat(litres);
        if (!isNaN(a) && a > 0 && !isNaN(l) && l > 0) {
            setUnitRate((a / l).toFixed(2));
        }
    };

    if (!isOpen) return null;

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(selectedFile.type)) {
            toast.error('Please upload an image (JPG, PNG, WebP) or PDF bill');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setScannedData(null);

        if (selectedFile.type.startsWith('image/')) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }

        // Auto trigger scan
        startScan(selectedFile);
    };

    const startScan = async (fileToScan) => {
        setIsScanning(true);
        setScanProgress(10);
        setScanStatusText('Initializing Filepe AI Scanner...');
        setError(null);

        try {
            const result = await scanExpenseBill(fileToScan, (pct, status) => {
                setScanProgress(pct);
                if (status) setScanStatusText(status);
            });

            setScannedData(result);
            setCategory(result.category || 'Petrol');
            setAmount(result.amount ? String(result.amount) : '');
            setLitres(result.litres ? String(result.litres) : '');
            setUnitRate(result.unitRate ? String(result.unitRate) : '');
            setTerm(result.term || 'daily');
            setVendorName(result.vendorName || result.supplierName || '');
            setBillNumber(result.invoiceNumber || '');
            setVehicleNumber(result.vehicleNumber || '');
            setPaymentMode(result.paymentMode || 'CASH');
            setBillDate(result.date || new Date().toISOString().split('T')[0]);
            setGstNumber(result.gstNumber || '');
            setPhoneNumber(result.phoneNumber || '');
            setItemDetails(result.itemDetails || []);
            setNotes(result.vehicleNumber ? `Fuel refill for vehicle ${result.vehicleNumber}` : '');
            setScanProgress(100);
            
            const litreSummary = result.litres ? ` (${result.litres} L @ ₹${result.unitRate}/L)` : '';
            toast.success(`Bill scanned! ${result.category}: ₹${result.amount}${litreSummary}`);
        } catch (err) {
            console.error('Scan error:', err);
            setError(err.message || 'Failed to scan bill. Please enter details manually.');
            toast.error('Could not auto-read text from bill. Please enter manually.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Find if category already exists in active expenses
    const existingMatch = existingExpenses.find(
        e => e.category && e.category.toLowerCase() === category.trim().toLowerCase() && !e.isDraft
    );

    const numAmount = Number(amount) || 0;
    const finalAmountToSave = existingMatch && mergeAction === 'add'
        ? (Number(existingMatch.amount) || 0) + numAmount
        : numAmount;

    const handleSave = async () => {
        if (!category.trim()) {
            toast.error('Please select or enter a category');
            return;
        }
        if (numAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setIsSaving(true);
        try {
            let finalCategory = category.trim();
            let expenseId = null;

            if (existingMatch) {
                if (mergeAction === 'add' || mergeAction === 'replace') {
                    expenseId = existingMatch._id;
                } else if (mergeAction === 'new') {
                    const stamp = billNumber ? ` #${billNumber}` : (vehicleNumber ? ` (${vehicleNumber})` : ` (${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`);
                    finalCategory = `${finalCategory}${stamp}`;
                }
            }

            const currentItemDetails = (itemDetails && itemDetails.length > 0)
                ? itemDetails
                : (litres ? [{
                    name: finalCategory || 'Diesel / Petrol',
                    quantity: parseFloat(litres) || 0,
                    unit: 'Litre',
                    rate: parseFloat(unitRate) || (numAmount && litres ? parseFloat((numAmount / parseFloat(litres)).toFixed(2)) : 0),
                    amount: numAmount
                }] : []);

            await onSaveExpense({
                _id: expenseId,
                category: finalCategory,
                amount: finalAmountToSave,
                term: term,
                isDraft: false,
                billNumber: billNumber.trim(),
                billDate: billDate || new Date().toISOString(),
                vendorName: vendorName.trim(),
                gstNumber: gstNumber.trim(),
                phoneNumber: phoneNumber.trim(),
                vehicleNumber: vehicleNumber.trim(),
                paymentMode: paymentMode,
                itemDetails: currentItemDetails,
                notes: notes.trim(),
                billAttachment: previewUrl || '',
                scannedMeta: scannedData,
                forceNew: mergeAction === 'new'
            });

            toast.success(`₹${finalAmountToSave} added to Today's ${finalCategory} Expense!`);
            handleClose();
        } catch (err) {
            console.error('Save failed:', err);
            toast.error(err?.message || 'Failed to save expense');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenInSheet = () => {
        if (onOpenSheetWithData) {
            const currentItemDetails = (itemDetails && itemDetails.length > 0)
                ? itemDetails
                : (litres ? [{
                    name: category || 'Diesel / Petrol',
                    quantity: parseFloat(litres) || 0,
                    unit: 'Litre',
                    rate: parseFloat(unitRate) || (numAmount && litres ? parseFloat((numAmount / parseFloat(litres)).toFixed(2)) : 0),
                    amount: numAmount
                }] : []);

            onOpenSheetWithData({
                category: category.trim(),
                amount: numAmount,
                term: term,
                isDraft: false,
                billNumber: billNumber.trim(),
                billDate: billDate || new Date().toISOString(),
                vendorName: vendorName.trim(),
                gstNumber: gstNumber.trim(),
                phoneNumber: phoneNumber.trim(),
                vehicleNumber: vehicleNumber.trim(),
                paymentMode: paymentMode,
                itemDetails: currentItemDetails,
                notes: notes.trim(),
                billAttachment: previewUrl || '',
                scannedMeta: scannedData
            });
            handleClose();
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewUrl(null);
        setScannedData(null);
        setIsScanning(false);
        setError(null);
        setCategory('');
        setAmount('');
        setLitres('');
        setUnitRate('');
        setVendorName('');
        setBillNumber('');
        setBillDate('');
        setVehicleNumber('');
        setPaymentMode('CASH');
        setGstNumber('');
        setPhoneNumber('');
        setItemDetails([]);
        setNotes('');
        onClose();
    };

    const ActiveIcon = CATEGORY_ICONS[category] || FileText;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`relative w-full max-w-3xl rounded-3xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden ${theme.surfaceBg} ${theme.borderLight}`}>
                
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className={`text-xl font-black ${theme.textHeading}`}>
                                    Scan Expense Bill (Filepe AI)
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                    Today's Expense
                                </span>
                            </div>
                            <p className={`text-xs font-semibold ${theme.textMuted}`}>
                                Upload petrol slips, food receipts, or utility bills to auto-record today's costs with Filepe AI
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${theme.textMuted}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Upload / Preview Card */}
                    {!file ? (
                        <div 
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-indigo-500 group ${theme.borderLight} hover:bg-indigo-500/5`}
                        >
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*,application/pdf"
                                capture="environment"
                                className="hidden" 
                                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                            />
                            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Camera size={32} />
                            </div>
                            <h3 className={`text-base font-bold ${theme.textHeading} mb-1`}>
                                Snap Photo or Drop Expense Bill Here
                            </h3>
                            <p className={`text-xs ${theme.textMuted} max-w-sm mb-4`}>
                                Petrol pump slips, restaurant bills, electricity or maintenance receipts (PNG, JPG, PDF)
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md flex items-center gap-1.5">
                                    <Upload size={14} /> Browse Files
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className={`p-4 rounded-3xl border flex flex-col md:flex-row gap-5 items-center ${theme.borderLight} bg-gray-50/50 dark:bg-white/[0.02]`}>
                            {/* Bill Preview */}
                            <div className="relative w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 flex-shrink-0 bg-black/10 flex items-center justify-center">
                                {previewUrl ? (
                                    <img 
                                        src={previewUrl} 
                                        alt="Expense Bill" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-center p-3 text-gray-500">
                                        <FileText size={40} className="mb-2 text-indigo-500" />
                                        <span className="text-[11px] font-bold truncate max-w-[150px]">{file.name}</span>
                                        <span className="text-[10px] text-gray-400">PDF Document</span>
                                    </div>
                                )}

                                {/* Scanning Radar / Bar Animation */}
                                {isScanning && (
                                    <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-[1px] flex flex-col items-center justify-center">
                                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse shadow-[0_0_15px_#6366f1]" style={{ top: `${scanProgress}%` }} />
                                        <Loader2 size={32} className="animate-spin text-white mb-2" />
                                        <span className="text-[11px] font-black text-white px-2 py-0.5 bg-black/60 rounded-md">
                                            {scanProgress}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* File Info & Re-Scan button */}
                            <div className="flex-1 w-full flex flex-col justify-between h-full py-1">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
                                            Uploaded Document
                                        </span>
                                        {scannedData?.source && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 flex items-center gap-1">
                                                <Sparkles size={11} /> Powered by Filepe AI
                                            </span>
                                        )}
                                    </div>
                                    <h4 className={`text-sm font-black truncate max-w-xs ${theme.textHeading}`}>
                                        {file.name}
                                    </h4>
                                    <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                                        {(file.size / 1024).toFixed(1)} KB &bull; {file.type || 'Receipt'}
                                    </p>

                                    {isScanning ? (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                                <span>{scanStatusText}</span>
                                                <span>{scanProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${scanProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : scannedData ? (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={16} /> Text and cost parameters extracted
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isScanning}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${theme.borderLight} hover:bg-gray-100 dark:hover:bg-white/5 ${theme.textMuted}`}
                                    >
                                        Change File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => startScan(file)}
                                        disabled={isScanning}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-1"
                                    >
                                        <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} /> Re-Scan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Extracted Details & Form */}
                    {file && (
                        <div className="space-y-5">
                            {/* 1. Category Selection Card (Category Entry + Fuel Category Selection) */}
                            <div className={`p-4 rounded-2xl border ${theme.borderLight}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`text-xs font-black uppercase tracking-wider ${theme.textMuted} flex items-center gap-1.5`}>
                                        <ActiveIcon size={14} className="text-indigo-500" /> Expense Category
                                    </label>
                                    {scannedData?.matchedKeywords?.length > 0 && (
                                        <span className={`text-[10px] font-bold ${theme.textMuted}`}>
                                            Detected: {scannedData.matchedKeywords.slice(0, 3).join(', ')}
                                        </span>
                                    )}
                                </div>

                                {/* Category Entry Input */}
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g. Diesel, Petrol, Tea & Snacks, Electricity"
                                    className={`w-full px-4 py-3 rounded-xl font-bold text-sm border mb-3 transition-all ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} focus:ring-2 focus:ring-indigo-500 outline-none`}
                                />

                                {/* Fuel Category Selection directly BELOW Category Entry */}
                                <div className="mb-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                                    <span className="text-[10px] font-black uppercase tracking-wider block mb-2 text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                        <Fuel size={13} /> Fuel Category Selection:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {FUEL_CATEGORIES.map(fuelCat => {
                                            const isSelected = category.toLowerCase() === fuelCat.toLowerCase() ||
                                                (fuelCat === 'Diesel' && category.toLowerCase().includes('diesel')) ||
                                                (fuelCat === 'Petrol' && category.toLowerCase().includes('petrol') && !category.toLowerCase().includes('power') && !category.toLowerCase().includes('speed'));
                                            return (
                                                <button
                                                    key={fuelCat}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategory(fuelCat);
                                                        if (itemDetails && itemDetails.length > 0) {
                                                            setItemDetails(itemDetails.map(it => ({ ...it, name: `${fuelCat} Fuel` })));
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400 font-black'
                                                            : `${theme.borderLight} border ${theme.surfaceBg} ${theme.textHeading} hover:border-amber-400 hover:text-amber-600`
                                                    }`}
                                                >
                                                    <Fuel size={12} className={isSelected ? 'text-white' : 'text-amber-500'} />
                                                    <span>{fuelCat}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Other Common Categories */}
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${theme.textMuted}`}>
                                        Other Common Categories:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {COMMON_EXPENSE_CATEGORIES.filter(c => c !== 'Petrol' && c !== 'Diesel').map(cat => {
                                            const isSelected = category.toLowerCase() === cat.toLowerCase();
                                            const ChipIcon = CATEGORY_ICONS[cat] || FileText;
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setCategory(cat)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-indigo-600 text-white shadow-sm'
                                                            : `${theme.borderLight} border ${theme.surfaceBg} ${theme.textMuted} hover:text-indigo-600`
                                                    }`}
                                                >
                                                    <ChipIcon size={12} />
                                                    <span>{cat}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Fuel Volume & Amount Calculator (Below Category Entry) */}
                            <div className={`p-5 rounded-2xl border ${theme.borderLight} bg-gradient-to-br from-amber-50/60 via-indigo-50/30 to-transparent dark:from-amber-950/20 dark:via-indigo-950/10 dark:to-transparent space-y-3.5 shadow-sm`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                        <Fuel size={16} /> Fuel Volume & Amount Calculator
                                    </span>
                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        Litres &times; Rate = Amount
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Litres (Qty) */}
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase tracking-wider mb-1.5 ${theme.textMuted}`}>
                                            Volume / Litres (L)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="any"
                                                value={litres}
                                                onChange={(e) => handleLitresChange(e.target.value)}
                                                placeholder="e.g. 45.00"
                                                className={`w-full pr-8 pl-3.5 py-2.5 rounded-xl font-black text-lg border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:ring-2 focus:ring-amber-500`}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-600 dark:text-amber-400">
                                                L
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-semibold mt-1 block ${theme.textMuted}`}>
                                            Quantity from slip
                                        </span>
                                    </div>

                                    {/* Unit Rate */}
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase tracking-wider mb-1.5 ${theme.textMuted}`}>
                                            Rate / Litre (₹)
                                        </label>
                                        <div className="relative">
                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black ${theme.textMuted}`}>
                                                ₹
                                            </span>
                                            <input
                                                type="number"
                                                step="any"
                                                value={unitRate}
                                                onChange={(e) => handleUnitRateChange(e.target.value)}
                                                placeholder="e.g. 104.41"
                                                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl font-black text-lg border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:ring-2 focus:ring-indigo-500`}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-semibold mt-1 block ${theme.textMuted}`}>
                                            Fuel price per litre
                                        </span>
                                    </div>

                                    {/* Total Amount */}
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase tracking-wider mb-1.5 ${theme.textMuted}`}>
                                            Total Amount ({currency})
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                ₹
                                            </span>
                                            <input
                                                type="number"
                                                step="any"
                                                value={amount}
                                                onChange={(e) => handleAmountChange(e.target.value)}
                                                placeholder="0.00"
                                                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl font-black text-xl border-2 border-emerald-500/40 ${theme.surfaceBg} text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500`}
                                            />
                                        </div>
                                        <span className="text-[10px] font-semibold mt-1 block text-emerald-600 dark:text-emerald-400">
                                            Direct daily expense cost
                                        </span>
                                    </div>
                                </div>

                                {/* Live Interactive Calculation Banner */}
                                {Number(litres) > 0 && Number(unitRate) > 0 && (
                                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/30 border border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-black">
                                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                            <span className="text-amber-600 dark:text-amber-400 font-black">{litres} Litres</span>
                                            <span className="text-gray-400">&times;</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-black">₹{unitRate}/L</span>
                                            <span className="text-gray-400">=</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">₹{amount}</span>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            Calculated
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 3. Billing Term */}
                            <div className={`p-4 rounded-2xl border ${theme.borderLight} bg-gray-50/50 dark:bg-white/[0.02]`}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`block text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>
                                        Billing Cycle
                                    </label>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                        Default: Daily
                                    </span>
                                </div>
                                <select
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl font-bold text-sm border transition-all ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} focus:ring-2 focus:ring-indigo-500 outline-none`}
                                >
                                    <option value="daily">Daily (Adds 100% to Today's Expenses)</option>
                                    <option value="monthly">Monthly (Divided across 30 days)</option>
                                    <option value="one time">One Time Expense</option>
                                </select>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 block">
                                    ⚡ Full ₹{numAmount || 0} is calculated in Today's Daily Cost
                                </span>
                            </div>

                            {/* Enterprise Top POS Full Bill & Voucher Intelligence Card */}
                            <div className={`p-5 rounded-2xl border ${theme.borderLight} bg-gradient-to-br from-indigo-50/50 via-white to-transparent dark:from-indigo-950/20 dark:via-transparent dark:to-transparent space-y-4 shadow-sm`}>
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                            <Receipt size={15} />
                                        </div>
                                        <div>
                                            <h4 className={`text-xs font-black uppercase tracking-wider ${theme.textHeading}`}>
                                                Full Bill & Voucher Intelligence
                                            </h4>
                                            <p className={`text-[10px] ${theme.textMuted}`}>
                                                Auto-extracted parameters with vehicle, vendor & item breakdowns
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                        Auto-Captured
                                    </span>
                                </div>

                                {/* Grid of Fields: Vendor, Bill No, Vehicle No, Date */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {/* Vendor / Station */}
                                    <div>
                                        <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                            <Building size={12} className="text-indigo-500" /> Vendor / Station
                                        </label>
                                        <input 
                                            type="text"
                                            value={vendorName}
                                            onChange={(e) => setVendorName(e.target.value)}
                                            placeholder="e.g. M/s. Arjun Fuels"
                                            className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:ring-1 focus:ring-indigo-500`}
                                        />
                                    </div>

                                    {/* Bill / Token No */}
                                    <div>
                                        <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                            <Hash size={12} className="text-indigo-500" /> Bill / Token / Serial No
                                        </label>
                                        <input 
                                            type="text"
                                            value={billNumber}
                                            onChange={(e) => setBillNumber(e.target.value)}
                                            placeholder="e.g. 20332 / 36595"
                                            className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:ring-1 focus:ring-indigo-500`}
                                        />
                                    </div>

                                    {/* Vehicle Number (Crucial for fuel slips & fleet logistics) */}
                                    <div>
                                        <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1 text-indigo-600 dark:text-indigo-400`}>
                                            <Car size={12} /> Vehicle Number
                                        </label>
                                        <input 
                                            type="text"
                                            value={vehicleNumber}
                                            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                            placeholder="e.g. KL-19 Q 3301"
                                            className={`w-full px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl border-2 border-indigo-500/40 ${theme.surfaceBg} text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500`}
                                        />
                                    </div>

                                    {/* Bill Date */}
                                    <div>
                                        <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                            <Calendar size={12} className="text-indigo-500" /> Bill Date
                                        </label>
                                        <input 
                                            type="date"
                                            value={billDate}
                                            onChange={(e) => setBillDate(e.target.value)}
                                            className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:ring-1 focus:ring-indigo-500`}
                                        />
                                    </div>

                                    {/* GSTIN */}
                                    <div>
                                        <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                            <Tag size={12} className="text-indigo-500" /> GSTIN / Tax ID
                                        </label>
                                        <input 
                                            type="text"
                                            value={gstNumber}
                                            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                                            placeholder="e.g. 32BIRPS9696E1ZF"
                                            className={`w-full px-3 py-2 text-xs font-bold uppercase rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:ring-1 focus:ring-indigo-500`}
                                        />
                                    </div>

                                    {/* Payment Mode */}
                                    <div>
                                        <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                            <CreditCard size={12} className="text-indigo-500" /> Payment Mode
                                        </label>
                                        <div className="flex gap-1">
                                            {['CASH', 'CREDIT', 'UPI', 'CARD'].map(mode => (
                                                <button
                                                    key={mode}
                                                    type="button"
                                                    onClick={() => setPaymentMode(mode)}
                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                        paymentMode === mode
                                                            ? 'bg-indigo-600 text-white shadow-sm'
                                                            : `${theme.borderLight} border ${theme.surfaceBg} ${theme.textMuted} hover:text-indigo-600`
                                                    }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Line Item Breakdown Pill (e.g. Diesel 45.00 L) */}
                                {itemDetails && itemDetails.length > 0 && (
                                    <div className={`p-3 rounded-xl border ${theme.borderLight} bg-white/70 dark:bg-black/20 flex flex-wrap items-center justify-between gap-2`}>
                                        <div className="flex items-center gap-2">
                                            <Fuel size={16} className="text-amber-500" />
                                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                {itemDetails[0].name}
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-500">
                                                &bull; {itemDetails[0].quantity} {itemDetails[0].unit} @ ₹{itemDetails[0].rate}/{itemDetails[0].unit === 'Litre' ? 'L' : 'unit'}
                                            </span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                            ₹{(itemDetails[0].amount || numAmount).toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {/* Notes / Reference */}
                                <div>
                                    <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted}`}>
                                        Voucher Reference / Notes
                                    </label>
                                    <input 
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Fuel for delivery vehicle KL-19 Q 3301"
                                        className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:ring-1 focus:ring-indigo-500`}
                                    />
                                </div>
                            </div>

                            {/* Duplicate / Existing Category Detection */}
                            {existingMatch && (
                                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                        <AlertCircle size={16} />
                                        <span className="text-xs font-black uppercase tracking-wider">
                                            "{existingMatch.category}" already exists in today's expenses (Current: ₹{existingMatch.amount})
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMergeAction('add')}
                                            className={`p-3 rounded-xl text-left border transition-all ${
                                                mergeAction === 'add'
                                                    ? 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200'
                                                    : 'border-transparent bg-white/50 dark:bg-white/5 text-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 font-black text-xs">
                                                <Plus size={13} /> Add to Existing
                                            </div>
                                            <div className="text-[11px] font-bold mt-1">
                                                ₹{existingMatch.amount} + ₹{numAmount} = ₹{(Number(existingMatch.amount) || 0) + numAmount}
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setMergeAction('replace')}
                                            className={`p-3 rounded-xl text-left border transition-all ${
                                                mergeAction === 'replace'
                                                    ? 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200'
                                                    : 'border-transparent bg-white/50 dark:bg-white/5 text-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 font-black text-xs">
                                                <RefreshCw size={13} /> Update / Replace
                                            </div>
                                            <div className="text-[11px] font-bold mt-1">
                                                Set total to ₹{numAmount}
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setMergeAction('new')}
                                            className={`p-3 rounded-xl text-left border transition-all ${
                                                mergeAction === 'new'
                                                    ? 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200'
                                                    : 'border-transparent bg-white/50 dark:bg-white/5 text-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 font-black text-xs">
                                                <FileText size={13} /> Save as New
                                            </div>
                                            <div className="text-[11px] font-bold mt-1 truncate">
                                                Separate bill entry
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className={`p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${theme.borderLight} ${theme.surfaceBg}`}>
                    <div className="text-xs font-semibold text-gray-400">
                        {file && (
                            <span>
                                Total to add: <strong className={theme.textHeading}>₹{finalAmountToSave.toFixed(2)}</strong> (Term: {term})
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleClose}
                            className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-colors ${theme.borderLight} ${theme.textMuted} hover:bg-gray-100 dark:hover:bg-white/5`}
                        >
                            Cancel
                        </button>
                        
                        {file && (
                            <button
                                type="button"
                                onClick={handleOpenInSheet}
                                className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all`}
                            >
                                Open in Side Sheet
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!file || isScanning || isSaving || numAmount <= 0}
                            className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                                isSaving
                                    ? 'bg-gray-400'
                                    : 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-indigo-500/25'
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={16} /> Add to Today's Expenses
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseBillScanModal;
