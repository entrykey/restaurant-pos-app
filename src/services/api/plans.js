import api from '../api';

export const planService = {
    getPlans: () => api.get('/plans'),
    getPlanById: (id) => api.get(`/plans/${id}`),
    createPlan: (data) => api.post('/plans', data),
    updatePlan: (id, data) => api.put(`/plans/${id}`, data),
    deletePlan: (id) => api.delete(`/plans/${id}`)
};
