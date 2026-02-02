// This service handles takeaway and menu related data operations
// Currently returning static data, will be replaced with API calls later

const menuItems = [
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
        id: "m2",
        name: "Paneer Tikka",
        category: "Starters",
        taxPercent: 5,
        sellingType: "Standard",
        price: 320.0,
        isAvailableOnline: true,
    },
    {
        id: "m10",
        name: "Chicken Al Faham",
        category: "Grills",
        taxPercent: 5,
        sellingType: "Portion",
        isAvailableOnline: true,
        variants: [
            { name: "Quarter", price: 180 },
            { name: "Half", price: 340 },
            { name: "Full", price: 650 },
        ],
    },
];

export const takeawayService = {
    getMenu: () => {
        return new Promise((resolve) => {
            // Simulating API delay
            setTimeout(() => {
                resolve(menuItems);
            }, 300);
        });
    },
};
