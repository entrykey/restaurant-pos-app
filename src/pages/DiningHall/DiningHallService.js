import { diningCategoryService, tableService } from "../../services/api";

export const diningHallService = {
    getDiningHalls: async (branchId) => {
        try {
            const response = await diningCategoryService.getCategories({ branchId });
            return response.data || response; // Handle different return shapes
        } catch (error) {
            console.error("Error fetching dining halls:", error);
            return [];
        }
    },
    getTablesByCategory: async (categoryId, branchId) => {
        try {
            const response = await tableService.getTablesByCategory(categoryId, { branchId });
            return response.data || response;
        } catch (error) {
            console.error("Error fetching tables by category:", error);
            return [];
        }
    }
};
