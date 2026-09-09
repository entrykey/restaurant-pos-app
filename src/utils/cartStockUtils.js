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

export const isSeparateVariantStock = (item) => item?.inventoryMode === 'separate';

export const getVariantStockQty = (variant) => (
    Number(variant?.quantityOnHand ?? variant?.openingStock) || 0
);

export const getCartLineStockQty = (cartItem) => {
    let qty = Number(cartItem?.quantity) || 0;
    if (cartItem?.selectedUnit === 'SECONDARY') {
        const factor = Number(cartItem.conversionFactor) || 1;
        if (factor > 0) qty /= factor;
    }
    if (isSeparateVariantStock(cartItem)) return qty;
    const factor = Number(cartItem?.selectedVariant?.quantityFactor ?? cartItem?.quantityFactor) || 1;
    qty *= factor;
    return qty;
};

export const getCartStockReservations = (cartItems = []) => {
    const map = new Map();
    (cartItems || []).forEach((line) => {
        if (!isStockTracked(line)) return;
        const add = getCartLineStockQty(line);
        const id = String(line.id || line._id);

        if (isSeparateVariantStock(line)) {
            const vName = line.selectedVariant?.name || 'std';
            const key = `${id}::${vName}`;
            map.set(key, (map.get(key) || 0) + add);
            return;
        }

        if (Array.isArray(line?.ingredients) && line.ingredients.length > 0) {
            line.ingredients.forEach((ing) => {
                const ingId = String(ing.rawItemId || ing.itemId || ing._id || '');
                if (!ingId) return;
                let qtyNeeded = Number(ing.quantity) || 1;
                if (ing.selectedUnit === 'SECONDARY') {
                    const factor = Number(ing.conversionFactor) || 1;
                    if (factor > 0) qtyNeeded /= factor;
                }
                map.set(ingId, (map.get(ingId) || 0) + (add * qtyNeeded));
            });
        }

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
        if (isSeparateVariantStock(item) && Array.isArray(item.portionPricing)) {
            item.portionPricing.forEach((p) => {
                map[`${id}::${p.name}`] = Math.max(0, getVariantStockQty(p));
            });
        }
    });
    return map;
};

export const applyCartStockToMenu = (menuItems = [], cartItems = [], baseStockMap = {}) => {
    return menuItems.map((item) => {
        if (!isStockTracked(item)) return item;
        const id = String(item.id || item._id);
        const base = baseStockMap[id] ?? Math.max(0, Number(item.quantityOnHand) || 0);
        if (isSeparateVariantStock(item) && Array.isArray(item.portionPricing)) {
            const portionPricing = item.portionPricing.map((p) => {
                const available = getAvailableStock(item, cartItems, baseStockMap, p);
                return {
                    ...p,
                    quantityOnHand: available === Infinity ? getVariantStockQty(p) : available,
                    openingStock: available === Infinity ? getVariantStockQty(p) : available,
                };
            });
            const total = portionPricing.reduce((sum, p) => sum + (Number(p.quantityOnHand) || 0), 0);
            return {
                ...item,
                portionPricing,
                quantityOnHand: total,
                _baseQuantityOnHand: base,
            };
        }
        const available = getAvailableStock(item, cartItems, baseStockMap);
        return {
            ...item,
            quantityOnHand: available === Infinity ? base : available,
            _baseQuantityOnHand: base,
        };
    });
};

export const getAvailableStock = (item, cartItems = [], baseStockMap = {}, variant = null) => {
    if (allowsNegativeStock(item)) return Infinity;
    if (!isStockTracked(item)) return Infinity;

    const reservations = getCartStockReservations(cartItems);
    const id = String(item.id || item._id);

    if (isSeparateVariantStock(item)) {
        if (variant) {
            const key = `${id}::${variant.name}`;
            const base = baseStockMap[key] ?? getVariantStockQty(variant);
            const reserved = reservations.get(key) || 0;
            return parseFloat(Math.max(0, base - reserved).toFixed(3));
        }
        const portions = item.portionPricing || [];
        const total = portions.reduce((sum, p) => {
            const key = `${id}::${p.name}`;
            const base = baseStockMap[key] ?? getVariantStockQty(p);
            const reserved = reservations.get(key) || 0;
            return sum + Math.max(0, base - reserved);
        }, 0);
        return parseFloat(Math.max(0, total).toFixed(3));
    }

    let available = Infinity;

    if (Array.isArray(item?.ingredients) && item.ingredients.length > 0) {
        for (const ing of item.ingredients) {
            const ingId = String(ing.rawItemId || ing.itemId || ing._id || '');
            if (!ingId) continue;
            const ingBase = baseStockMap[ingId] ?? Math.max(0, Number(ing.quantityOnHand) || 0);
            const ingReserved = reservations.get(ingId) || 0;
            const ingAvail = Math.max(0, ingBase - ingReserved);
            let qtyNeeded = Number(ing.quantity) || 1;
            if (ing.selectedUnit === 'SECONDARY') {
                const factor = Number(ing.conversionFactor) || 1;
                if (factor > 0) qtyNeeded /= factor;
            }
            const maxPortions = Math.floor(ingAvail / qtyNeeded);
            if (maxPortions < available) {
                available = maxPortions;
            }
        }
    } else {
        const base = baseStockMap[id] ?? Math.max(0, Number(item._baseQuantityOnHand ?? item.quantityOnHand) || 0);
        const reserved = reservations.get(id) || 0;
        available = Math.max(0, base - reserved);
    }

    return available === Infinity ? Infinity : parseFloat(Math.max(0, available).toFixed(3));
};

export const canAddToCart = (item, cartItems, baseStockMap, quantity = 1, variant = null, selectedUnit = null) => {
    if (allowsNegativeStock(item)) return true;
    if (!isStockTracked(item)) return true;

    const available = getAvailableStock(item, cartItems, baseStockMap, variant);
    if (available === Infinity) return true;

    let need = Number(quantity) || 0;
    if (selectedUnit === 'SECONDARY') {
        const factor = Number(item.conversionFactor) || 1;
        if (factor > 0) need /= factor;
    }
    if (!isSeparateVariantStock(item) && variant?.quantityFactor) need *= Number(variant.quantityFactor) || 1;

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

/**
 * Checks whether an item type (STOCK, MANUFACTURED, TRADE) is enabled for sale
 * in Sale Settings and marked as sellable on the item itself.
 */
export const isItemTypeAllowedOnSale = (item, settings = {}) => {
    if (!item) return false;
    if (item.isSellable === false || item.showOnSale === false) return false;
    
    // Individual item setting overrides global disabled type setting
    if (item.isSellable === true || item.showOnSale === true || item.isAvailableForSale === true) return true;

    const type = item.itemType || 'STOCK';
    if (type === 'STOCK' && settings?.ENABLE_STOCK_ITEMS === false) return false;
    if (type === 'MANUFACTURED' && settings?.ENABLE_MANUFACTURED_ITEMS === false) return false;
    if (type === 'TRADE' && settings?.ENABLE_TRADE_ITEMS === false) return false;
    
    return true;
};
