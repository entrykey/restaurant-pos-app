import api from '../../services/api';

export const SupplierService = {
    getSuppliers: async (shopId, search = "") => {
        try {
            const response = await api.post('/suppliers/filter', { shopId, search });
            return response.data;
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
