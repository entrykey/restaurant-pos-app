export const buildTableDraftSignature = ({ tableId, tableOrder }) => {
    const items = tableOrder?.items || [];
    return JSON.stringify({
        tableId: tableId || null,
        orderId: tableOrder?.orderId || null,
        items: items.map((item) => ({
            id: item.id || item._id,
            quantity: item.quantity,
            selectedUnit: item.selectedUnit || 'PRIMARY',
            conversionFactor: item.conversionFactor || 1,
            variantId: item.selectedVariant?._id || item.selectedVariant?.id || null,
            notes: item.suggestion || '',
            price: item.selectedVariant ? item.selectedVariant.price : (item.price || item.sellingPrice || 0),
            taxPercent: item.taxPercent,
        })),
    });
};

export const buildTakeawayDraftSignature = ({
    activeTabId,
    takeawayOrder,
    activeOrderType,
    takeawayCustName,
    takeawayCustPhone,
}) => {
    const items = takeawayOrder?.items || [];
    return JSON.stringify({
        activeTabId,
        orderId: takeawayOrder?.orderId || null,
        orderType: activeOrderType,
        customerName: takeawayCustName || '',
        customerPhone: takeawayCustPhone || '',
        items: items.map((item) => ({
            id: item.id || item._id,
            quantity: item.quantity,
            selectedUnit: item.selectedUnit || 'PRIMARY',
            conversionFactor: item.conversionFactor || 1,
            variantId: item.selectedVariant?._id || item.selectedVariant?.id || null,
            notes: item.suggestion || '',
            price: item.selectedVariant ? item.selectedVariant.price : (item.price || item.sellingPrice || 0),
            taxPercent: item.taxPercent,
        })),
    });
};

export const mapOrderItemsToCart = (orderItems = [], menu = []) => {
    return (orderItems || []).map((orderItem) => {
        const itemId = orderItem.itemId?._id || orderItem.itemId;
        const menuItem = menu.find((m) => String(m.id || m._id) === String(itemId));
        const price = orderItem.price ?? menuItem?.price ?? menuItem?.sellingPrice ?? 0;

        return {
            ...(menuItem || {}),
            id: itemId,
            _id: itemId,
            name: orderItem.itemId?.name || orderItem.itemName || menuItem?.name || 'Item',
            price,
            sellingPrice: price,
            quantity: orderItem.quantity,
            taxPercent: orderItem.taxPercent ?? menuItem?.taxPercent,
            suggestion: orderItem.notes || '',
            selectedUnit: orderItem.selectedUnit || 'PRIMARY',
            conversionFactor: orderItem.conversionFactor || 1,
            selectedVariant: orderItem.portionName
                ? {
                    name: orderItem.portionName,
                    price,
                    _id: orderItem.variantId,
                    id: orderItem.variantId,
                    quantityFactor: orderItem.quantityFactor || 1,
                }
                : null,
            selectedExtras: [],
        };
    });
};

export const buildHistorySaleOrderState = (order, menu = []) => {
    const cartItems = mapOrderItemsToCart(order.items, menu);
    const orderType = order.orderType || 'TAKEAWAY';

    return {
        items: cartItems,
        isSentToKOT: false,
        orderType,
        orderId: order._id || order.id,
        orderNumber: order.orderNumber,
        isHistoryEdit: true,
        discountTotal: order.discountTotal || 0,
        discount: order.discountTotal ? { type: 'flat', value: order.discountTotal } : undefined,
    };
};
