import api from '../api';

export const shopService = {
    getAllShops: () => api.get('/shops'),
    getShopById: (id) => api.get(`/shops/${id}`),
    getShopsByOwner: (userId) => api.get(`/shops/owner/${userId}`),
    createShop: (shopData) => api.post('/shops', shopData),
    updateShop: (id, shopData) => api.put(`/shops/${id}`, shopData),
    deleteShop: (id) => api.delete(`/shops/${id}`),
    uploadLogo: (id, formData) => api.post(`/shops/${id}/logo`, formData),
};
