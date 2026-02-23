// Mock service for Inventory Module
export const initialMenu = [
    {
        id: "m1",
        name: "Butter Chicken Masala",
        category: "Main Course",
        taxPercent: 5,
        sellingType: "Standard",
        itemType: "STOCK",
        price: 450.0,
        isAvailableOnline: true,
        availableExtras: [
            { name: "Extra Gravy", price: 50 },
            { name: "Butter Cube", price: 20 },
        ],
        // Restaurant specific
        prepTime: 20,
        dietType: "Non-Veg",
        spiceLevel: "Medium",
        kitchenSection: "Main Kitchen",
    },
    {
        id: "m10",
        name: "Chicken Al Faham",
        category: "Grills",
        taxPercent: 5,
        itemType: "STOCK", // Treated as variant due to Portion type
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
        prepTime: 30,
        kitchenSection: "Grill Station",
    },
    {
        id: "m11",
        name: "Fresh King Fish",
        category: "Sea Food",
        taxPercent: 5,
        sellingType: "Weight",
        itemType: "STOCK",
        pricePerUnit: 1000, // per kg
        unitName: "kg",
        isAvailableOnline: false,
        availableExtras: [{ name: "Masala Fry", price: 50 }],
        isWeightBased: true,
        weightUnit: "kg"
    },
    {
        id: "retail1",
        name: "Basmati Rice Premium",
        category: "Grains",
        subCategory: "Rice",
        brand: "India Gate",
        sku: "RICE-BAS-5KG",
        barcode: "8901234567890",
        sellingType: "Standard",
        price: 850,
        mrp: 900,
        stockApplicable: true,
        minStockAlert: 10,
        // Grocery specific
        shelfNo: "A-5",
        batchNo: "B2024-001",
        expiryDate: "2025-12-31",
        weightUnit: "5kg",
        loosePacked: "Packed"
    },
    {
        id: "med1",
        name: "Dolo 650",
        category: "Medicine",
        itemType: "STOCK",
        sellingType: "Standard",
        price: 30,
        mrp: 35,
        taxPercent: 12,
        stockApplicable: true,
        // Medical specific
        manufacturer: "Micro Labs",
        saltComposition: "Paracetamol 650mg",
        batchNo: "DL650-09",
        expiryDate: "2026-05-20",
        prescriptionRequired: false,
        scheduleType: "H",
        shelfNo: "M-12"
    },
    {
        id: "elec1",
        name: "Samsung Galaxy S24",
        category: "Smartphones",
        brand: "Samsung",
        itemType: "STOCK",
        sellingType: "Standard",
        price: 75000,
        mrp: 79999,
        taxPercent: 18,
        stockApplicable: true,
        // Electronics specific
        modelNumber: "SM-S921B",
        imei: "123456789012345",
        ram: "8GB",
        rom: "256GB",
        color: "Onyx Black",
        warrantyPeriod: "1 Year",
        warrantyType: "Brand",
    }
];

export const initialInventoryItems = [
    {
        id: "raw1",
        name: "Chicken Breast",
        category: "Meat",
        unit: "kg", // Base unit for stock
        costPerUnit: 220,
        currentStock: 15.5,
        minStockLevel: 5,
        supplier: "Fresh Farms",
    },
    {
        id: "raw2",
        name: "Basmati Rice",
        category: "Grains",
        unit: "kg",
        costPerUnit: 85,
        currentStock: 50,
        minStockLevel: 20,
        supplier: "Grain World",
    },
    {
        id: "raw3",
        name: "Tomatoes",
        category: "Vegetables",
        unit: "kg",
        costPerUnit: 30,
        currentStock: 8,
        minStockLevel: 5,
        supplier: "Veggie King",
    },
    {
        id: "raw4",
        name: "Cooking Oil",
        category: "Oil",
        unit: "L",
        costPerUnit: 110,
        currentStock: 25,
        minStockLevel: 10,
        supplier: "Oil Baron",
    },
    {
        id: "raw5",
        name: "Milk",
        category: "Dairy",
        unit: "L",
        costPerUnit: 55,
        currentStock: 12,
        minStockLevel: 5,
        supplier: "Milky Way",
    }
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
