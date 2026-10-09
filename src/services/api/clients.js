import { api } from '../api';

export const clientService = {
    getClients: async () => {
        return api.get('/clients');
    },
    getDashboardStats: async () => {
        return api.get('/clients/dashboard');
    }
};
