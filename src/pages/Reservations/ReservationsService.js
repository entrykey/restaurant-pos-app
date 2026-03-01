import api from '../../services/api';

export const reservationsService = {
    getReservations: async (params = {}) => {
        try {
            const response = await api.get('/reservations', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching reservations:", error);
            throw error;
        }
    },

    getReservationById: async (id) => {
        try {
            const response = await api.get(`/reservations/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching reservation ${id}:`, error);
            throw error;
        }
    },

    createReservation: async (reservationData) => {
        try {
            const response = await api.post('/reservations', reservationData);
            return response.data;
        } catch (error) {
            console.error("Error creating reservation:", error);
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    },

    updateReservationStatus: async (id, status) => {
        try {
            const response = await api.put(`/reservations/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error(`Error updating reservation ${id} status:`, error);
            throw error;
        }
    },

    updateReservation: async (id, reservationData) => {
        try {
            const response = await api.put(`/reservations/${id}`, reservationData);
            return response.data;
        } catch (error) {
            console.error(`Error updating reservation ${id}:`, error);
            throw error;
        }
    },

    deleteReservation: async (id) => {
        try {
            const response = await api.delete(`/reservations/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error deleting reservation ${id}:`, error);
            throw error;
        }
    }
};
