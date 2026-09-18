import React, { useState, useMemo } from "react";
import { X, Plus, Minus, ShoppingBag, Tag, Check, Package, AlertCircle } from "lucide-react";
import { DEFAULT_ITEM_IMAGE, getBingImage } from "../utils/getImage";
import { useTheme } from "../context/ThemeContext";
import { isStockTracked, allowsNegativeStock, getAvailableStock } from "../utils/cartStockUtils";

const ProductQuickViewPanel = ({ item, onClose, onAddToCart, formatCurrency }) => {
    const { theme } = useTheme();

    const portionList = useMemo(() => {
        if (Array.isArray(item?.portionPricing) && item.portionPricing.length > 0) {
            return item.portionPricing;
        }
        if (Array.isArray(item?.variants) && item.variants.length > 0) {
            return item.variants;
        }
        return [];
    }, [item]);

    const hasVariants = portionList.length > 0;
    const [selectedVariant, setSelectedVariant] = useState(hasVariants ? portionList[0] : null);
    const [quantity, setQuantity] = useState(1);

    const isOutOfStock = useMemo(() => {
        if (!item) return true;
        if (!isStockTracked(item) || allowsNegativeStock(item)) return false;

        if (selectedVariant) {
            const variantStock = Number.isFinite(selectedVariant.quantityOnHand)
                ? selectedVariant.quantityOnHand
                : Number.isFinite(selectedVariant.openingStock)
                ? selectedVariant.openingStock
                : getAvailableStock(item);
            return variantStock !== Infinity && variantStock <= 0;
        }

        const available = Number.isFinite(item?.quantityOnHand) ? item.quantityOnHand : getAvailableStock(item);
        return available !== Infinity && available <= 0;
    }, [item, selectedVariant]);

    if (!item) return null;

    const currentPrice = selectedVariant ? selectedVariant.price : (item.price || item.sellingPrice || 0);

    const handleAdd = () => {
        if (isOutOfStock) return;
        if (onAddToCart) {
            onAddToCart(item, selectedVariant, quantity);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Backdrop click */}
            <div className="flex-1 cursor-pointer" onClick={onClose} />

            {/* Quick View Slide-over Panel */}
            <div className={`w-full max-w-md ${theme.surfaceBg} bg-white text-slate-900 h-full border-l border-slate-200 shadow-2xl flex flex-col z-[90] animate-in slide-in-from-right duration-200 overflow-hidden`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Package size={18} />
                        </span>
                        <div>
                            <h3 className="font-black text-base text-slate-900 leading-tight">Product Quick View</h3>
                            <p className="text-xs text-slate-500 font-medium">SKU / Code: {item.sku || item.barcode || item._id || 'N/A'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
                    {/* Large Product Image Container */}
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm group">
                        <img
                            src={item?.image || item?.imageUrl || getBingImage(item?.name, { w: 400, h: 250 })}
                            alt={item?.name || "Item"}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                            }}
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                            <span className="bg-slate-900/80 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">
                                {item.category || "General"}
                            </span>
                            {isOutOfStock ? (
                                <span className="bg-red-500/90 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                                    <AlertCircle size={10} /> Out of Stock
                                </span>
                            ) : (
                                <span className="bg-emerald-500/90 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">
                                    In Stock ({item.quantityOnHand ?? 'Available'})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Title & Price */}
                    <div className="space-y-1 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <h2 className="text-xl font-black text-slate-900 leading-snug">
                            {item.name}
                        </h2>
                        <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-2xl font-black text-indigo-600">
                                {formatCurrency ? formatCurrency(currentPrice * quantity) : `${(currentPrice * quantity).toFixed(2)}`}
                            </span>
                            {quantity > 1 && (
                                <span className="text-xs text-slate-500 font-bold">
                                    ({formatCurrency ? formatCurrency(currentPrice) : currentPrice} each)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Tax & Unit Metadata */}
                    <div className="flex flex-wrap gap-2">
                        {item.taxPercent > 0 && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Tag size={12} />
                                <span>Tax: {item.taxPercent}% ({item.isExclusiveTax ? 'Exclusive' : 'Inclusive'})</span>
                            </div>
                        )}
                        {item.unitName && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                <span>Unit: {item.unitName}</span>
                            </div>
                        )}
                    </div>

                    {/* Variant Selector */}
                    {hasVariants && (
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                                Select Variant / Portion
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {portionList.map((v) => {
                                    const isSelected = selectedVariant?.name === v.name;
                                    return (
                                        <button
                                            key={v.name}
                                            type="button"
                                            onClick={() => setSelectedVariant(v)}
                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                                isSelected
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                                                    : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-extrabold text-xs">{v.name}</span>
                                                {isSelected && <Check size={14} className="text-indigo-600" />}
                                            </div>
                                            <span className="font-black text-xs text-indigo-600 mt-1">
                                                {formatCurrency ? formatCurrency(v.price) : v.price}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quantity Stepper */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                            Quantity
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center rounded-xl border border-slate-200 p-1 bg-white shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="w-12 text-center font-black text-base text-slate-900">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isOutOfStock}
                        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-black text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <ShoppingBag size={18} />
                        <span>Add {quantity} to Order • {formatCurrency ? formatCurrency(currentPrice * quantity) : (currentPrice * quantity).toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductQuickViewPanel;
