import api from '../api';

export const shopExpenseService = {
    getExpenses: (shopId, branchId) => api.get(`/shop-expenses/${shopId}/${branchId}`),
    upsertExpense: (shopId, branchId, data) => api.post(`/shop-expenses/${shopId}/${branchId}`, data),
    deleteExpense: (id) => api.delete(`/shop-expenses/${id}`)
};
