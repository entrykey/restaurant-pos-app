import React, { useMemo } from "react";
import { Plus, Layers, Eye, ChevronRight, X } from "lucide-react";
import { DEFAULT_ITEM_IMAGE, getBingImage } from "../utils/getImage";
import { useTheme } from "../context/ThemeContext";
import { isStockTracked, allowsNegativeStock, getAvailableStock } from "../utils/cartStockUtils";

const FoodItemCard = ({
    item,
    onSelect,
    onOpenQuickView,
    formatCurrency,
    isExpanded = false,
    onToggleExpand,
    viewMode = "grid",
    disabled = false
}) => {
    const { theme } = useTheme();

    const formatPriceWithCurrency = (price) => {
        if (price === undefined || price === null) return formatCurrency ? formatCurrency(0) : "0.00";
        return formatCurrency ? formatCurrency(price) : parseFloat(price).toFixed(2);
    };

    const isOutOfStock = useMemo(() => {
        if (!isStockTracked(item) || allowsNegativeStock(item)) return false;
        if (item.inventoryMode === 'separate' && Array.isArray(item.portionPricing) && item.portionPricing.length > 0) {
            const total = item.portionPricing.reduce(
                (sum, p) => sum + (Number(p.quantityOnHand ?? p.openingStock) || 0),
                0
            );
            return total <= 0;
        }
        const available = Number.isFinite(item?.quantityOnHand) ? item.quantityOnHand : getAvailableStock(item);
        if (available === Infinity) return false;
        return available <= 0;
    }, [item]);

    const isEffectivelyDisabled = disabled || isOutOfStock;

    // Portion pricing & variants data
    const portionList = useMemo(() => {
        if (Array.isArray(item.portionPricing) && item.portionPricing.length > 0) {
            return item.portionPricing;
        }
        if (Array.isArray(item.variants) && item.variants.length > 0) {
            return item.variants;
        }
        return [];
    }, [item.portionPricing, item.variants]);

    const hasPortions = portionList.length > 0;

    const { minPrice, maxPrice } = useMemo(() => {
        if (!hasPortions) return { minPrice: item.price || 0, maxPrice: item.price || 0 };
        const prices = portionList.map(p => Number(p.price) || 0);
        return {
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices)
        };
    }, [hasPortions, portionList, item.price]);

    const stockQtyDisplay = useMemo(() => {
        if (!(['STOCK', 'TRADE', 'MANUFACTURED'].includes(item.itemType) || item.stockSettings?.stockApplicable === true)) {
            return null;
        }
        return Number.isFinite(item.quantityOnHand)
            ? (Number.isInteger(item.quantityOnHand)
                ? item.quantityOnHand
                : parseFloat(Number(item.quantityOnHand).toFixed(3)))
            : 0;
    }, [item]);

    const handleCardClick = (e) => {
        if (isEffectivelyDisabled) return;
        if (hasPortions) {
            if (onToggleExpand) onToggleExpand();
        } else {
            if (onSelect) onSelect(item);
        }
    };

    if (viewMode === "list") {
        return (
            <div
                className={`relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${theme.surfaceBg} ${
                    isEffectivelyDisabled
                        ? "border-slate-200 opacity-60 cursor-not-allowed bg-slate-50"
                        : `border-slate-200/90 hover:border-indigo-500 hover:shadow-md cursor-pointer group`
                }`}
                onClick={handleCardClick}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0">
                        <img
                            src={item?.image || item?.imageUrl || getBingImage(item?.name, item?.categoryName || item?.category, { w: 100, h: 100 })}
                            alt={item?.name || "Item"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                            }}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase font-black tracking-wider text-indigo-600">
                                {item.category || "General"}
                            </span>
                            {hasPortions && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                    {portionList.length} Variants
                                </span>
                            )}
                        </div>
                        <h4 className={`font-bold text-xs sm:text-sm truncate ${theme.textPrimary}`}>
                            {item.name}
                        </h4>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                    {stockQtyDisplay !== null && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            isOutOfStock
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            {isOutOfStock ? "Out of stock" : `Qty: ${stockQtyDisplay}`}
                        </span>
                    )}

                    <span className="font-black text-sm text-indigo-600 min-w-[70px] text-right">
                        {hasPortions ? (
                            minPrice === maxPrice
                                ? formatPriceWithCurrency(minPrice)
                                : `${formatPriceWithCurrency(minPrice)} - ${formatPriceWithCurrency(maxPrice)}`
                        ) : (
                            formatPriceWithCurrency(item.price)
                        )}
                    </span>

                    <div className="flex items-center gap-1">
                        {onOpenQuickView && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenQuickView(item);
                                }}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center transition-colors bg-white"
                                title="Quick View"
                            >
                                <Eye size={14} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(e);
                            }}
                            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-xs active:scale-90"
                            title="Add to order"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // EXPANDED 2-COLUMN CARD VIEW (Spans 2 columns cleanly while unexpanded cards maintain initial size without stretching!)
    if (isExpanded) {
        return (
            <div
                className="w-full rounded-2xl border-2 border-indigo-600 bg-white p-3.5 shadow-xl ring-4 ring-indigo-500/10 flex flex-col sm:flex-row items-stretch gap-3.5 transition-all duration-300 animate-in fade-in zoom-in-95 cursor-default min-h-[210px]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Column: Product Info & Large Image */}
                <div className="flex-1 min-w-0 flex flex-col justify-between pr-0 sm:pr-3 border-b sm:border-b-0 sm:border-r border-slate-200/80 pb-3 sm:pb-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                                <img
                                    src={item?.image || item?.imageUrl || getBingImage(item?.name, item?.categoryName || item?.category, { w: 160, h: 160 })}
                                    alt={item?.name || "Item"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                                    }}
                                />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block truncate">
                                    {item.category || "General"}
                                </span>
                                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug truncate" title={item.name}>
                                    {item.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-black text-indigo-600">
                                        {hasPortions
                                            ? (minPrice === maxPrice ? formatPriceWithCurrency(minPrice) : `${formatPriceWithCurrency(minPrice)} - ${formatPriceWithCurrency(maxPrice)}`)
                                            : formatPriceWithCurrency(item.price)}
                                    </span>
                                    {stockQtyDisplay !== null && (
                                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md border ${isOutOfStock ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                            {isOutOfStock ? "Out of Stock" : `Qty: ${stockQtyDisplay} Available`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleExpand) onToggleExpand();
                            }}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                            title="Close expanded details"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Metadata footer */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
                        <span>SKU: {item.sku || item.barcode || item._id?.slice(-8) || 'N/A'}</span>
                        {item.taxPercent > 0 && (
                            <span className="text-indigo-600 font-bold">
                                Tax: {item.taxPercent}% ({item.isExclusiveTax ? 'Excl.' : 'Incl.'})
                            </span>
                        )}
                        {!hasPortions && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelect) onSelect(item);
                                    if (onToggleExpand) onToggleExpand();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-colors cursor-pointer ml-auto"
                            >
                                Add to Order
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column: Full Variant List & One-Click Selection */}
                {hasPortions ? (
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                                Select Variant ({portionList.length})
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">Click variant to add</span>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-48 my-1.5 space-y-1.5 custom-scrollbar pr-1">
                            {portionList.map((variant) => {
                                const variantStock = Number.isFinite(variant.quantityOnHand)
                                    ? variant.quantityOnHand
                                    : Number.isFinite(variant.openingStock)
                                    ? variant.openingStock
                                    : null;
                                const isVarOut = variantStock !== null && variantStock <= 0;

                                return (
                                    <button
                                        key={variant.name}
                                        type="button"
                                        disabled={isVarOut}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSelect) onSelect(item, variant);
                                            if (onToggleExpand) onToggleExpand();
                                        }}
                                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs ${
                                            isVarOut
                                                ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                                                : 'bg-indigo-50/70 hover:bg-indigo-600 hover:text-white border-indigo-100 text-slate-800 group/var cursor-pointer shadow-2xs'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 pr-1">
                                            <span className="font-extrabold text-xs truncate">{variant.name}</span>
                                            {variantStock !== null && (
                                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                                    isVarOut ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-emerald-700 border-emerald-200 group-hover/var:bg-white/20 group-hover/var:text-white group-hover/var:border-white/30'
                                                }`}>
                                                    Stock: {variantStock}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-black text-xs text-indigo-600 group-hover/var:text-white">
                                                {formatPriceWithCurrency(variant.price)}
                                            </span>
                                            <span className="w-6 h-6 rounded-lg bg-indigo-600 group-hover/var:bg-white text-white group-hover/var:text-indigo-600 flex items-center justify-center font-bold text-xs shadow-2xs">
                                                +
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleExpand) onToggleExpand();
                                }}
                                className="px-3 py-1 text-xs font-extrabold text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0 flex flex-col justify-center items-center p-4 space-y-3">
                        <p className="text-xs font-bold text-slate-500 text-center">Standard Item without variants</p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSelect) onSelect(item);
                                if (onToggleExpand) onToggleExpand();
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                            Add to Order • {formatPriceWithCurrency(item.price)}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // STANDARD 1-COLUMN CARD VIEW
    return (
        <div
            className={`relative flex flex-col justify-between h-full w-full rounded-2xl border transition-all duration-200 group ${theme.surfaceBg} ${
                isEffectivelyDisabled
                    ? "border-slate-200 opacity-60 cursor-not-allowed bg-slate-50"
                    : "border-slate-200/90 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
            }`}
            onClick={handleCardClick}
        >
            {/* Out of Stock Ribbon / Overlay Badge */}
            {isOutOfStock && (
                <div className="absolute top-2 left-2 z-20">
                    <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md">
                        Out of Stock
                    </span>
                </div>
            )}

            {/* Quick View Floating Eye Icon on Top-Right Hover */}
            {onOpenQuickView && !isEffectivelyDisabled && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenQuickView(item);
                    }}
                    className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-md flex items-center justify-center cursor-pointer"
                    title="Product Quick View"
                >
                    <Eye size={13} />
                </button>
            )}

            {/* Card Main Body */}
            <div className="p-3 flex flex-col h-full justify-between gap-2.5">
                {/* Top Section: Image + Category & Stock Header */}
                <div className="flex items-start gap-2.5">
                    {/* 1:1 Image Container */}
                    <div className="relative shrink-0 w-14 h-14 aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-2xs">
                        <img
                            src={item?.image || item?.imageUrl || getBingImage(item?.name, item?.categoryName || item?.category, { w: 140, h: 140 })}
                            alt={item?.name || "Item"}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                            }}
                        />
                    </div>

                    {/* Meta info & Title */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[9.5px] uppercase font-black tracking-wider text-indigo-600 truncate max-w-[80px]">
                                {item.category || "General"}
                            </span>

                            {stockQtyDisplay !== null && (
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border shrink-0 ${
                                    isOutOfStock
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                    Qty: {stockQtyDisplay}
                                </span>
                            )}
                        </div>

                        <h4
                            className={`font-bold text-xs sm:text-sm leading-snug ${theme.textPrimary} group-hover:text-indigo-600 transition-colors line-clamp-2 mt-0.5`}
                            title={item.name}
                        >
                            {item.name}
                        </h4>
                    </div>
                </div>

                {/* Variant Indicator Pill (If item has variants) */}
                {hasPortions && (
                    <div className="w-full">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleExpand) onToggleExpand();
                            }}
                            className="w-full py-1 px-2 rounded-lg bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 font-extrabold text-[10px] flex items-center justify-between transition-colors cursor-pointer"
                        >
                            <span className="flex items-center gap-1">
                                <Layers size={11} />
                                <span>{portionList.length} Variants Available</span>
                            </span>
                            <ChevronRight size={12} />
                        </button>
                    </div>
                )}

                {/* Bottom Footer Row: Price + Add Button */}
                <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 mt-auto">
                    <div className="min-w-0 flex flex-col">
                        <span className="text-xs sm:text-sm font-black text-indigo-600 truncate">
                            {hasPortions ? (
                                minPrice === maxPrice
                                    ? formatPriceWithCurrency(minPrice)
                                    : `${formatPriceWithCurrency(minPrice)} - ${formatPriceWithCurrency(maxPrice)}`
                            ) : (
                                item.sellingType === "Weight"
                                    ? `${formatPriceWithCurrency(item.price)}/${item.unitName || 'kg'}`
                                    : formatPriceWithCurrency(item.price)
                            )}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isEffectivelyDisabled) {
                                if (hasPortions) {
                                    if (onToggleExpand) onToggleExpand();
                                } else if (onSelect) {
                                    onSelect(item);
                                }
                            }
                        }}
                        disabled={isEffectivelyDisabled}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs shrink-0 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title={hasPortions ? "Select variant" : "Add to order"}
                    >
                        <Plus size={15} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FoodItemCard;
