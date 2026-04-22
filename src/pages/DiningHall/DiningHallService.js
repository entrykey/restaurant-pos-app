import { diningCategoryService, tableService, reservationService } from "../../services/api";

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
    },
    markArrived: async (reservationId) => {
        try {
            const response = await reservationService.updateStatus(reservationId, 'SEATED');
            return response.data || response;
        } catch (error) {
            console.error("Error marking arrival:", error);
            throw error;
        }
    },
    cancelReservation: async (reservationId) => {
        try {
            const response = await reservationService.deleteReservation(reservationId);
            return response.data || response;
        } catch (error) {
            console.error("Error cancelling reservation:", error);
            throw error;
        }
    }
};
