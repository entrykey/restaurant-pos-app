import React from "react";
import { CircleDashed, Plus } from "lucide-react";

const FoodItemCard = ({ item, onSelect, formatCurrency }) => {
    return (
        <div
            className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 cursor-pointer h-full flex flex-col group relative overflow-hidden"
            onClick={() => onSelect(item)}
        >
            <span className="text-[8px] md:text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">
                {item.category || "Uncategorized"}
            </span>
            <div className="flex justify-between items-start">
                <p className="font-bold text-gray-800 flex-1 text-sm md:text-base pr-4">
                    {item.name}
                </p>
                {["Portion", "Volume", "Weight"].includes(item.sellingType) && (
                    <CircleDashed size={14} className="text-indigo-400 mt-1" />
                )}
            </div>
            <div className="mt-auto pt-2 flex justify-between items-end">
                <div>
                    {item.sellingType === "Standard" && (
                        <p className="text-indigo-600 font-black text-sm md:text-base">
                            {formatCurrency(item.price)}
                        </p>
                    )}
                    {item.sellingType === "Weight" && (
                        <p className="text-indigo-600 font-black text-xs">
                            {formatCurrency(item.price)} / {item.unitName || "kg"}
                        </p>
                    )}
                    {(item.sellingType === "Portion" || item.sellingType === "Volume") && (
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

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item);
                    }}
                    className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm active:scale-90"
                >
                    <Plus size={16} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default FoodItemCard;
