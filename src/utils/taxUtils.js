/**
 * Resolve whether an item's price is tax-exclusive.
 * Treat as exclusive if EITHER the per-item flag OR the linked tax master says so.
 * (Stock UI keys off tax master via taxId; Product save also sets isExclusiveTax —
 * those can drift, so requiring both caused Incl/Excl mismatches on Sale.)
 */
export function resolveIsExclusiveTax(item, taxObj) {
    if (item?.isExclusiveTax === true) return true;

    const masterType =
        taxObj?.taxType ||
        (item?.taxId && typeof item.taxId === "object" ? item.taxId.taxType : null);

    if (masterType && String(masterType).toUpperCase() === "EXCLUSIVE") {
        return true;
    }

    return false;
}

/**
 * Find the shop tax that best matches an item (by taxId, then by rate + exclusive flag).
 * Pass the full tax list (not only active) so a linked taxId still resolves.
 */
export function findTaxForItem(item, taxes = []) {
    const taxPercent = Number(item?.taxPercent || item?.tax_percent || 0);
    const wantsExclusive = item?.isExclusiveTax === true;

    if (item?.taxId) {
        const byId = taxes.find(
            (t) => String(t._id || t.id) === String(item.taxId?._id || item.taxId)
        );
        if (byId) {
            const idType = (byId.taxType || "INCLUSIVE").toUpperCase();
            // If item flag conflicts with linked tax, prefer a same-rate tax matching the flag
            if (wantsExclusive && idType !== "EXCLUSIVE" && taxPercent > 0) {
                const exclusiveMatch = taxes.find(
                    (t) =>
                        Number(t.percentage) === taxPercent &&
                        (t.taxType || "").toUpperCase() === "EXCLUSIVE"
                );
                if (exclusiveMatch) return exclusiveMatch;
            }
            if (!wantsExclusive && item?.isExclusiveTax === false && idType === "EXCLUSIVE" && taxPercent > 0) {
                const inclusiveMatch = taxes.find(
                    (t) =>
                        Number(t.percentage) === taxPercent &&
                        (t.taxType || "INCLUSIVE").toUpperCase() === "INCLUSIVE"
                );
                if (inclusiveMatch) return inclusiveMatch;
            }
            return byId;
        }
    }

    if (!(taxPercent > 0)) return undefined;

    const byRateAndType = taxes.find((t) => {
        if (Number(t.percentage) !== taxPercent) return false;
        const type = (t.taxType || "INCLUSIVE").toUpperCase();
        return wantsExclusive ? type === "EXCLUSIVE" : type === "INCLUSIVE";
    });
    if (byRateAndType) return byRateAndType;

    // Prefer exclusive at this rate when flag is unknown, so we don't default to Inclusive
    // when both types exist and the item never got isExclusiveTax persisted.
    if (item?.isExclusiveTax === undefined || item?.isExclusiveTax === null) {
        const exclusiveAtRate = taxes.find(
            (t) =>
                Number(t.percentage) === taxPercent &&
                (t.taxType || "").toUpperCase() === "EXCLUSIVE"
        );
        if (exclusiveAtRate) return exclusiveAtRate;
    }

    return taxes.find((t) => Number(t.percentage) === taxPercent);
}
