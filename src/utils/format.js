export const getCurrencySymbol = (currency = "INR") => {
    const code = (typeof currency === 'object' && currency !== null) ? (currency.code || currency.id || 'INR') : (currency || 'INR');
    const upper = String(code).toUpperCase();
    switch (upper) {
        case 'INR':
            return '₹';
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        case 'GBP':
            return '£';
        case 'JPY':
            return '¥';
        case 'CAD':
        case 'AUD':
            return '$';
        default:
            return upper;
    }
};

export const formatCurrency = (amount, currency = "INR") => {
    if (isNaN(amount) || amount === null) amount = 0;
    const code = (typeof currency === 'object' && currency !== null) ? (currency.code || currency.id || 'INR') : (currency || 'INR');
    const symbol = getCurrencySymbol(code);
    try {
        const numStr = new Intl.NumberFormat("en-IN", {
            style: "decimal",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
        if (symbol === '₹' || symbol === '$' || symbol === '€' || symbol === '£' || symbol === '¥') {
            return symbol + numStr;
        }
        return numStr + " " + symbol;
    } catch (e) {
        console.error("formatCurrency error:", e);
        const val = Number(amount).toFixed(2);
        if (symbol === '₹' || symbol === '$' || symbol === '€' || symbol === '£' || symbol === '¥') {
            return symbol + val;
        }
        return val + " " + symbol;
    }
};

export const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(date);
};

