import React from "react";
import InlineReviewBill from "../pos/InlineReviewBill";
import { useOrder } from "../../context/OrderContext";
import { useApp } from "../../context/AppContext";

const PaymentModal = ({
    isOpen,
    onClose,
    isTakeaway,
    activeTableId,
    tableName,
    orderItems = [],
    settings,
    billDiscount,
    isAutoRoundOff = true,
    exchangeCredit = 0,
    originalOrderId = null,
    isExchange = false,
    returnedItems = [],
    onFinalizePayment,
    onPrintBill,
    hasPermission = () => true,
    hasPermissionFor = () => false,
    custName = "",
    setCustName = () => {},
    custPhone = "",
    setCustPhone = () => {},
    existingCustomerId = null,
    loyaltyDiscount,
    selectedCustomer = null,
    activeOrderCustomerId = null,
    activeOrderType = "TAKEAWAY",
    updateItemQuantity,
    removeItemFromCart,
    calculateItemTotal: propCalculateItemTotal,
    calculateBillDetails: propCalculateBillDetails,
    formatCurrency: propFormatCurrency,
}) => {
    const {
        calculateItemTotal: contextCalculateItemTotal,
        calculateBillDetails: contextCalculateBillDetails,
    } = useOrder() || {};
    const { formatCurrency: contextFormatCurrency } = useApp() || {};

    if (!isOpen) return null;

    const calculateItemTotal = propCalculateItemTotal || contextCalculateItemTotal;
    const calculateBillDetails = propCalculateBillDetails || contextCalculateBillDetails;
    const formatCurrency = propFormatCurrency || contextFormatCurrency;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 sm:p-2 lg:p-4 animate-in fade-in duration-200">
            <div className="w-full h-full sm:h-[95vh] sm:max-w-7xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                <InlineReviewBill
                    onBack={onClose}
                    onClose={onClose}
                    isModal={true}
                    isTakeaway={isTakeaway}
                    activeTableId={activeTableId}
                    tableName={tableName}
                    orderItems={orderItems}
                    settings={settings}
                    onFinalizePayment={async (...args) => {
                        if (onFinalizePayment) {
                            await onFinalizePayment(...args);
                        }
                        if (onClose) onClose();
                    }}
                    onPrintBill={onPrintBill}
                    hasPermission={hasPermission}
                    hasPermissionFor={hasPermissionFor}
                    takeawayCustName={custName}
                    setTakeawayCustName={setCustName}
                    takeawayCustPhone={custPhone}
                    setTakeawayCustPhone={setCustPhone}
                    updateItemQuantity={updateItemQuantity}
                    removeItemFromCart={removeItemFromCart}
                    calculateItemTotal={calculateItemTotal}
                    calculateBillDetails={calculateBillDetails}
                    formatCurrency={formatCurrency}
                    orderType={isTakeaway ? "Takeaway Order" : (tableName ? `Table ${tableName}` : "Dine In")}
                    billDiscount={billDiscount}
                    loyaltyDiscount={loyaltyDiscount}
                    selectedCustomer={selectedCustomer}
                />
            </div>
        </div>
    );
};

export default PaymentModal;
