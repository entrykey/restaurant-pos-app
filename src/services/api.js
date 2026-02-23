import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Adjust base URL as needed
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // Important for sending httpOnly refresh cookies
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
            // Prevent infinite loops if refresh endpoint itself fails
            if (originalRequest.url.includes('/auth/refresh')) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call the refresh endpoint (which reads the httpOnly cookie)
                const rs = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, {
                    withCredentials: true
                });

                const newAccessToken = rs.data.accessToken;

                // Update storage explicitly so future requests get it
                localStorage.setItem('accessToken', newAccessToken);

                // Update default headers and current request
                api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                return api(originalRequest);
            } catch (_error) {
                processQueue(_error, null);
                // The refresh token is invalid or expired
                // Clear state and force re-login
                // Ideally we'd dispatch a logout event here or redirect to login.
                localStorage.removeItem('accessToken');
                window.location.href = '/'; // Simple redirect to force re-login
                return Promise.reject(_error);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export const shopService = {
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    createShop: async (payload) => {
        try {
            const response = await api.post('/shops', payload);
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : error;
        }
    },

    getShopDataByUserId: async (userId) => {
        try {
            const response = await api.get(`/shops/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching shop data by user ID:", error);
            throw error.response ? error.response.data : error;
        }
    },

    getShopById: async (shopId) => {
        try {
            const response = await api.get(`/shops/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching shop by ID:", error);
            throw error.response ? error.response.data : error;
        }
    },

    getBusinessTypes: async () => {
        try {
            const response = await api.get('/business-types');
            return response.data;
        } catch (error) {
            console.error("Error fetching business types:", error);
            throw error.response ? error.response.data : error;
        }
    },

    getBusinessSubTypes: async (businessTypeId) => {
        try {
            const response = await api.get('/business-sub-types', {
                params: { businessTypeId }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching business sub types:", error);
            throw error.response ? error.response.data : error;
        }
    },

    // Method to fetch location details from pincode using a third-party API
    getLocationByPincode: async (countryCode, pincode) => {
        try {
            // using zippopotam.us content as an example, this can be changed
            // It supports multiple countries. 
            // India: in, USA: us, etc.
            const response = await axios.get(`https://api.zippopotam.us/${countryCode}/${pincode}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching location:", error);
            return null;
        }
    },

    // Reverse geocoding using OpenStreetMap (Nominatim)
    getAddressByCoordinates: async (lat, lon) => {
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching address from coordinates:", error);
            return null;
        }
    }
};

export const branchService = {
    create: async (payload) => {
        try {
            const response = await api.post('/branches', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating branch:", error);
            throw error.response ? error.response.data : error;
        }
    },
    update: async (id, payload) => {
        try {
            const response = await api.put(`/branches/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating branch:", error);
            throw error.response ? error.response.data : error;
        }
    },
    delete: async (id) => {
        try {
            const response = await api.delete(`/branches/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting branch:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getBranchesByShopId: async (shopId) => {
        try {
            const response = await api.get(`/branches/shop/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching branches by shop ID:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const subscriptionService = {
    create: async (payload) => {
        try {
            const response = await api.post('/subscriptions', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating subscription:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getShopPermissions: async (shopId) => {
        try {
            const response = await api.get(`/subscriptions/shop/${shopId}/permissions`);
            return response.data;
        } catch (error) {
            console.error("Error fetching shop permissions:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const employeeService = {
    create: async (payload) => {
        try {
            const response = await api.post('/employees', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating employee:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getEmployeesByShopId: async (shopId) => {
        try {
            const response = await api.get(`/employees/shop/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching employees by shop ID:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const roleService = {
    getRolesByShopId: async (shopId) => {
        try {
            const response = await api.get(`/roles/shop/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching roles:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createRole: async (payload) => {
        try {
            const response = await api.post('/roles', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating role:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateRole: async (id, payload) => {
        try {
            const response = await api.put(`/roles/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating role:", error);
            throw error.response ? error.response.data : error;
        }
    },
};

export const attributeService = {
    getAttributes: async (params) => {
        try {
            const response = await api.get('/attributes', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching attributes:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createAttribute: async (payload) => {
        try {
            const response = await api.post('/attributes', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating attribute:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateAttribute: async (id, payload) => {
        try {
            const response = await api.put(`/attributes/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating attribute:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteAttribute: async (id) => {
        try {
            const response = await api.delete(`/attributes/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting attribute:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const categoryService = {
    getCategories: async (params) => {
        try {
            const response = await api.get('/items/categories', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching categories:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createCategory: async (payload) => {
        try {
            const response = await api.post('/items/categories', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating category:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateCategory: async (id, payload) => {
        try {
            const response = await api.put(`/items/categories/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating category:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteCategory: async (id) => {
        try {
            const response = await api.delete(`/items/categories/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting category:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const unitService = {
    getUnits: async () => {
        try {
            const response = await api.get('/items/units');
            return response.data;
        } catch (error) {
            console.error("Error fetching units:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createUnit: async (payload) => {
        try {
            const response = await api.post('/items/units', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating unit:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateUnit: async (id, payload) => {
        try {
            const response = await api.put(`/items/units/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating unit:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteUnit: async (id) => {
        try {
            const response = await api.delete(`/items/units/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting unit:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const itemService = {
    getItems: async (payload = { page: 1, limit: 100, search: "", filters: {} }) => {
        try {
            const response = await api.post('/items/filter', payload);
            return response.data; // Now returns { data: [], pagination: {} }
        } catch (error) {
            console.error("Error fetching items:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getItemById: async (id) => {
        try {
            const response = await api.get(`/items/${id}`);
            return response.data.data || response.data;
        } catch (error) {
            console.error("Error fetching item:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createItem: async (payload) => {
        try {
            const response = await api.post('/items', payload);
            return response.data.data || response.data;
        } catch (error) {
            console.error("Error creating item:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateItem: async (id, payload) => {
        try {
            const response = await api.put(`/items/${id}`, payload);
            return response.data.data || response.data;
        } catch (error) {
            console.error("Error updating item:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteItem: async (id) => {
        try {
            const response = await api.delete(`/items/${id}`);
            return response.data.data || response.data;
        } catch (error) {
            console.error("Error deleting item:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const inventoryService = {
    getInventory: async (params = {}) => {
        try {
            const response = await api.get('/inventory', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching inventory levels:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export default api;
