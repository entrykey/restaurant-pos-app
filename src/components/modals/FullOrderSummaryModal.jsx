import React from "react";
import { X, ShoppingBag, Edit3, Printer } from "lucide-react";
import Modal from "../ui/Modal";
import { formatCurrency } from "../../utils/format";

const FullOrderSummaryModal = ({
    isOpen,
    onClose,
    isTakeaway,
    activeTableId,
    tableName,
    orderItems,
    calculateItemTotal,
    calculateTotal,
    onPrint,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-indigo-900">
                            Full Order Summary
                        </h3>
                        <p className="text-sm font-bold text-gray-500">
                            {isTakeaway
                                ? `Takeaway Order`
                                : `Table ${activeTableId} • ${tableName}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Items List */}
                    {(!orderItems || orderItems.length === 0) ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            <ShoppingBag size={64} className="mb-4" />
                            <p className="text-xl font-bold">Order is empty</p>
                        </div>
                    ) : (
                        orderItems.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex justify-between items-start p-4 bg-gray-50 rounded-2xl border border-gray-100"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-indigo-100 text-indigo-700 font-black px-3 py-1 rounded-lg text-sm">
                                            {item.quantity}x
                                        </span>
                                        <span className="font-bold text-lg text-gray-800">
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className="pl-12 mt-1 space-y-1">
                                        {item.selectedVariant && (
                                            <div className="text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded">
                                                {item.selectedVariant.name}
                                            </div>
                                        )}
                                        {item.sellingType === "Weight" && (
                                            <div className="text-sm text-gray-500">
                                                Weight:{" "}
                                                {item.enteredUnit === "g"
                                                    ? `${parseFloat((item.quantity * 1000).toFixed(0))}g`
                                                    : `${item.quantity}${item.unitName}`}
                                            </div>
                                        )}
                                        {item.selectedExtras?.length > 0 && (
                                            <div className="text-sm text-gray-500">
                                                <span className="font-bold text-gray-400 text-xs uppercase tracking-wider">
                                                    Extras:
                                                </span>{" "}
                                                {item.selectedExtras
                                                    .map((e) => `${e.name} (x${e.quantity})`)
                                                    .join(", ")}
                                            </div>
                                        )}
                                        {item.suggestion && (
                                            <div className="text-sm text-orange-600 italic bg-orange-50 p-2 rounded-lg mt-2 inline-block border border-orange-100">
                                                <Edit3 size={12} className="inline mr-1" />
                                                {item.suggestion}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-gray-900">
                                        {formatCurrency(calculateItemTotal(item))}
                                    </span>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {item.sellingType === "Standard"
                                            ? formatCurrency(item.price)
                                            : "Var. Price"}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-500">Total Items</span>
                        <span className="text-xl font-bold text-gray-900">
                            {(orderItems || []).length}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-3xl font-black text-indigo-900">
                        <span>Total Amount</span>
                        <span>
                            {/* Note: In real usage you might want to pass the calculated total object instead of recalculating */}
                            {formatCurrency(calculateTotal({ items: orderItems }))}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={onClose}
                            className="py-4 rounded-xl font-bold text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-100"
                        >
                            Close View
                        </button>
                        <button
                            onClick={onPrint}
                            className="py-4 rounded-xl font-bold text-white bg-indigo-600 shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
                        >
                            <Printer /> Print Bill
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullOrderSummaryModal;
