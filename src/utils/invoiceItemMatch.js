/**
 * Match OCR line text to catalog items (STOCK / TRADE) for the current shop/branch list.
 * Prefers exact name, then substring; breaks ties using business preference for TRADE vs STOCK.
 */

export function normalizeScannedProductName(name) {
    if (!name || typeof name !== "string") return "";
    // Milma-style line codes: "6.T M Curd…", "281.Milma Ghee…" → strip leading "123." or "123."
    return name
        .trim()
        .replace(/^\d+\./, "")
        .trim();
}

/**
 * @param {string} extractedName - raw name from invoice OCR
 * @param {Array<object>} stockItems - items for shop/branch (from API)
 * @param {{ preferTrade?: boolean }} options
 * @returns {object | null} best matching item or null
 */
export function findBestStockMatch(extractedName, stockItems, options = {}) {
    if (!extractedName || !Array.isArray(stockItems) || stockItems.length === 0) return null;

    const preferTrade = options.preferTrade === true;
    const raw = extractedName.toLowerCase().trim();
    const stripped = normalizeScannedProductName(extractedName).toLowerCase();
    const candidates = [...new Set([raw, stripped].filter(Boolean))];

    let best = null;
    let bestScore = -1;

    for (const it of stockItems) {
        const n = (it.name || "").toLowerCase().trim();
        if (!n) continue;

        let score = 0;
        let matched = false;

        for (const c of candidates) {
            if (!c || c.length < 2) continue;
            if (n === c) {
                score += 150;
                matched = true;
                break;
            }
            if (n.includes(c) || c.includes(n)) {
                score += 80;
                matched = true;
                break;
            }
            if (c.length >= 4 && (n.includes(c) || c.includes(n))) {
                score += 75;
                matched = true;
                break;
            }
        }
        if (!matched) continue;

        // Prefer item type aligned with purchase context (trade-capable businesses often buy TRADE SKUs)
        if (preferTrade && it.itemType === "TRADE") score += 25;
        if (!preferTrade && it.itemType === "STOCK") score += 25;
        if (preferTrade && it.itemType === "STOCK") score += 8;
        if (!preferTrade && it.itemType === "TRADE") score += 8;

        if (score > bestScore) {
            bestScore = score;
            best = it;
        }
    }

    return best;
}
