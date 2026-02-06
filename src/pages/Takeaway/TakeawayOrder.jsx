import React, { useEffect, useState } from "react";
import {
    Menu as MenuIcon,
    ShoppingCart,
    Search,
    X,
    Maximize,
    Printer,
    Check,
    Utensils,
    Plus,
    Minus,
    Edit3
} from "lucide-react";
import FoodItemCard from "../../components/FoodItemCard";
import { takeawayService } from "./TakeawayService";

const TakeawayOrder = ({
    isTakeaway,
    activeTableId,
    tables,
    takeawayOrder,
    formatCurrency,
    calculateTotal,
    calculateItemTotal,
    handlePrintReceipt,
    handleSendToKOT,
    setIsPaymentModalOpen,
    setBillingStage,
    initiateAddItem,
    updateItemQuantity,
    openNoteModal,
    takeawayCustName,
    setTakeawayCustName,
    takeawayCustPhone,
    setTakeawayCustPhone,
    orderSearch,
    setOrderSearch,
    setIsTakeaway,
    setView,
    settings,
    hasPermission,
    hasPermissionFor = () => false,
    currentUser
}) => {
    const [menu, setMenu] = useState([]);
    const [categories, setCategories] = useState(["All"]);
    const [activeMenuCategory, setActiveMenuCategory] = useState("All");
    const [mobileOrderTab, setMobileOrderTab] = useState("menu");

    useEffect(() => {
        takeawayService.getMenu().then((data) => {
            setMenu(data);
            const cats = ["All", ...new Set(data.map((item) => item.category))];
            setCategories(cats);
        });
    }, []);

    const currentOrder = isTakeaway
        ? takeawayOrder
        : tables.find((t) => t.id === activeTableId)?.order || { items: [] };

    const isSentToKOT = currentOrder.isSentToKOT;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50">
            {/* Mobile Tab Switcher */}
            <div className="lg:hidden flex p-2 bg-white border-b gap-2 shrink-0">
                <button
                    onClick={() => setMobileOrderTab("menu")}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${mobileOrderTab === "menu" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                >
                    <MenuIcon size={16} /> Menu
                </button>
                <button
                    onClick={() => setMobileOrderTab("cart")}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${mobileOrderTab === "cart" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                >
                    <ShoppingCart size={16} /> Cart
                    {currentOrder.items.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center ml-1">
                            {currentOrder.items.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Menu Section */}
                <div
                    className={`flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col ${mobileOrderTab === "cart" ? "hidden lg:flex" : "flex"
                        }`}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl md:text-2xl font-black text-indigo-900">
                            {isTakeaway ? "Takeaway Order" : `Table ${activeTableId}`}
                        </h2>
                        <button
                            onClick={() => {
                                setIsTakeaway(false);
                                setView("tables");
                            }}
                            className="p-2 bg-white rounded-full"
                        >
                            <X />
                        </button>
                    </div>

                    {isTakeaway && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <input
                                value={takeawayCustName}
                                onChange={(e) => setTakeawayCustName(e.target.value)}
                                placeholder="Customer Name"
                                className="p-3 border rounded-xl outline-none bg-white"
                            />
                            <input
                                value={takeawayCustPhone}
                                onChange={(e) => setTakeawayCustPhone(e.target.value)}
                                placeholder="Phone Number"
                                className="p-3 border rounded-xl outline-none bg-white"
                            />
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            placeholder="Search menu..."
                            className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveMenuCategory(cat)}
                                className={`px-4 md:px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all border-2 text-sm md:text-base ${activeMenuCategory === cat
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                    : "bg-white border-gray-200 text-gray-500"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
                        {menu
                            .filter(
                                (item) =>
                                    (activeMenuCategory === "All" || item.category === activeMenuCategory) &&
                                    item.name.toLowerCase().includes(orderSearch.toLowerCase())
                            )
                            .map((item) => (
                                <FoodItemCard
                                    key={item.id}
                                    item={item}
                                    formatCurrency={formatCurrency}
                                    onSelect={initiateAddItem}
                                />
                            ))}
                    </div>
                </div>

                {/* Cart Section */}
                <div
                    className={`w-full lg:w-[450px] bg-white border-l flex flex-col shrink-0 h-full ${mobileOrderTab === "menu" ? "hidden lg:flex" : "flex"
                        }`}
                >
                    <div className="p-4 md:p-6 border-b bg-white z-10 flex justify-between items-center">
                        <h3 className="text-lg md:text-xl font-black">Order Summary</h3>
                        <div className="flex items-center gap-2">
                            <button
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                                title="Print Receipt"
                                onClick={handlePrintReceipt}
                            >
                                <Printer size={20} />
                            </button>
                            {isSentToKOT && (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase">
                                    <Check size={14} /> KOT Sent
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                        {currentOrder.items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2 border-2 border-dashed rounded-3xl m-2">
                                <Utensils size={32} />
                                <p className="text-sm font-bold uppercase tracking-widest">Cart is empty</p>
                            </div>
                        ) : (
                            <div className="divide-y border rounded-xl overflow-hidden">
                                {currentOrder.items.map((item, idx) => (
                                    <div key={item.id + idx} className="p-3 hover:bg-gray-50 transition-colors bg-white">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex gap-3 flex-1 min-w-0">
                                                <div className="flex flex-col items-center bg-gray-100 rounded-lg p-1 h-fit shrink-0">
                                                    <button
                                                        onClick={() => updateItemQuantity(idx, 1)}
                                                        className="p-1 text-indigo-600 hover:bg-white rounded"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                    <span className="font-bold text-sm py-0.5 w-6 text-center">
                                                        {item.sellingType === "Weight" && item.enteredUnit === "g"
                                                            ? `${parseFloat((item.quantity * 1000).toFixed(0))}`
                                                            : item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateItemQuantity(idx, -1)}
                                                        className="p-1 text-red-500 hover:bg-white rounded"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-sm text-gray-800 leading-tight">
                                                            {item.name}
                                                        </span>
                                                        <span className="font-bold text-sm text-gray-900 shrink-0 ml-2">
                                                            {formatCurrency(calculateItemTotal(item))}
                                                        </span>
                                                    </div>
                                                    {item.selectedVariant && (
                                                        <div className="mt-1">
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                                                {item.selectedVariant.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {item.suggestion && (
                                                        <div className="text-[11px] text-orange-600 italic mt-1 truncate">
                                                            Note: {item.suggestion}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex justify-end">
                                            <button
                                                onClick={() => openNoteModal(idx, item.suggestion)}
                                                className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                            >
                                                <Edit3 size={10} />
                                                {item.suggestion ? "Edit Note" : "Add Note"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 md:p-6 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 space-y-3">
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(calculateTotal(currentOrder) / (1 + (settings?.defaultTaxPercent || 0) / 100))}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>Tax ({settings?.defaultTaxPercent || 0}%)</span>
                            <span>
                                {formatCurrency(
                                    calculateTotal(currentOrder) -
                                    calculateTotal(currentOrder) / (1 + (settings?.defaultTaxPercent || 0) / 100)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-2xl font-black text-indigo-900 pt-2 border-t border-dashed">
                            <span>Total</span>
                            <span>{formatCurrency(calculateTotal(currentOrder))}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={handleSendToKOT}
                                disabled={currentOrder.items.length === 0 || isSentToKOT}
                                className="py-3 md:py-4 rounded-xl font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                <Printer size={18} /> KOT
                            </button>
                            <button
                                onClick={() => {
                                    setIsPaymentModalOpen(true);
                                    setBillingStage("review");
                                }}
                                disabled={!hasPermissionFor("pos", "order", "process_payment") || currentOrder.items.length === 0}
                                className="py-3 md:py-4 rounded-xl font-bold bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 disabled:shadow-none"
                            >
                                {hasPermissionFor("pos", "order", "process_payment") ? "Checkout" : "Checkout (Restricted)"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeawayOrder;
