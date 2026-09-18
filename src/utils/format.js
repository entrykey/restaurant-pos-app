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
    const numAmount = Number(amount);
    const isNegative = numAmount < 0;
    const absAmount = Math.abs(numAmount);

    const code = (typeof currency === 'object' && currency !== null) ? (currency.code || currency.id || 'INR') : (currency || 'INR');
    const symbol = getCurrencySymbol(code);
    try {
        const numStr = new Intl.NumberFormat("en-IN", {
            style: "decimal",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(absAmount);
        
        let formatted = numStr;
        if (symbol === '₹' || symbol === '$' || symbol === '€' || symbol === '£' || symbol === '¥') {
            formatted = symbol + numStr;
        } else {
            formatted = numStr + " " + symbol;
        }
        return isNegative ? `-${formatted}` : formatted;
    } catch (e) {
        console.error("formatCurrency error:", e);
        const val = absAmount.toFixed(2);
        let formatted = val;
        if (symbol === '₹' || symbol === '$' || symbol === '€' || symbol === '£' || symbol === '¥') {
            formatted = symbol + val;
        } else {
            formatted = val + " " + symbol;
        }
        return isNegative ? `-${formatted}` : formatted;
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

