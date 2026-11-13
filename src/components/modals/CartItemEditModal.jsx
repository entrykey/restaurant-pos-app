import React, { useState, useEffect, useMemo } from 'react';
import { X, Minus, Plus, Trash2, Sliders, Check, RotateCcw, AlertTriangle, Tag, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';

const CartItemEditModal = ({
    isOpen,
    onClose,
    item,
    itemIndex,
    menuItem,
    onSave,
    onRemove,
    currency = 'INR'
}) => {
    const { theme } = useTheme();
    const currencySymbol = getCurrencySymbol(currency);

    // Initial state setup from item
    const [quantityInput, setQuantityInput] = useState('1');
    const [unitPriceInput, setUnitPriceInput] = useState('');
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [itemDiscount, setItemDiscount] = useState('');
    const [itemDiscountType, setItemDiscountType] = useState('percent');
    const [suggestion, setSuggestion] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('PRIMARY');
    const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 'g'

    // Determine baseline original price from item or menu item
    const originalPrice = useMemo(() => {
        if (!item) return 0;
        if (selectedVariant?.price !== undefined) return Number(selectedVariant.price);
        if (item.selectedVariant?.price !== undefined) return Number(item.selectedVariant.price);
        if (menuItem?.pricing?.sellingPrice !== undefined) return Number(menuItem.pricing.sellingPrice);
        if (menuItem?.price !== undefined) return Number(menuItem.price);
        return Number(item.pricePerUnit || item.sellingPrice || item.price || 0);
    }, [item, menuItem, selectedVariant]);

    // Available variants from menuItem or item
    const availableVariants = useMemo(() => {
        const variants = [];
        const seen = new Set();

        const addPortions = (portions) => {
            if (!Array.isArray(portions)) return;
            portions.forEach((p) => {
                if (p && p.name && !seen.has(p.name)) {
                    seen.add(p.name);
                    variants.push(p);
                }
            });
        };

        addPortions(menuItem?.portionPricing);
        addPortions(item?.portionPricing);
        addPortions(menuItem?.variants);
        addPortions(item?.variants);

        return variants;
    }, [menuItem, item]);

    useEffect(() => {
        if (isOpen && item) {
            const isWeight = item.sellingType === 'Weight';
            const enteredGrams = isWeight && item.enteredUnit === 'g';
            setWeightUnit(enteredGrams ? 'g' : 'kg');

            const rawQty = item.quantity || 1;
            setQuantityInput(String(enteredGrams ? Math.round(rawQty * 1000) : rawQty));

            const basePrice = item.selectedVariant?.price !== undefined 
                ? item.selectedVariant.price 
                : (item.pricePerUnit || item.sellingPrice || item.price || 0);
            setUnitPriceInput(basePrice !== undefined && basePrice !== null ? String(basePrice) : '');

            setSelectedVariant(item.selectedVariant || null);
            setItemDiscount(item.itemDiscount !== undefined && item.itemDiscount !== null && item.itemDiscount !== 0 ? String(item.itemDiscount) : '');
            setItemDiscountType(item.itemDiscountType || 'percent');
            setSuggestion(item.suggestion || '');
            setSelectedUnit(item.selectedUnit || 'PRIMARY');
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const isWeight = item.sellingType === 'Weight';

    // Handle Quantity increments
    const handleQtyDelta = (delta) => {
        let current = parseFloat(quantityInput) || 0;
        let step = isWeight ? (weightUnit === 'g' ? 50 : 0.25) : 1;
        let next = Math.max(step, current + delta * step);
        if (isWeight && weightUnit === 'kg') {
            next = parseFloat(next.toFixed(3));
        } else {
            next = parseFloat(next.toFixed(2));
        }
        setQuantityInput(String(next));
    };

    // Calculate real-time totals
    const parsedQty = parseFloat(quantityInput) || 0;
    const actualQty = isWeight && weightUnit === 'g' ? parsedQty / 1000 : parsedQty;
    const parsedPrice = parseFloat(unitPriceInput) || 0;
    const rawSubtotal = actualQty * parsedPrice;

    let discountAmount = 0;
    const parsedDisc = parseFloat(itemDiscount) || 0;
    if (parsedDisc > 0) {
        if (itemDiscountType === 'percent') {
            discountAmount = (rawSubtotal * Math.min(100, parsedDisc)) / 100;
        } else {
            discountAmount = Math.min(rawSubtotal, parsedDisc);
        }
    }

    const taxableAmount = Math.max(0, rawSubtotal - discountAmount);
    const taxPercent = (item.taxPercent !== undefined && item.taxPercent !== null) ? item.taxPercent : 0;
    const isExclusive = !!item.isExclusiveTax;
    const taxAmount = isExclusive ? (taxableAmount * taxPercent) / 100 : 0;
    const lineTotal = isExclusive ? taxableAmount + taxAmount : taxableAmount;

    const handleSave = (e) => {
        if (e) e.preventDefault();

        if (actualQty <= 0) {
            toast.error("Please enter a valid quantity greater than 0");
            return;
        }

        if (parsedPrice < 0) {
            toast.error("Price cannot be negative");
            return;
        }

        const discVal = itemDiscount === '' ? 0 : parseFloat(itemDiscount);
        if (itemDiscountType === 'percent' && discVal > 100) {
            toast.error("Percentage discount cannot exceed 100%");
            return;
        }

        onSave({
            quantity: actualQty,
            price: parsedPrice,
            selectedVariant,
            itemDiscount: isNaN(discVal) ? 0 : discVal,
            itemDiscountType,
            suggestion: suggestion.trim(),
            selectedUnit,
            enteredUnit: isWeight ? weightUnit : undefined
        });

        toast.success(`Updated ${item.name}`);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="md:max-w-lg"
            title={`Edit Item: ${item.name}`}
        >
            <form onSubmit={handleSave} className="space-y-5">
                {/* 1. Item Name, Category & Variant Preview */}
                <div className={`p-3.5 rounded-2xl ${theme.pageBg} border ${theme.borderLight} flex items-center justify-between gap-3`}>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-black ${theme.textHeading} truncate`}>{item.name}</h4>
                            {selectedVariant && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full font-black uppercase">
                                    {selectedVariant.name}
                                </span>
                            )}
                        </div>
                        <p className={`text-[11px] font-bold ${theme.textMuted} mt-0.5`}>
                            {item.categoryName || 'General Item'} • {taxPercent}% {isExclusive ? 'Excl. Tax' : 'Incl. Tax'}
                        </p>
                    </div>

                    {originalPrice > 0 && Number(parsedPrice) !== Number(originalPrice) && (
                        <button
                            type="button"
                            onClick={() => setUnitPriceInput(String(originalPrice))}
                            className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800 shrink-0"
                            title="Reset to default menu price"
                        >
                            <RotateCcw size={10} /> Reset (₹{originalPrice})
                        </button>
                    )}
                </div>

                {/* 2. Variant / Portion Selector (if item has variations) */}
                {availableVariants.length > 0 && (
                    <div className="space-y-2">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary} flex items-center justify-between`}>
                            <span>Select Portion / Variant</span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                {availableVariants.length} option{availableVariants.length !== 1 ? 's' : ''}
                            </span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {availableVariants.map((v, i) => {
                                const isSelected = selectedVariant?.name === v.name;
                                return (
                                    <button
                                        key={v.name || i}
                                        type="button"
                                        onClick={() => {
                                            setSelectedVariant(v);
                                            if (v.price !== undefined && v.price !== null) {
                                                setUnitPriceInput(String(v.price));
                                            }
                                        }}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                            isSelected
                                                ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/80 ring-2 ring-indigo-500/30 text-indigo-900 dark:text-indigo-200 shadow-sm"
                                                : `${theme.borderLight} ${theme.surfaceBg} hover:border-indigo-300 text-gray-700 dark:text-gray-300`
                                        }`}
                                    >
                                        <div className="font-black text-xs truncate">{v.name}</div>
                                        <div className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                                            {formatCurrency(v.price || 0)}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Quantity & Unit Price Inputs Side-by-Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quantity Field with typing and stepper */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                                {isWeight ? `Weight (${weightUnit})` : 'Quantity'}
                            </label>
                            {isWeight && (
                                <div className={`flex rounded-lg border ${theme.borderLight} overflow-hidden text-[10px] font-black`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (weightUnit === 'g') {
                                                setWeightUnit('kg');
                                                setQuantityInput(String(parseFloat((parsedQty / 1000).toFixed(3))));
                                            }
                                        }}
                                        className={`px-2 py-0.5 ${weightUnit === 'kg' ? 'bg-indigo-600 text-white' : `${theme.surfaceBg} ${theme.textMuted}`}`}
                                    >
                                        kg
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (weightUnit === 'kg') {
                                                setWeightUnit('g');
                                                setQuantityInput(String(Math.round(parsedQty * 1000)));
                                            }
                                        }}
                                        className={`px-2 py-0.5 border-l ${theme.borderLight} ${weightUnit === 'g' ? 'bg-indigo-600 text-white' : `${theme.surfaceBg} ${theme.textMuted}`}`}
                                    >
                                        g
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`flex items-center rounded-xl border-2 ${theme.borderLight} ${theme.inputBg} p-1 focus-within:border-indigo-500 transition-all`}>
                            <button
                                type="button"
                                onClick={() => handleQtyDelta(-1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                                title="Decrease"
                            >
                                <Minus size={16} strokeWidth={3} />
                            </button>

                            <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={quantityInput}
                                onChange={(e) => setQuantityInput(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className={`flex-1 w-full text-center font-black text-base ${theme.textPrimary} bg-transparent outline-none px-2`}
                                placeholder="Qty"
                                required
                            />

                            <button
                                type="button"
                                onClick={() => handleQtyDelta(1)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                                title="Increase"
                            >
                                <Plus size={16} strokeWidth={3} />
                            </button>
                        </div>
                    </div>

                    {/* Unit Price Field (Editable by cashier!) */}
                    <div className="space-y-1.5">
                        <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                            Unit Price ({currencySymbol})
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={unitPriceInput}
                                onChange={(e) => setUnitPriceInput(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                placeholder="0.00"
                                className={`w-full pl-8 pr-3 py-2.5 rounded-xl border-2 font-black text-base ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500 outline-none shadow-xs`}
                                required
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400 pointer-events-none">
                                {currencySymbol}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Discount Section */}
                <div className="space-y-1.5">
                    <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                        Item Discount
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="number"
                                min="0"
                                max={itemDiscountType === 'percent' ? "100" : undefined}
                                step="any"
                                value={itemDiscount}
                                onChange={(e) => setItemDiscount(e.target.value)}
                                placeholder="0"
                                className={`w-full px-3 py-2 rounded-xl border-2 font-black text-sm ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500 outline-none shadow-xs`}
                            />
                        </div>
                        <div className={`flex rounded-xl border-2 ${theme.borderLight} overflow-hidden font-black text-xs`}>
                            <button
                                type="button"
                                onClick={() => setItemDiscountType('percent')}
                                className={`px-3 py-2 ${itemDiscountType === 'percent' ? 'bg-indigo-600 text-white' : `${theme.surfaceBg} ${theme.textMuted}`}`}
                            >
                                % Off
                            </button>
                            <button
                                type="button"
                                onClick={() => setItemDiscountType('flat')}
                                className={`px-3 py-2 border-l ${theme.borderLight} ${itemDiscountType === 'flat' ? 'bg-indigo-600 text-white' : `${theme.surfaceBg} ${theme.textMuted}`}`}
                            >
                                Flat ({currencySymbol})
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5. Item Note / Special Instructions */}
                <div className="space-y-1.5">
                    <label className={`text-xs font-black uppercase tracking-wider ${theme.textSecondary}`}>
                        Order Note / Kitchen Instructions
                    </label>
                    <input
                        type="text"
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        placeholder="e.g. Less spicy, extra sauce, size 38, etc."
                        className={`w-full px-3 py-2 rounded-xl border-2 font-bold text-xs ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500 outline-none shadow-xs`}
                    />
                </div>

                {/* 6. Live Subtotal Calculation Card */}
                <div className={`p-4 rounded-2xl ${theme.pageBg} border ${theme.borderLight} space-y-1.5 text-xs`}>
                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 font-bold">
                        <span>Calculation ({actualQty} × {formatCurrency(parsedPrice)}):</span>
                        <span>{formatCurrency(rawSubtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                            <span>Discount ({parsedDisc}{itemDiscountType === 'percent' ? '%' : currencySymbol}):</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    {taxAmount > 0 && (
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 font-bold">
                            <span>Tax ({taxPercent}%):</span>
                            <span>+{formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div className={`flex justify-between items-center pt-2 border-t-2 border-dashed ${theme.borderLight} font-black text-sm ${theme.textHeading}`}>
                        <span>Total Line Price:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-base">
                            {formatCurrency(lineTotal)}
                        </span>
                    </div>
                </div>

                {/* 7. Footer Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                    {onRemove ? (
                        <button
                            type="button"
                            onClick={() => {
                                onRemove();
                                onClose();
                            }}
                            className="px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <Trash2 size={15} /> Remove
                        </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2.5 rounded-xl border ${theme.borderLight} text-xs font-black uppercase tracking-wider ${theme.textMuted} hover:${theme.textPrimary} transition-colors cursor-pointer`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Check size={16} strokeWidth={3} /> Save Changes
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default CartItemEditModal;

