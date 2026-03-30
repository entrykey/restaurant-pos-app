export const formatCurrency = (amount, currency = "INR") => {
    if (isNaN(amount) || amount === null) amount = 0;
    const code = (typeof currency === 'object' && currency !== null) ? (currency.code || currency.id || 'USD') : (currency || 'INR');
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (e) {
        console.error("formatCurrency error:", e);
        return code + " " + Number(amount).toFixed(2);
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
