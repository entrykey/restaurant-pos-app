export const isOfferValidToday = (offer) => {
    if (!offer) return false;
    if (offer.isActive === false) return false;

    const todayStr = new Date().toISOString().split('T')[0];

    if (offer.startDate) {
        const startStr = new Date(offer.startDate).toISOString().split('T')[0];
        if (todayStr < startStr) return false;
    }

    if (offer.endDate) {
        const endStr = new Date(offer.endDate).toISOString().split('T')[0];
        if (todayStr > endStr) return false;
    }

    return true;
};

export const getItemObjId = (item) => String(item?.itemId || item?._id || item?.id || '');

export const getFreeItemOffersForProduct = (offers, itemId) => {
    const targetId = String(itemId);
    return (offers || []).filter(
        (o) =>
            isOfferValidToday(o) &&
            o.condition?.applyOn === "ITEM" &&
            (o.condition?.itemIds || []).map(String).includes(targetId) &&
            o.reward?.rewardType === "FREE_ITEM"
    );
};

export const applyBogoQuantity = (baseQuantity, itemId, offers) => {
    let paidQty = parseFloat(baseQuantity) || 0;
    if (paidQty <= 0) return paidQty;

    let totalQty = paidQty;
    getFreeItemOffersForProduct(offers, itemId).forEach((offer) => {
        const buyQty = offer.condition?.minQuantity || 1;
        const freeQty = offer.reward?.rewardQuantity || 1;
        const rewardItemIds = (offer.reward?.itemIds || (offer.reward?.specificItemId ? [offer.reward.specificItemId] : [])).map(String);
        const isSameItem = rewardItemIds.length === 0 ||
            rewardItemIds.includes(String(itemId)) ||
            offer.reward?.rewardSelectionStrategy === "SAME_ITEM" ||
            offer.offerType === "BUY_X_GET_Y";

        if (isSameItem && paidQty >= buyQty) {
            const numSets = Math.floor(paidQty / buyQty);
            totalQty = paidQty + (numSets * freeQty);
        }
    });

    return totalQty;
};

export const syncItemBogoQuantity = (item, offers = []) => {
    if (!item) return item;
    const itemId = getItemObjId(item);

    const matchingOffer = (offers || []).find(
        (o) =>
            isOfferValidToday(o) &&
            o.condition?.applyOn === "ITEM" &&
            (o.condition?.itemIds || []).map(String).includes(itemId) &&
            o.reward?.rewardType === "FREE_ITEM"
    );

    if (!matchingOffer) {
        return {
            ...item,
            quantity: item.paidQuantity !== undefined ? item.paidQuantity : item.quantity
        };
    }

    const buyQty = matchingOffer.condition?.minQuantity || 1;
    const freeQty = matchingOffer.reward?.rewardQuantity || 1;
    const rewardItemIds = (matchingOffer.reward?.itemIds || (matchingOffer.reward?.specificItemId ? [matchingOffer.reward.specificItemId] : [])).map(String);
    const isSameItem = rewardItemIds.length === 0 ||
        rewardItemIds.includes(itemId) ||
        matchingOffer.reward?.rewardSelectionStrategy === "SAME_ITEM" ||
        matchingOffer.offerType === "BUY_X_GET_Y";

    if (!isSameItem) {
        return {
            ...item,
            quantity: item.paidQuantity !== undefined ? item.paidQuantity : item.quantity
        };
    }

    let paidQty = item.paidQuantity;
    if (paidQty === undefined || paidQty === null) {
        const setSize = buyQty + freeQty;
        if (item.quantity % setSize === 0) {
            paidQty = item.quantity * (buyQty / setSize);
        } else {
            paidQty = item.quantity;
        }
    }

    const numSets = Math.floor(paidQty / buyQty);
    const extraFree = numSets * freeQty;
    const totalQty = paidQty + extraFree;

    return {
        ...item,
        paidQuantity: paidQty,
        freeQuantity: extraFree,
        quantity: totalQty,
        bogoOfferName: matchingOffer.name,
    };
};

export const getCrossItemFreeAdds = (quantity, itemId, offers, catalog = []) => {
    const adds = [];
    getFreeItemOffersForProduct(offers, itemId).forEach((offer) => {
        const buyQty = offer.condition.minQuantity || 1;
        const freeQty = offer.reward.rewardQuantity || 1;
        const rewardItemIds = (offer.reward?.itemIds || (offer.reward?.specificItemId ? [offer.reward.specificItemId] : [])).map(String);
        const isSameItem = rewardItemIds.length === 0 ||
            rewardItemIds.includes(String(itemId)) ||
            offer.reward?.rewardSelectionStrategy === "SAME_ITEM" ||
            offer.offerType === "BUY_X_GET_Y";

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
