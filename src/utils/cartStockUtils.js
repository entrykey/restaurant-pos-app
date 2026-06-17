export const isStockTracked = (item) => (
    ['STOCK', 'TRADE', 'MANUFACTURED'].includes(item?.itemType)
    || item?.stockSettings?.stockApplicable === true
);

export const allowsNegativeStock = (item) => item?.stockSettings?.allowNegativeStock === true;

export const getCartLineStockQty = (cartItem) => {
    let qty = Number(cartItem?.quantity) || 0;
    if (cartItem?.selectedUnit === 'SECONDARY') {
        qty *= Number(cartItem.conversionFactor) || 1;
    }
    if (cartItem?.selectedVariant?.quantityFactor) {
        qty *= Number(cartItem.selectedVariant.quantityFactor) || 1;
    }
    return qty;
};

export const getCartStockReservations = (cartItems = []) => {
    const map = new Map();
    (cartItems || []).forEach((line) => {
        if (!isStockTracked(line)) return;
        const id = String(line.id || line._id);
        if (!id) return;
        const add = getCartLineStockQty(line);
        map.set(id, (map.get(id) || 0) + add);
    });
    return map;
};

export const buildBaseStockMap = (menuItems = []) => {
    const map = {};
    menuItems.forEach((item) => {
        const id = String(item.id || item._id);
        if (!id) return;
        map[id] = Number(item.quantityOnHand) || 0;
    });
    return map;
};

export const applyCartStockToMenu = (menuItems = [], cartItems = [], baseStockMap = {}) => {
    const reservations = getCartStockReservations(cartItems);
    return menuItems.map((item) => {
        if (!isStockTracked(item)) return item;
        const id = String(item.id || item._id);
        const base = baseStockMap[id] ?? (Number(item.quantityOnHand) || 0);
        const reserved = reservations.get(id) || 0;
        const available = parseFloat(Math.max(0, base - reserved).toFixed(3));
        return {
            ...item,
            quantityOnHand: available,
            _baseQuantityOnHand: base,
        };
    });
};

export const getAvailableStock = (item, cartItems = [], baseStockMap = {}) => {
    if (!isStockTracked(item)) return Infinity;
    if (allowsNegativeStock(item)) return Infinity;
    const id = String(item.id || item._id);
    const base = baseStockMap[id] ?? (Number(item._baseQuantityOnHand ?? item.quantityOnHand) || 0);
    const reserved = getCartStockReservations(cartItems).get(id) || 0;
    return parseFloat(Math.max(0, base - reserved).toFixed(3));
};

export const canAddToCart = (item, cartItems, baseStockMap, quantity = 1, variant = null, selectedUnit = null) => {
    if (!isStockTracked(item) || allowsNegativeStock(item)) return true;
    const id = String(item.id || item._id);
    const base = baseStockMap[id] ?? (Number(item._baseQuantityOnHand ?? item.quantityOnHand) || 0);
    const reserved = getCartStockReservations(cartItems).get(id) || 0;
    let need = Number(quantity) || 0;
    if (selectedUnit === 'SECONDARY') need *= Number(item.conversionFactor) || 1;
    if (variant?.quantityFactor) need *= Number(variant.quantityFactor) || 1;
    return base - reserved >= need - 0.001;
};

export const collectOpenCartItems = ({
    currentOrderItems = [],
    isTakeaway = true,
    tabs = [],
    activeTabId = null,
    tables = [],
    activeTableId = null,
}) => {
    const items = [...(currentOrderItems || [])];

    if (isTakeaway) {
        tabs.forEach((tab) => {
            if (tab.id === activeTabId) return;
            (tab.takeawayOrder?.items || []).forEach((line) => items.push(line));
        });
    } else {
        tables.forEach((table) => {
            const tableKey = String(table.id || table._id);
            if (tableKey === String(activeTableId)) return;
            (table.order?.items || []).forEach((line) => items.push(line));
        });
    }

    return items;
};
