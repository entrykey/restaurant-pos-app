import api from "../../services/api";

export const kdsService = {
    getKOTs: async (branchId) => {
        const response = await api.get('/kitchen/kots', { params: { branchId, status: { $ne: 'COMPLETED' } } });
        return response.data || [];
    },
    updateKOTStatus: async (kotId, status, estimatedTime = 0) => {
        const response = await api.put(`/kitchen/kots/${kotId}/status`, { status, estimatedTime });
        return response.data;
    },
    markReady: async (kotId) => {
        // Keeping this for compatibility or simpler calls
        const response = await api.put(`/kitchen/kots/${kotId}/status`, { status: 'READY' });
        return response.data;
    }
};
