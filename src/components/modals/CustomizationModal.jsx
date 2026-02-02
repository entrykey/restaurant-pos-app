import React, { useState } from "react";
import { Scale, Minus, Plus } from "lucide-react";
import Modal from "../ui/Modal";
import { formatCurrency } from "../../utils/format";

const CustomizationModal = ({
    isOpen,
    onClose,
    item,
    onConfirm,
    customVariant,
    setCustomVariant,
    customWeightInput,
    setCustomWeightInput,
    customWeightUnit,
    setCustomWeightUnit,
    customExtras,
    setCustomExtras,
}) => {
    if (!item) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="md:max-w-lg">
            <div className="flex flex-col h-full md:h-auto">
                <div className="mb-4">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        {item.category}
                    </span>
                    <h3 className="text-2xl font-black text-gray-800">{item.name}</h3>
                </div>

                <div className="space-y-8 flex-1 overflow-y-auto">
                    {/* Variant Selection */}
                    {(item.sellingType === "Portion" || item.sellingType === "Volume") && (
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase mb-3 block">
                                Select Size / Portion
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {item.variants.map((v, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCustomVariant(v)}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${customVariant?.name === v.name
                                                ? "border-indigo-600 bg-indigo-50"
                                                : "border-gray-100 hover:border-indigo-200"
                                            }`}
                                    >
                                        <div className="font-bold text-gray-800">{v.name}</div>
                                        <div className="font-black text-indigo-600">
                                            {formatCurrency(v.price)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weight Input */}
                    {item.sellingType === "Weight" && (
                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <label className="text-xs font-black text-gray-400 uppercase block">
                                    Enter Weight
                                </label>
                                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                                    <button
                                        onClick={() => setCustomWeightUnit("kg")}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${customWeightUnit === "kg"
                                                ? "bg-white shadow text-indigo-600"
                                                : "text-gray-500"
                                            }`}
                                    >
                                        KG
                                    </button>
                                    <button
                                        onClick={() => setCustomWeightUnit("g")}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${customWeightUnit === "g"
                                                ? "bg-white shadow text-indigo-600"
                                                : "text-gray-500"
                                            }`}
                                    >
                                        GRAMS
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border-2 border-indigo-100">
                                <Scale className="text-indigo-600" size={24} />
                                <input
                                    type="number"
                                    value={customWeightInput}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                            setCustomWeightInput("");
                                        } else {
                                            setCustomWeightInput(parseFloat(val));
                                        }
                                    }}
                                    className="flex-1 bg-transparent text-3xl font-black text-gray-800 outline-none w-20"
                                    step="0.05"
                                    autoFocus
                                />
                                <span className="font-bold text-gray-400 uppercase">
                                    {customWeightUnit}
                                </span>
                            </div>
                            <div className="text-right mt-2 text-indigo-600 font-bold">
                                Price:{" "}
                                {formatCurrency(
                                    (customWeightUnit === "g"
                                        ? (parseFloat(customWeightInput) || 0) / 1000
                                        : parseFloat(customWeightInput) || 0) * item.pricePerUnit
                                )}
                            </div>
                        </div>
                    )}

                    {/* Extras Selection */}
                    {item.availableExtras && item.availableExtras.length > 0 && (
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase mb-3 block">
                                Add Extras
                            </label>
                            <div className="space-y-3">
                                {item.availableExtras.map((extra, i) => (
                                    <div
                                        key={i}
                                        className="flex justify-between items-center p-3 rounded-2xl border border-gray-100 bg-white shadow-sm"
                                    >
                                        <div>
                                            <div className="font-bold text-gray-700">{extra.name}</div>
                                            <div className="text-xs font-bold text-gray-400">
                                                {formatCurrency(extra.price)}
                                            </div>
                                        </div>

                                        {customExtras[extra.name] > 0 ? (
                                            <div className="flex items-center gap-3 bg-indigo-50 p-1 rounded-xl">
                                                <button
                                                    onClick={() =>
                                                        setCustomExtras({
                                                            ...customExtras,
                                                            [extra.name]: customExtras[extra.name] - 1,
                                                        })
                                                    }
                                                    className="p-1 bg-white rounded-lg text-red-500 shadow-sm"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="font-bold text-sm w-4 text-center">
                                                    {customExtras[extra.name]}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setCustomExtras({
                                                            ...customExtras,
                                                            [extra.name]: customExtras[extra.name] + 1,
                                                        })
                                                    }
                                                    className="p-1 bg-white rounded-lg text-indigo-600 shadow-sm"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    setCustomExtras({
                                                        ...customExtras,
                                                        [extra.name]: 1,
                                                    })
                                                }
                                                className="p-2 bg-gray-100 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t bg-gray-50 -mx-6 -mb-6 p-6 md:rounded-b-[40px]">
                    <button
                        onClick={onConfirm}
                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl flex justify-between px-8 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                        <span>Add to Order</span>
                        <span>
                            {formatCurrency(
                                (item.sellingType === "Weight"
                                    ? (customWeightUnit === "g"
                                        ? (parseFloat(customWeightInput) || 0) / 1000
                                        : parseFloat(customWeightInput) || 0) * item.pricePerUnit
                                    : customVariant?.price || item.price || 0) +
                                Object.keys(customExtras).reduce(
                                    (acc, key) =>
                                        acc +
                                        item.availableExtras.find((e) => e.name === key).price *
                                        customExtras[key],
                                    0
                                )
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CustomizationModal;
