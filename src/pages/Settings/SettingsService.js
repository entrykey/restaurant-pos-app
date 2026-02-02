export const TABLE_AREAS = ["AC", "Non-AC", "Outdoor"];



export const initialTables = [
    {
        id: 1,
        name: "Table 1",
        status: "available",
        order: null,
        startTime: null,
        capacity: 4,
        area: "AC",
        isMaintenance: false,
    },
    {
        id: 2,
        name: "Table 2",
        status: "available",
        order: null,
        startTime: null,
        capacity: 2,
        area: "AC",
        isMaintenance: false,
    },
    {
        id: 3,
        name: "Table 3",
        status: "occupied",
        startTime: Date.now() - 38 * 60 * 1000,
        capacity: 6,
        area: "Non-AC",
        isMaintenance: false,
        order: {
            items: [
                {
                    id: "m1",
                    name: "Butter Chicken Masala",
                    price: 450.0,
                    quantity: 1,
                    taxPercent: 5,
                    sellingType: "Standard",
                    selectedExtras: [],
                },
            ],
            isSentToKOT: true,
            kotSentAt: Date.now() - 38 * 60 * 1000,
            kotStatus: "preparing",
        },
    },
    {
        id: 4,
        name: "Table 4",
        status: "available",
        order: null,
        startTime: null,
        capacity: 4,
        area: "Outdoor",
        isMaintenance: false,
    },
];

export const initialSettings = {
    upiId: "restaurant@upi",
    isTaxEnabled: true,
    defaultTaxPercent: 5,
    shopName: "Desi Flavours POS",
};
