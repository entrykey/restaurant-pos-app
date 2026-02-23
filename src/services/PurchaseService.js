import api from './api';

export const PurchaseService = {
    getPurchases: async (params) => {
        const response = await api.get('/purchases', { params });
        return response.data;
    },

    getPurchaseById: async (id) => {
        const response = await api.get(`/purchases/${id}`);
        return response.data;
    },

    createPurchase: async (data) => {
        const response = await api.post('/purchases', data);
        return response.data;
    },

    updatePurchase: async (id, data) => {
        const response = await api.put(`/purchases/${id}`, data);
        return response.data;
    },

    deletePurchase: async (id) => {
        const response = await api.delete(`/purchases/${id}`);
        return response.data;
    },

    confirmPurchase: async (id) => {
        const response = await api.post(`/purchases/${id}/confirm`);
        return response.data;
    },

    cancelPurchase: async (id) => {
        const response = await api.post(`/purchases/${id}/cancel`);
        return response.data;
    },

    addPayment: async (data) => {
        const response = await api.post(`/purchases/${data.purchaseId}/pay`, data);
        return response.data;
    }
};
