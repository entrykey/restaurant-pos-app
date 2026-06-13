const getOrderLineValue = (item) => {
    const qty = Number(item.quantity) || 1;
    const lineBase = item.totalAmount != null
        ? Number(item.totalAmount)
        : (Number(item.price) || 0) * qty;
    const lineTax = Number(item.taxAmount) || 0;
    return lineBase + lineTax;
};

export const getOrderPaidRatio = (order) => {
    const items = order?.items || [];
    if (!items.length) return 1;
    const totalGross = items.reduce((sum, item) => sum + getOrderLineValue(item), 0);
    const paid = Number(order.grandTotal) || 0;
    if (totalGross <= 0) return 1;
    return Math.min(1, paid / totalGross);
};

export const getAdjustedUnitRefund = (orderItem, order) => {
    const ratio = getOrderPaidRatio(order);
    const qty = Number(orderItem.quantity) || 1;
    const lineValue = getOrderLineValue(orderItem);
    return parseFloat(((lineValue / qty) * ratio).toFixed(4));
};

export const findOrderItem = (order, itemId) =>
    (order?.items || []).find(
        (oi) => String(oi.itemId?._id || oi.itemId) === String(itemId)
    );

export const calculateReturnRefundTotal = (order, returnedItems = []) =>
    parseFloat(returnedItems.reduce((acc, ri) => {
        const original = findOrderItem(order, ri.itemId);
        if (!original) return acc + (Number(ri.price) || 0) * (Number(ri.quantity) || 0);
        return acc + getAdjustedUnitRefund(original, order) * (Number(ri.quantity) || 0);
    }, 0).toFixed(4));

export const withAdjustedReturnPrices = (order, returnedItems = []) =>
    returnedItems.map((ri) => {
        const original = findOrderItem(order, ri.itemId);
        const adjustedPrice = original ? getAdjustedUnitRefund(original, order) : ri.price;
        return { ...ri, price: adjustedPrice };
    });
