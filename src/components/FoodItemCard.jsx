import React, { useMemo } from "react";
import { CircleDashed, Plus, Sparkles } from "lucide-react";
import { DEFAULT_ITEM_IMAGE, getBingImage } from "../utils/getImage";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";

const FoodItemCard = ({ item, onSelect, formatCurrency, viewMode = "grid", disabled = false }) => {
    const { theme } = useTheme();
    const { activeBranchId, branches } = useApp();
    const isGrid = viewMode === "grid";

    // Get currency from branch
    const currencyData = useMemo(() => {
        const branch = branches.find(b => b.id === activeBranchId || b._id === activeBranchId);
        return {
            symbol: branch?.currency?.symbol || "₹",
            code: branch?.currency?.code || "INR"
        };
    }, [branches, activeBranchId]);

    const formatPriceWithCurrency = (price) => {
        if (price === undefined || price === null) return "0.00";
        return `${currencyData.symbol}${parseFloat(price).toFixed(2)}`;
    };

    const isOutOfStock = useMemo(() => {
        // STOCK, TRADE, and MANUFACTURED items are inventory-tracked. 
        // If stock is not applicable, they are never out of stock.
        const stockApplicable = ['STOCK', 'TRADE', 'MANUFACTURED'].includes(item.itemType) || item.stockSettings?.stockApplicable === true;
        const allowNegative = item.stockSettings?.allowNegativeStock === true;
        
        if (stockApplicable && !allowNegative) {
            return (item.quantityOnHand || 0) <= 0;
        }
        return false;
    }, [item]);

    const isEffectivelyDisabled = disabled || isOutOfStock;

    return (
        <div
            className={`${theme.surfaceBg} rounded-2xl shadow-sm border-2 border-transparent transition-all flex flex-col group relative 
                ${isGrid ? "p-0" : "p-3 md:p-4"} 
                ${isEffectivelyDisabled ? "grayscale opacity-60 cursor-not-allowed pointer-events-none" : "hover:border-indigo-500 cursor-pointer"}`}
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
            <div className={`flex ${isGrid ? "flex-col" : "items-center gap-3 h-full"}`}>
                <div className={`relative ${isGrid ? "w-full" : "shrink-0"}`}>
                    <img
                        src={getBingImage(item?.name, { w: isGrid ? 300 : 110, h: isGrid ? 300 : 110 })}
                        alt={item?.name || "Item"}
                        loading="lazy"
                        className={`${isGrid ? "w-full aspect-[4/3]" : "w-16 h-16 md:w-20 md:h-20"} rounded-2xl object-cover bg-gray-100 border`}
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                        }}
                    />
                    {/* AI Label - Show based on item metadata or just show for demo if needed */}
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
                    <div className="flex justify-between items-center">
                        <span className={`text-[8px] md:text-[10px] uppercase font-black ${theme.textMuted} tracking-widest`}>
                            {item.category || "Uncategorized"}
                        </span>
                        {(['STOCK', 'TRADE', 'MANUFACTURED'].includes(item.itemType) || item.stockSettings?.stockApplicable === true) && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${isOutOfStock ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                Qty: {item.quantityOnHand ?? 0}
                            </span>
                        )}
                    </div>
                    <div className="flex items-start gap-1 mt-0.5">
                        <p className={`font-bold ${theme.textPrimary} flex-1 text-sm md:text-base truncate`}>
                            {item.name}
                        </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex-1">
                            {item.variants && item.variants.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {item.variants?.slice(0, 2).map((v) => (
                                        <span
                                            key={v.name}
                                            className="text-[9px] md:text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded"
                                        >
                                            {v.name}
                                        </span>
                                    ))}
                                    {item.variants?.length > 2 && (
                                        <span className="text-[10px] text-gray-400">...</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {isGrid && (
                            <div className="text-right">
                                <p className="text-indigo-600 font-black text-sm md:text-base">
                                    {item.sellingType === "Weight" ? `${formatPriceWithCurrency(item.price)}/${item.unitName || 'kg'}` : formatPriceWithCurrency(item.price)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {!isGrid && (
                    <div className="flex flex-col items-end justify-between h-full gap-1">
                        <div className="text-right">
                            <p className="text-indigo-600 font-black text-sm md:text-base">
                                {item.sellingType === "Weight" ? `${formatPriceWithCurrency(item.price)}/${item.unitName || 'kg'}` : formatPriceWithCurrency(item.price)}
                            </p>
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
