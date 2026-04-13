import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const clientService = {
    getClients: async () => {
        const token = localStorage.getItem('accessToken');
        return axios.get(`${API_URL}/clients`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },
    getDashboardStats: async () => {
        const token = localStorage.getItem('accessToken');
        return axios.get(`${API_URL}/clients/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};
