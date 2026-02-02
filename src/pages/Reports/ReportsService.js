// Mock service for Reports Module
export const initialSalesHistory = [
    {
        id: "S1",
        amount: 1500,
        date: new Date().toISOString().split("T")[0],
        type: "Dine-in",
        method: "Cash",
        tableId: 3,
        tableName: "Table 3",
        waiterName: "Waiter John",
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        durationMinutes: 60,
        timestamp: Date.now(),
        subtotal: 1428.57,
        taxAmount: 71.43,
        discountAmount: 0,
        finalTotal: 1500,
        items: [
            {
                id: "m1",
                name: "Butter Chicken Masala",
                quantity: 2,
                price: 450,
                category: "Main Course",
            },
            {
                id: "m4",
                name: "Garlic Naan",
                quantity: 4,
                price: 65,
                category: "Breads",
            },
        ],
    },
    {
        id: "S2",
        amount: 850,
        date: new Date().toISOString().split("T")[0],
        type: "Dine-in",
        method: "UPI",
        tableId: 1,
        tableName: "Table 1",
        waiterName: "Rahul (Manager)",
        timestamp: Date.now() - 7200000,
        items: [
            { id: "m7", name: "Chicken Biryani", quantity: 2, price: 350, category: "Biriyani" },
            { id: "m6", name: "Masala Chai", quantity: 2, price: 70, category: "Drinks" }
        ]
    }
];

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
                    const cat = item.category || "Uncategorized";
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
