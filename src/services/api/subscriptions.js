import api from '../api';

export const subscriptionService = {
    getAllSubscriptions: () => api.get('/subscriptions'),
    getSubscriptionById: (id) => api.get(`/subscriptions/${id}`),
    createSubscription: (data) => api.post('/subscriptions', data),
    updateSubscription: (id, data) => api.put(`/subscriptions/${id}`, data),
    cancelSubscription: (id, data) => api.post(`/subscriptions/${id}/cancel`, data)
};
