import { api } from './api';

export const userTutorialService = {
  getTutorialStatus: async () => {
    try {
      const response = await api.get('/users/tutorial/status');
      return response.data?.tutorial;
    } catch (error) {
      console.error('Error getting tutorial status:', error);
      return null;
    }
  },

  updateTutorialStatus: async (data) => {
    try {
      const response = await api.put('/users/tutorial/status', data);
      return response.data?.tutorial;
    } catch (error) {
      console.error('Error updating tutorial status:', error);
      return null;
    }
  }
};
