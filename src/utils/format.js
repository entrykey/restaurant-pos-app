export const formatCurrency = (amount, currency = "INR") => {
    if (isNaN(amount) || amount === null) amount = 0;
    const code = (typeof currency === 'object' && currency !== null) ? (currency.code || currency.id || 'USD') : (currency || 'INR');
    try {
        // Use decimal style to avoid regional symbols like $ or ₹
        // The commonised 'Coins' icon in the UI handles the visual representation
        return new Intl.NumberFormat("en-IN", {
            style: "decimal",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + " " + code;
    } catch (e) {
        console.error("formatCurrency error:", e);
        return Number(amount).toFixed(2) + " " + code;
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
