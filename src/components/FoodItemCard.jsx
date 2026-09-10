import React, { useMemo } from "react";
import { Plus, Sparkles, Tag } from "lucide-react";
import { DEFAULT_ITEM_IMAGE, getBingImage } from "../utils/getImage";
import { useTheme } from "../context/ThemeContext";
import { isStockTracked, allowsNegativeStock, getAvailableStock } from "../utils/cartStockUtils";

const FoodItemCard = ({ item, onSelect, formatCurrency, viewMode = "grid", disabled = false }) => {
    const { theme, themeName } = useTheme();
    const isGrid = viewMode === "grid";

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

    return (
        <div
            className={`${theme.surfaceBg} rounded-2xl shadow-sm border-2 border-transparent transition-all flex flex-col justify-between h-full w-full group relative 
                ${isGrid ? "p-0 overflow-hidden" : "p-3 md:p-4"} 
                ${isEffectivelyDisabled ? "grayscale opacity-60 cursor-not-allowed pointer-events-none" : "hover:border-indigo-500 hover:shadow-lg cursor-pointer"}`}
            onClick={() => !isEffectivelyDisabled && onSelect(item)}
        >
            {isEffectivelyDisabled && (
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    {disabled && (
                        <span className="bg-gray-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg border border-white/20">Disabled</span>
                    )}
                    {isOutOfStock && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg border border-white/20 animate-pulse">Out of Stock</span>
                    )}
                </div>
            )}
            <div className={`flex ${isGrid ? "flex-col flex-1 justify-between h-full" : "items-center gap-3 h-full"}`}>
                <div className={`relative ${isGrid ? "w-full" : "shrink-0"}`}>
                    <img
                        src={getBingImage(item?.name, { w: isGrid ? 300 : 110, h: isGrid ? 180 : 110 })}
                        alt={item?.name || "Item"}
                        loading="lazy"
                        className={`${isGrid ? "w-full h-24 sm:h-28 md:h-32" : "w-16 h-16 md:w-20 md:h-20"} rounded-xl object-cover bg-gray-100 border`}
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                        }}
                    />
                    {/* AI Label */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-indigo-600/90 backdrop-blur-md rounded-lg shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                        <Sparkles className="text-white" size={10} />
                        <span className="text-[7px] md:text-[8px] text-white font-black uppercase tracking-tighter">FilePe AI Optimized</span>
                    </div>
                    {isGrid && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isEffectivelyDisabled) onSelect(item);
                            }}
                            className={`absolute right-2 bottom-2 ${theme.surfaceBg} backdrop-blur-sm text-indigo-600 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-90`}
                        >
                            <Plus size={18} strokeWidth={3} />
                        </button>
                    )}
                </div>

                <div className={`flex-1 min-w-0 flex flex-col justify-between ${isGrid ? "p-3" : "h-full"}`}>
                    <div>
                        <div className="flex justify-between items-center">
                            <span className={`text-[8px] md:text-[10px] uppercase font-black ${theme.textMuted} tracking-widest truncate max-w-[120px]`}>
                                {item.category || "Others"}
                            </span>
                            {(['STOCK', 'TRADE', 'MANUFACTURED'].includes(item.itemType) || item.stockSettings?.stockApplicable === true) && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${isOutOfStock ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    Qty: {Number.isFinite(item.quantityOnHand)
                                        ? (Number.isInteger(item.quantityOnHand)
                                            ? item.quantityOnHand
                                            : parseFloat(Number(item.quantityOnHand).toFixed(3)))
                                        : 0}
                                </span>
                            )}
                        </div>
                        <div className="flex items-start gap-1 mt-0.5">
                            <p className={`font-bold ${theme.textPrimary} flex-1 text-sm md:text-base truncate`}>
                                {item.name}
                            </p>
                        </div>
                        {item.secondaryUnitId && item.conversionFactor > 1 && (
                            <div className="mt-0.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-[8px] font-black w-fit uppercase tracking-tighter">
                                1 {item.unitName || 'Pri'} = {item.conversionFactor} {item.secondaryUnitName || 'Sec'}
                            </div>
                        )}
                    </div>

                    {/* Pricing Section */}
                    {isGrid && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                            {hasPortions ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-[9px] uppercase font-black tracking-wider text-indigo-500 flex items-center gap-1">
                                            <Tag size={10} /> Portion Pricing
                                        </span>
                                        <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                                            {minPrice === maxPrice 
                                                ? formatPriceWithCurrency(minPrice) 
                                                : `${formatPriceWithCurrency(minPrice)} – ${formatPriceWithCurrency(maxPrice)}`}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {portionList.map((v) => (
                                            <div
                                                key={v.name}
                                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-bold border transition-all ${
                                                    themeName === 'dark' 
                                                        ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80' 
                                                        : 'bg-indigo-50/90 text-indigo-700 border-indigo-100 shadow-sm'
                                                }`}
                                            >
                                                <span className="opacity-75 font-medium">{v.name}:</span>
                                                <span className="font-black text-indigo-600 dark:text-indigo-400">{formatPriceWithCurrency(v.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className={`text-[10px] uppercase font-black tracking-wider ${theme.textMuted}`}>
                                        Price
                                    </span>
                                    <span className="text-sm md:text-base font-black text-indigo-600 dark:text-indigo-400">
                                        {item.sellingType === "Weight" 
                                            ? `${formatPriceWithCurrency(item.price)}/${item.unitName || 'kg'}` 
                                            : formatPriceWithCurrency(item.price)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!isGrid && (
                    <div className="flex flex-col items-end justify-between h-full gap-2 shrink-0 ml-2">
                        <div className="text-right">
                            {hasPortions ? (
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                        {minPrice === maxPrice 
                                            ? formatPriceWithCurrency(minPrice) 
                                            : `${formatPriceWithCurrency(minPrice)} – ${formatPriceWithCurrency(maxPrice)}`}
                                    </span>
                                    <div className="flex flex-wrap justify-end gap-1 max-w-[200px]">
                                        {portionList.map((v) => (
                                            <span
                                                key={v.name}
                                                className={`text-[9px] px-2 py-0.5 rounded-lg font-bold border ${
                                                    themeName === 'dark' 
                                                        ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800' 
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm'
                                                }`}
                                            >
                                                <span className="opacity-75">{v.name}:</span> {formatPriceWithCurrency(v.price)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm md:text-base">
                                    {item.sellingType === "Weight" 
                                        ? `${formatPriceWithCurrency(item.price)}/${item.unitName || 'kg'}` 
                                        : formatPriceWithCurrency(item.price)}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isEffectivelyDisabled) onSelect(item);
                            }}
                            className="bg-indigo-50 text-indigo-600 p-1.5 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm active:scale-90"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FoodItemCard;
