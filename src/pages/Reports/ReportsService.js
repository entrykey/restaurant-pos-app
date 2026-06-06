// Mock service for Reports Module
export const initialSalesHistory = [];


export const reportsService = {
    getSalesStats: (sales, date) => {
        const filtered = sales.filter((s) => s.date === date);
        const totalRevenue = filtered.reduce((a, b) => a + b.amount, 0);
        const totalOrders = filtered.length;
        const avgBillValue = totalOrders ? totalRevenue / totalOrders : 0;

        return { totalRevenue, totalOrders, avgBillValue, filtered };
    },
    getItemStats: (sales, date) => {
        const itemStats = {};
        sales.filter((s) => s.date === date).forEach((sale) => {
            if (sale.items) {
                sale.items.forEach((item) => {
                    if (!itemStats[item.name])
                        itemStats[item.name] = { qty: 0, revenue: 0 };
                    itemStats[item.name].qty += item.quantity;
                    itemStats[item.name].revenue += item.price * item.quantity;
                });
            }
        });
        return Object.entries(itemStats).map(([name, stats]) => ({ name, ...stats }));
    },
    getCategoryStats: (sales, date) => {
        const catStats = {};
        sales.filter((s) => s.date === date).forEach((sale) => {
            if (sale.items) {
                sale.items.forEach((item) => {
                    const cat = item.category || "Others";
                    if (!catStats[cat]) catStats[cat] = 0;
                    catStats[cat] += item.price * item.quantity;
                });
            }
        });
        return Object.entries(catStats).map(([cat, revenue]) => ({ cat, revenue }));
    },
    getPaymentStats: (sales, date) => {
        return ["Cash", "UPI", "Card"].map((method) => {
            const platformSales = sales.filter((s) => s.date === date && s.method === method);
            const total = platformSales.reduce((a, b) => a + b.amount, 0);
            const count = platformSales.length;
            return { method, total, count };
        });
    }
};
