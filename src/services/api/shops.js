import api from '../api';

export const shopService = {
    getAllShops: () => api.get('/shops'),
    getShopById: (id) => api.get(`/shops/${id}`),
    createShop: (shopData) => api.post('/shops', shopData),
    updateShop: (id, shopData) => api.put(`/shops/${id}`, shopData),
    deleteShop: (id) => api.delete(`/shops/${id}`),
    uploadLogo: (id, formData) => api.post(`/shops/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};
