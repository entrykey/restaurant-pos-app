import api from '../../services/api';

const DEFAULT_LIMIT = 10;

export const SupplierService = {
    getSuppliers: async (shopId, search = "", page = 1, limit = DEFAULT_LIMIT) => {
        try {
            const response = await api.post('/suppliers/filter', { shopId, search, page, limit });
            // Support both paginated { data, pagination } and legacy flat array responses
            if (response.data && response.data.data) {
                return response.data; // { data: [], pagination: {} }
            }
            return { data: response.data, pagination: { total: response.data.length, page: 1, limit, totalPages: 1 } };
        } catch (error) {
            console.error("Error fetching suppliers:", error);
            throw error;
        }
    },

    addSupplier: async (supplierData) => {
        try {
            const response = await api.post('/suppliers', supplierData);
            return response.data;
        } catch (error) {
            console.error("Error creating supplier:", error);
            throw error;
        }
    },

    updateSupplier: async (id, updatedData) => {
        try {
            const response = await api.put(`/suppliers/${id}`, updatedData);
            return response.data;
        } catch (error) {
            console.error("Error updating supplier:", error);
            throw error;
        }
    },

    deleteSupplier: async (id) => {
        try {
            const response = await api.delete(`/suppliers/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting supplier:", error);
            throw error;
        }
    }
};
