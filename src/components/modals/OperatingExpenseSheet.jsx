import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { 
    X, 
    Save, 
    Trash2, 
    ArrowRightCircle, 
    Coins, 
    Calendar, 
    Tag, 
    HelpCircle, 
    AlertCircle,
    CheckCircle2,
    Calculator,
    Sparkles,
    Camera,
    Loader2,
    Building,
    Hash,
    Car,
    CreditCard,
    Receipt,
    Truck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scanExpenseBill } from '../../utils/expenseOcrHelper';
import CommonSelect from '../ui/CommonSelect';

const terms = [
    { value: 'daily', label: 'Daily', days: 1 },
    { value: 'monthly', label: 'Monthly', days: 30 },
    { value: '2months', label: '2 Months', days: 60 },
    { value: '3months', label: '3 Months', days: 90 },
    { value: '6months', label: '6 Months', days: 180 },
    { value: 'yearly', label: 'Yearly', days: 365 },
    { value: 'one time', label: 'One Time', days: 0 }
];

const termDaysMap = {
    'daily': 1,
    'monthly': 30,
    '2months': 60,
    '3months': 90,
    '6months': 180,
    'yearly': 365,
    'one time': 0
};

const suggestedCategories = ['Salary', 'Rent', 'Petrol', 'Electricity', 'Water', 'Maintenance', 'Internet', 'Marketing', 'Repairs'];

