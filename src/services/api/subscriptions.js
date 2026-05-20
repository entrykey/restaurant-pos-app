import api from '../api';

export const subscriptionService = {
    getAllSubscriptions: () => api.get('/subscriptions'),
    getSubscriptionById: (id) => api.get(`/subscriptions/${id}`),
    createSubscription: (data) => api.post('/subscriptions', data),
    updateSubscription: (id, data) => api.put(`/subscriptions/${id}`, data),
    cancelSubscription: (id, data) => api.post(`/subscriptions/${id}/cancel`, data),
    confirmSubscriptionPayment: (id, data = {}) => api.post(`/subscriptions/${id}/confirm-payment`, data),
    getTrialRunRequests: (status = 'pending') =>
        api.get('/trial-run-requests', { params: status ? { status } : {} }),
    getMyTrialRunRequest: () => api.get('/trial-run-requests/my'),
    createTrialRunRequest: (note = '') => api.post('/trial-run-requests', { note }),
    approveTrialRunRequest: (id, reviewNote = '') =>
        api.post(`/trial-run-requests/${id}/approve`, { reviewNote }),
    rejectTrialRunRequest: (id, reviewNote = '') =>
        api.post(`/trial-run-requests/${id}/reject`, { reviewNote }),
};
