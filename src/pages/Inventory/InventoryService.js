// Start with empty lists; AppContent loads items from API.
export const initialMenu = [];

export const initialInventoryItems = [];

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
