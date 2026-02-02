// Mock service for Inventory Module
export const initialMenu = [
    {
        id: "m1",
        name: "Butter Chicken Masala",
        category: "Main Course",
        taxPercent: 5,
        sellingType: "Standard",
        price: 450.0,
        isAvailableOnline: true,
        availableExtras: [
            { name: "Extra Gravy", price: 50 },
            { name: "Butter Cube", price: 20 },
        ],
    },
    {
        id: "m10",
        name: "Chicken Al Faham",
        category: "Grills",
        taxPercent: 5,
        sellingType: "Portion",
        isAvailableOnline: true,
        variants: [
            { name: "Full", price: 600 },
            { name: "Half", price: 320 },
            { name: "Quarter", price: 180 },
        ],
        availableExtras: [
            { name: "Kuboos", price: 10 },
            { name: "Porotta", price: 15 },
            { name: "Mayonnaise", price: 20 },
        ],
    },
    {
        id: "m11",
        name: "Fresh King Fish",
        category: "Sea Food",
        taxPercent: 5,
        sellingType: "Weight",
        pricePerUnit: 1000, // per kg
        unitName: "kg",
        isAvailableOnline: false,
        availableExtras: [{ name: "Masala Fry", price: 50 }],
    },
    {
        id: "m12",
        name: "Watermelon Juice",
        category: "Drinks",
        taxPercent: 5,
        sellingType: "Volume",
        isAvailableOnline: true,
        variants: [
            { name: "250ml", price: 60 },
            { name: "500ml", price: 110 },
            { name: "1L Jug", price: 200 },
        ],
        availableExtras: [],
    },
    {
        id: "m3",
        name: "Tandoori Roti",
        price: 30.0,
        category: "Breads",
        taxPercent: 5,
        sellingType: "Standard",
        isAvailableOnline: true,
    },
    {
        id: "m4",
        name: "Garlic Naan",
        price: 65.0,
        category: "Breads",
        taxPercent: 5,
        sellingType: "Standard",
        isAvailableOnline: true,
    },
    {
        id: "m5",
        name: "Gulab Jamun (2 pcs)",
        price: 99.0,
        category: "Desserts",
        taxPercent: 12,
        sellingType: "Standard",
        isAvailableOnline: true,
    },
    {
        id: "m6",
        name: "Masala Chai",
        price: 70.0,
        category: "Drinks",
        taxPercent: 5,
        sellingType: "Standard",
        isAvailableOnline: true,
    },
    {
        id: "m7",
        name: "Chicken Biryani",
        price: 350.0,
        category: "Biriyani",
        taxPercent: 5,
        sellingType: "Standard",
        availableExtras: [
            { name: "Extra Raitha", price: 0 },
            { name: "Extra Papad", price: 10 },
        ],
        isAvailableOnline: true,
    },
];

export const inventoryService = {
    getCategories: (menu) => {
        return ["All", ...new Set(menu.map((item) => item.category))];
    },
    saveItem: async (item) => {
        console.log("Saving item:", item);
        return item;
    },
    deleteItem: async (id) => {
        console.log("Deleting item:", id);
        return true;
    }
};
