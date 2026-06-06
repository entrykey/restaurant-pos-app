import api from "../../services/api";

export const kdsService = {
    // statusFilter: 'active' | 'completed' | 'all'
    getKOTs: async (branchId, statusFilter = 'active') => {
        const response = await api.get('/kitchen/kots', { params: { branchId, statusFilter } });
        return response.data || [];
    },
    updateKOTStatus: async (kotId, status, estimatedTime = 0) => {
        const response = await api.put(`/kitchen/kots/${kotId}/status`, { status, estimatedTime });
        return response.data;
    },
    markReady: async (kotId) => {
        const response = await api.put(`/kitchen/kots/${kotId}/status`, { status: 'READY' });
        return response.data;
    }
};
