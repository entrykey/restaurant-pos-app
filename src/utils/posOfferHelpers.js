export const getFreeItemOffersForProduct = (offers, itemId) =>
    (offers || []).filter(
        (o) =>
            o.isActive !== false &&
            o.condition?.applyOn === "ITEM" &&
            (o.condition?.itemIds || []).map(String).includes(String(itemId)) &&
            o.reward?.rewardType === "FREE_ITEM"
    );

export const applyBogoQuantity = (baseQuantity, itemId, offers) => {
    let finalQuantity = parseFloat(baseQuantity) || 0;
    if (finalQuantity <= 0) return finalQuantity;

    getFreeItemOffersForProduct(offers, itemId).forEach((offer) => {
        const buyQty = offer.condition.minQuantity || 1;
        const freeQty = offer.reward.rewardQuantity || 1;
        const rewardItemIds = (offer.reward.itemIds || (offer.reward.specificItemId ? [offer.reward.specificItemId] : [])).map(String);
        const isSameItem = rewardItemIds.length === 0 || rewardItemIds.includes(String(itemId));

        if (isSameItem && finalQuantity % buyQty === 0) {
            const numSets = finalQuantity / buyQty;
            finalQuantity += numSets * freeQty;
        }
    });

    return finalQuantity;
};

export const getCrossItemFreeAdds = (quantity, itemId, offers, catalog = []) => {
    const adds = [];
    getFreeItemOffersForProduct(offers, itemId).forEach((offer) => {
        const buyQty = offer.condition.minQuantity || 1;
        const freeQty = offer.reward.rewardQuantity || 1;
        const rewardItemIds = (offer.reward.itemIds || (offer.reward.specificItemId ? [offer.reward.specificItemId] : [])).map(String);
        const isSameItem = rewardItemIds.length === 0 || rewardItemIds.includes(String(itemId));

        if (!isSameItem && quantity >= buyQty) {
            const freeItemId = rewardItemIds[0];
            const freeItem = catalog.find((m) => String(m._id || m.id) === String(freeItemId));
            if (freeItem) {
                const numSets = Math.floor(quantity / buyQty);
                adds.push({
                    item: freeItem,
                    quantity: numSets * freeQty,
                    offerName: offer.name,
                });
            }
        }
    });
    return adds;
};

export const findOfferNameForItem = (offers, itemId) => {
    const match = getFreeItemOffersForProduct(offers, itemId)[0];
    return match?.name || null;
};