const OperatingExpenseSheet = ({
    isOpen,
    onClose,
    expense,
    onSave,
    isDraftMode = false,
    onDelete,
    onMoveToExpense,
    existingCategories = [],
    suppliers = []
}) => {
    const { theme } = useTheme();
    const { organization, formatCurrency } = useApp();
    const currency = organization?.defaultCurrency || 'INR';

    const isEditMode = Boolean(expense && (expense._id || expense.category));
    const isPurchase = Boolean(expense?.isPurchase);

    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [term, setTerm] = useState('monthly');
    const [isDraft, setIsDraft] = useState(isDraftMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState('');

    // Enterprise bill details
    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [vendorName, setVendorName] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [paymentMode, setPaymentMode] = useState('CASH');
    const [paymentStatus, setPaymentStatus] = useState('UNPAID');
    const [notes, setNotes] = useState('');

    const handleOcrFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanStatus('Scanning with Filepe AI...');
        try {
            const result = await scanExpenseBill(file, (pct, status) => {
                if (status) setScanStatus(status);
            });
            if (result.category) setCategory(result.category);
            if (result.amount) setAmount(String(result.amount));
            setTerm(result.term || 'daily');
            if (result.vendorName || result.supplierName) {
                const detected = result.vendorName || result.supplierName;
                setVendorName(detected);
                const matched = (suppliers || []).find(s => s.name && detected && s.name.toLowerCase().includes(detected.toLowerCase()));
                if (matched) {
                    setSupplierId(String(matched._id || matched.id));
                    setSupplierName(matched.name);
                }
            }
            if (result.invoiceNumber) setBillNumber(result.invoiceNumber);
            if (result.vehicleNumber) setVehicleNumber(result.vehicleNumber);
            if (result.paymentMode) setPaymentMode(result.paymentMode);
            if (result.notes) setNotes(result.notes);
            toast.success(`Filepe AI Extracted ${result.category}: ₹${result.amount}${result.vehicleNumber ? ` (Vehicle: ${result.vehicleNumber})` : ''}`);
        } catch (err) {
            console.error('OCR failed in sheet:', err);
            toast.error(err?.message || 'Could not auto-extract receipt text');
        } finally {
            setIsScanning(false);
            setScanStatus('');
            if (e.target) e.target.value = '';
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (expense) {
                setCategory(expense.category || '');
                setAmount(expense.amount !== undefined && expense.amount !== null ? String(expense.amount) : '');
                setTerm(expense.term || 'monthly');
                setIsDraft(Boolean(expense.isDraft || isDraftMode));
                const suppId = expense.supplierId?._id || expense.supplierId || '';
                const suppNm = expense.supplierName || expense.supplierId?.name || '';
                setSupplierId(suppId ? String(suppId) : '');
                setSupplierName(suppNm);
                setVendorName(expense.vendorName || suppNm || '');
                setBillNumber(expense.billNumber || expense.invoiceNumber || '');
                setVehicleNumber(expense.vehicleNumber || '');
                setPaymentMode(expense.paymentMode || 'CASH');
                setPaymentStatus(expense.paymentStatus || (suppId ? 'UNPAID' : 'PAID'));
                setNotes(expense.notes || '');
            } else {
                setCategory('');
                setAmount('');
                setTerm('monthly');
                setIsDraft(isDraftMode);
                setSupplierId('');
                setSupplierName('');
                setVendorName('');
                setBillNumber('');
                setVehicleNumber('');
                setPaymentMode('CASH');
                setPaymentStatus('UNPAID');
                setNotes('');
            }
            setError(null);
        }
    }, [isOpen, expense, isDraftMode]);

    const supplierOptions = React.useMemo(() => {
        const list = [
            { label: '— No Supplier Linked (Optional) —', value: '' }
        ];
        (suppliers || []).forEach(s => {
            const id = String(s._id || s.id);
            const label = s.name + (s.phone ? ` (${s.phone})` : '');
            list.push({
                label,
                value: id,
                supplier: s
            });
        });
        return list;
    }, [suppliers]);

    if (!isOpen) return null;

    const numAmount = Number(amount) || 0;
    const daysInTerm = termDaysMap[term] || 30;
    const perDay = term === 'one time' ? 0 : (numAmount / (daysInTerm || 1));

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);

        const trimmedCategory = category.trim();
        if (!trimmedCategory) {
            setError('Please enter a category name');
            return;
        }

        // Check duplicate category if adding new or renaming
        if (!isEditMode || (expense && expense.category?.toLowerCase() !== trimmedCategory.toLowerCase())) {
            const isDuplicate = existingCategories.some(
                c => c && c.toLowerCase() === trimmedCategory.toLowerCase()
            );
            if (isDuplicate) {
                setError(`A category named "${trimmedCategory}" already exists.`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await onSave({
                _id: expense?._id,
                category: trimmedCategory,
                amount: numAmount,
                term,
                isDefault: expense?.isDefault || false,
                isDraft: isDraft,
                supplierId: supplierId || null,
                supplierName: supplierName.trim(),
                paymentStatus: supplierId ? paymentStatus : 'PAID',
                paidAmount: (supplierId && paymentStatus === 'PAID') ? numAmount : (expense?.paidAmount || 0),
                balanceAmount: (supplierId && paymentStatus === 'PAID') ? 0 : numAmount,
                vendorName: vendorName.trim(),
                billNumber: billNumber.trim(),
                vehicleNumber: vehicleNumber.trim(),
                paymentMode: paymentMode,
                notes: notes.trim(),
                billAttachment: expense?.billAttachment || ''
            });
            onClose();
        } catch (err) {
            console.error('Failed to save expense in sheet:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to save expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />

            {/* Sliding Panel */}
            <div className={`relative w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden ${theme.surfaceBg}`}>
                
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between ${theme.borderLight}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isDraft
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                        }`}>
                            <Calculator size={24} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black ${theme.textHeading}`}>
                                {isEditMode ? (isDraft ? 'Edit Draft Expense' : 'Edit Operating Expense') : (isDraft ? 'Add Draft Expense' : 'Add Operating Expense')}
                            </h2>
                            <p className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                                {isEditMode ? expense?.category : 'Record new cost parameter'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${theme.textMuted}`}
                        title="Close"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {isPurchase && (
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50 flex items-start gap-3 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Automated Stock Purchase Expense</p>
                                <p className="mt-0.5 text-blue-600 dark:text-blue-400">
                                    This value is automatically calculated from your Inventory Purchases for this branch.
                                </p>
                            </div>
                        </div>
                    )}
 
                    {/* OCR Quick Auto-Fill Banner */}
                    {!isPurchase && (
                        <label className={`relative block p-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                            isScanning 
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                                : `${theme.borderLight} hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10`
                        }`}>
                            <input 
                                type="file" 
                                accept="image/*,application/pdf"
                                capture="environment"
                                className="hidden" 
                                onChange={handleOcrFileSelect}
                                disabled={isScanning}
                            />
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                    {isScanning ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Camera size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black ${theme.textHeading}`}>
                                            {isScanning ? 'Scanning Receipt...' : 'Auto-Fill from Receipt (Filepe AI)'}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                            Filepe AI
                                        </span>
                                    </div>
                                    <p className={`text-[11px] truncate ${theme.textMuted}`}>
                                        {isScanning ? scanStatus : 'Upload petrol slip, bill, or receipt to auto-fill amount & category via Filepe AI'}
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
                                    {isScanning ? 'Reading...' : 'Browse'}
                                </span>
                            </div>
                        </label>
                    )}

                    {/* Category Input */}
                    <div className="space-y-2">
                        <label className={`block text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Expense Category <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            disabled={isPurchase}
                            placeholder="e.g. Electricity, Shop Rent, Wi-Fi..."
                            className={`w-full p-4 border rounded-2xl outline-none font-bold text-base transition-all ${
                                isPurchase ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''
                            } ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500`}
                        />

                        {/* Suggestions for new expenses */}
                        {!isEditMode && (
                            <div className="pt-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted} block mb-1.5`}>
                                    Quick Suggestions
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {suggestedCategories.map((sug) => (
                                        <button
                                            key={sug}
                                            type="button"
                                            onClick={() => setCategory(sug)}
                                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                                                category.toLowerCase() === sug.toLowerCase()
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : `${theme.surfaceBg} ${theme.borderLight} ${theme.textSecondary} hover:border-indigo-300`
                                            }`}
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Billing Term Selector */}
                    <div className="space-y-2">
                        <label className={`block text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Billing Cycle / Term
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {terms.map((t) => {
                                const isSelected = term === t.value;
                                return (
                                    <button
                                        key={t.value}
                                        type="button"
                                        disabled={isPurchase}
                                        onClick={() => setTerm(t.value)}
                                        className={`py-2.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wide border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${
                                            isSelected
                                                ? (isDraft
                                                    ? 'bg-amber-600 border-amber-600 text-white shadow-md'
                                                    : 'bg-indigo-600 border-indigo-600 text-white shadow-md')
                                                : `${theme.surfaceBg} ${theme.borderLight} ${theme.textSecondary} hover:border-indigo-200`
                                        } ${isPurchase ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span>{t.label}</span>
                                        <span className={`text-[9px] font-normal opacity-80 ${isSelected ? 'text-white' : theme.textMuted}`}>
                                            {t.days > 0 ? `${t.days}d` : 'Once'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <label className={`block text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Amount ({currency}) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={isPurchase}
                                placeholder="0.00"
                                className={`w-full p-4 border rounded-2xl outline-none font-black text-2xl transition-all ${
                                    numAmount < 0 ? 'text-red-600 border-red-400 bg-red-50/20' : theme.textPrimary
                                } ${isPurchase ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''} ${theme.inputBg} ${theme.borderLight} focus:border-indigo-500`}
                            />
                        </div>
                        {numAmount < 0 && (
                            <p className="text-xs font-bold text-red-500">
                                Negative expense detected (will be deducted or counted as credit).
                            </p>
                        )}
                    </div>

                    {/* Per Day Calculation Summary Card */}
                    <div className={`p-5 rounded-3xl border ${theme.borderLight} ${theme.pageBg} space-y-3`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textMuted} flex items-center gap-1.5`}>
                                <Coins size={14} className="text-indigo-500" />
                                Daily Expense Impact
                            </span>
                            <span className={`text-xl font-black ${perDay < 0 ? 'text-red-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {formatCurrency(perDay)}
                            </span>
                        </div>
                        <p className={`text-xs ${theme.textSecondary}`}>
                            {term === 'one time' 
                                ? 'One-time expenses do not recur daily and are excluded from the recurring daily expense calculation.'
                                : `Based on ${formatCurrency(numAmount)} divided over ${daysInTerm} days for this ${term} term.`}
                        </p>
                    </div>

                    {/* Enterprise POS Bill & Voucher Details */}
                    <div className={`p-4 rounded-3xl border ${theme.borderLight} bg-gradient-to-br from-indigo-50/40 to-transparent dark:from-indigo-950/20 dark:to-transparent space-y-3`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-black uppercase tracking-wider ${theme.textHeading} flex items-center gap-1.5`}>
                                <Receipt size={14} className="text-indigo-600" /> Bill & Voucher Metadata
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                Optional Details
                            </span>
                        </div>

                        {/* Linked Supplier (Optional) using CommonSelect */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className={`text-[11px] font-bold ${theme.textMuted} flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400`}>
                                    <Truck size={13} /> Linked Supplier (Optional)
                                </label>
                                {supplierId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSupplierId('');
                                            setSupplierName('');
                                        }}
                                        className="text-[10px] text-red-500 hover:underline font-bold"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <CommonSelect
                                options={supplierOptions}
                                value={supplierId}
                                onChange={(val) => {
                                    setSupplierId(val);
                                    const found = (suppliers || []).find(s => String(s._id || s.id) === String(val));
                                    if (found) {
                                        setSupplierName(found.name || '');
                                        if (!vendorName || vendorName === supplierName) {
                                            setVendorName(found.name || '');
                                        }
                                        if (!isEditMode) {
                                            setPaymentStatus('UNPAID');
                                        }
                                    } else {
                                        setSupplierName('');
                                    }
                                }}
                                placeholder="Search & link supplier (optional)..."
                                searchPlaceholder="Search registered suppliers..."
                                searchable={true}
                                size="sm"
                            />
                            <p className={`text-[10px] mt-1 ${theme.textMuted}`}>
                                Link recurring daily or periodic expenses directly to registered suppliers.
                            </p>
                        </div>

                        {/* Supplier Payment Status Toggle */}
                        {supplierId && (
                            <div className={`p-3 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} space-y-2`}>
                                <div className="flex items-center justify-between">
                                    <label className={`text-[11px] font-bold ${theme.textSecondary}`}>
                                        Supplier Payment Status
                                    </label>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                        paymentStatus === 'UNPAID'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                    }`}>
                                        {paymentStatus === 'UNPAID' ? 'Adds to Amount To Pay' : 'Already Settled'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentStatus('UNPAID')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center ${
                                            paymentStatus === 'UNPAID'
                                                ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 shadow-sm font-black'
                                                : `${theme.surfaceBg} ${theme.borderLight} ${theme.textSecondary} hover:border-gray-300`
                                        }`}
                                    >
                                        To Pay (Payment Due)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentStatus('PAID')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center ${
                                            paymentStatus === 'PAID'
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                                                : `${theme.surfaceBg} ${theme.borderLight} ${theme.textSecondary} hover:border-gray-300`
                                        }`}
                                    >
                                        Already Paid
                                    </button>
                                </div>
                                <p className={`text-[10px] font-medium ${paymentStatus === 'UNPAID' ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {paymentStatus === 'UNPAID'
                                        ? '• This amount will be added to the supplier\'s Payment Due to be paid.'
                                        : '• Settled immediately. Will not increase the supplier\'s Payment Due.'}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                    <Building size={12} className="text-indigo-500" /> Vendor / Station
                                </label>
                                <input 
                                    type="text"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    placeholder="e.g. M/s. Arjun Fuels"
                                    className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:border-indigo-500`}
                                />
                            </div>

                            <div>
                                <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                    <Hash size={12} className="text-indigo-500" /> Bill / Memo No
                                </label>
                                <input 
                                    type="text"
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    placeholder="e.g. 20332 / 36595"
                                    className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:border-indigo-500`}
                                />
                            </div>

                            <div>
                                <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1 text-indigo-600 dark:text-indigo-400`}>
                                    <Car size={12} /> Vehicle Number
                                </label>
                                <input 
                                    type="text"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                    placeholder="e.g. KL-19 Q 3301"
                                    className={`w-full px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-indigo-400/50 ${theme.surfaceBg} text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500`}
                                />
                            </div>

                            <div>
                                <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted} flex items-center gap-1`}>
                                    <CreditCard size={12} className="text-indigo-500" /> Payment Mode
                                </label>
                                <select
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:border-indigo-500`}
                                >
                                    <option value="CASH">CASH</option>
                                    <option value="CREDIT">CREDIT</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CARD">CARD</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={`block text-[11px] font-bold mb-1 ${theme.textMuted}`}>
                                Notes / Voucher Tag
                            </label>
                            <input 
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Delivery fleet diesel refill"
                                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border ${theme.borderLight} ${theme.surfaceBg} ${theme.textHeading} outline-none focus:border-indigo-500`}
                            />
                        </div>
                    </div>

                    {/* Draft Toggle */}
                    {!isEditMode && (
                        <div className={`p-4 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} flex items-center justify-between`}>
                            <div>
                                <span className={`text-sm font-black ${theme.textHeading}`}>Save as Draft</span>
                                <p className={`text-xs ${theme.textMuted}`}>
                                    Drafts are not applied to live daily profit calculation until approved.
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={isDraft}
                                onChange={(e) => setIsDraft(e.target.checked)}
                                className="w-5 h-5 rounded accent-amber-600 cursor-pointer"
                            />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className={`p-6 border-t ${theme.borderLight} ${theme.surfaceBg} flex flex-col gap-3`}>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider border transition-all ${theme.borderLight} ${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95`}
                        >
                            Cancel
                        </button>
                        {!isPurchase && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`flex-[2] py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
                                    isDraft
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>{isEditMode ? 'Update Expense' : 'Save Expense'}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Additional options for edit mode */}
                    {isEditMode && (
                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200 dark:border-gray-800">
                            {isDraft && onMoveToExpense && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onMoveToExpense(expense);
                                        onClose();
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors"
                                >
                                    <ArrowRightCircle size={15} />
                                    <span>Move to Active Expenses</span>
                                </button>
                            )}
                            {onDelete && !isPurchase && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onDelete(expense);
                                        onClose();
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-500 hover:text-red-700 ml-auto transition-colors"
                                >
                                    <Trash2 size={15} />
                                    <span>Delete Expense</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default OperatingExpenseSheet;
