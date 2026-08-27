export const isStockTracked = (item) => {
    if (!item) return false;
    if (item.stockSettings?.stockApplicable === false || item.stockApplicable === false) return false;
    if (item.stockSettings?.stockApplicable === true || item.stockApplicable === true) return true;
    if (['STOCK', 'TRADE', 'MANUFACTURED'].includes(item.itemType)) return true;
    if (Array.isArray(item.ingredients) && item.ingredients.length > 0) return true;
    return false;
};

export const allowsNegativeStock = (item) => (
    item?.stockSettings?.allowNegativeStock === true || item?.allowNegativeStock === true
);

export const getCartLineStockQty = (cartItem) => {
    let qty = Number(cartItem?.quantity) || 0;
    if (cartItem?.selectedUnit === 'SECONDARY') {
        qty *= Number(cartItem.conversionFactor) || 1;
    }
    const factor = Number(cartItem?.selectedVariant?.quantityFactor ?? cartItem?.quantityFactor) || 1;
    qty *= factor;
    return qty;
};

export const getCartStockReservations = (cartItems = []) => {
    const map = new Map();
    (cartItems || []).forEach((line) => {
        if (!isStockTracked(line)) return;
        const add = getCartLineStockQty(line);

        // If line item has recipe ingredients, reserve on each raw ingredient
        if (Array.isArray(line?.ingredients) && line.ingredients.length > 0) {
            line.ingredients.forEach((ing) => {
                const ingId = String(ing.rawItemId || ing.itemId || ing._id || '');
                if (!ingId) return;
                const qtyNeeded = Number(ing.quantity) || 1;
                map.set(ingId, (map.get(ingId) || 0) + (add * qtyNeeded));
            });
        }

        // Reserve direct item stock if item does not rely solely on recipe ingredients
        const id = String(line.id || line._id);
        if (id && (line.itemType !== 'MANUFACTURED' || !Array.isArray(line?.ingredients) || line.ingredients.length === 0)) {
            map.set(id, (map.get(id) || 0) + add);
        }
    });
    return map;
};

export const buildBaseStockMap = (menuItems = []) => {
    const map = {};
    menuItems.forEach((item) => {
        const id = String(item.id || item._id);
        if (!id) return;
        map[id] = Math.max(0, Number(item.quantityOnHand) || 0);
    });
    return map;
};

export const applyCartStockToMenu = (menuItems = [], cartItems = [], baseStockMap = {}) => {
    return menuItems.map((item) => {
        if (!isStockTracked(item)) return item;
        const id = String(item.id || item._id);
        const base = baseStockMap[id] ?? Math.max(0, Number(item.quantityOnHand) || 0);
        const available = getAvailableStock(item, cartItems, baseStockMap);
        return {
            ...item,
            quantityOnHand: available === Infinity ? base : available,
            _baseQuantityOnHand: base,
        };
    });
};

export const getAvailableStock = (item, cartItems = [], baseStockMap = {}) => {
    if (allowsNegativeStock(item)) return Infinity;
    if (!isStockTracked(item)) return Infinity;

    const reservations = getCartStockReservations(cartItems);
    let available = Infinity;
    const id = String(item.id || item._id);

    // Check recipe ingredient stock availability for manufactured items
    if (Array.isArray(item?.ingredients) && item.ingredients.length > 0) {
        for (const ing of item.ingredients) {
            const ingId = String(ing.rawItemId || ing.itemId || ing._id || '');
            if (!ingId) continue;
            const ingBase = baseStockMap[ingId] ?? Math.max(0, Number(ing.quantityOnHand) || 0);
            const ingReserved = reservations.get(ingId) || 0;
            const ingAvail = Math.max(0, ingBase - ingReserved);
            const qtyNeeded = Number(ing.quantity) || 1;
            const maxPortions = Math.floor(ingAvail / qtyNeeded);
            if (maxPortions < available) {
                available = maxPortions;
            }
        }
    } else {
        // Direct item stock check
        const base = baseStockMap[id] ?? Math.max(0, Number(item._baseQuantityOnHand ?? item.quantityOnHand) || 0);
        const reserved = reservations.get(id) || 0;
        available = Math.max(0, base - reserved);
    }

    return available === Infinity ? Infinity : parseFloat(Math.max(0, available).toFixed(3));
};

export const canAddToCart = (item, cartItems, baseStockMap, quantity = 1, variant = null, selectedUnit = null) => {
    if (allowsNegativeStock(item)) return true;
    if (!isStockTracked(item)) return true;

    const available = getAvailableStock(item, cartItems, baseStockMap);
    if (available === Infinity) return true;

    let need = Number(quantity) || 0;
    if (selectedUnit === 'SECONDARY') need *= Number(item.conversionFactor) || 1;
    if (variant?.quantityFactor) need *= Number(variant.quantityFactor) || 1;

    return available >= need - 0.001;
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

/**
 * Deduplicates cart items by grouping identical items (same ID, variant, and extras)
 * and combining their quantities into a single line item.
 * 
 * @param {Array} cartItems - Array of cart items to deduplicate
 * @returns {Array} - Deduplicated array with combined quantities
 */
export const deduplicateCartItems = (cartItems = []) => {
    if (!cartItems || cartItems.length === 0) return [];
    
    const itemMap = new Map();
    
    cartItems.forEach(item => {
        const itemId = String(item._id || item.id);
        const extrasKey = (item.selectedExtras || [])
            .map(e => `${e.name}-${e.quantity}`)
            .sort()
            .join("|");
        const variantKey = item.selectedVariant ? item.selectedVariant.name : "std";
        const groupKey = `${itemId}|${variantKey}|${extrasKey}`;
        
        if (itemMap.has(groupKey)) {
            // Merge quantities
            const existing = itemMap.get(groupKey);
            existing.quantity += item.quantity;
        } else {
            // Add new entry (clone to avoid mutation)
            itemMap.set(groupKey, { ...item });
        }
    });
    
    return Array.from(itemMap.values());
};
