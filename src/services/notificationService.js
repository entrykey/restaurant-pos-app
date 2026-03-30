import api from './api';

export const notificationService = {
    fetchNotifications: async (shopId, branchId) => {
        try {
            const response = await api.get(`/notifications`, { params: { shopId, branchId } });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            return [];
        }
    },

    markAsRead: async (id) => {
        try {
            await api.post(`/notifications/mark-read/${id}`);
            return true;
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            return false;
        }
    },

    markAllRead: async (shopId, branchId) => {
        try {
            await api.post(`/notifications/mark-all-read`, { shopId, branchId });
            return true;
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            return false;
        }
    },

    requestPermission: async () => {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return false;
        }

        if (Notification.permission === "granted") {
            return true;
        }

        const permission = await Notification.requestPermission();
        return permission === "granted";
    },

    notify: (title, options = {}) => {
        if (!("Notification" in window) || Notification.permission !== "granted") {
            return null;
        }

        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            silent: false,
        };

        const n = new Notification(title, { ...defaultOptions, ...options });
        
        n.onclick = (e) => {
            e.preventDefault();
            window.focus();
            if (options.onClick) options.onClick();
        };

        return n;
    }
};
