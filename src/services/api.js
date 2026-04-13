import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL, // Adjust base URL as needed
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
                // The refresh token is invalid or expired.
                // Clear auth-related storage and let the UI fall back to the login screen
                // without forcing a hard reload (avoids infinite refresh loops).
                localStorage.removeItem('accessToken');
                localStorage.removeItem('restaurant_pos_auth_v1');
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

    switchShop: async (shopId) => {
        try {
            const response = await api.post('/auth/switch-shop', { shopId });
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

    updateShop: async (id, payload) => {
        try {
            const response = await api.put(`/shops/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating shop:", error);
            throw error.response ? error.response.data : error;
        }
    },

    getShopsByOwner: async (userId) => {
        try {
            const response = await api.get(`/shops/owner/${userId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching shops by owner:", error);
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

    getOrganizationDataByShopId: async (shopId) => {
        try {
            const response = await api.get(`/shops/organization/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching organization data by shop ID:", error);
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
    uploadLogo: async (shopId, file) => {
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const response = await api.post(`/shops/${shopId}/logo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error("Error uploading shop logo:", error);
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
    },
    getBranchTaxData: async (id) => {
        try {
            const response = await api.get(`/branches/${id}/tax`);
            return response.data;
        } catch (error) {
            console.error("Error fetching branch tax data:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getAllowedBranches: async () => {
        try {
            const response = await api.get('/branches/allowed');
            return response.data;
        } catch (error) {
            console.error("Error fetching allowed branches:", error);
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
    getEmployeesByShopId: async (shopId, allShops = false, userId = null, filterShopId = null) => {
        try {
            if (allShops && userId) {
                const response = await api.post(`/employees/all-shops`, {
                    user_id: userId,
                    get_all_shop_user: true,
                    shopId: filterShopId // Pass the filter if present
                });
                return response.data;
            }
            const response = await api.get(`/employees/shop/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching employees by shop ID:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getEmployeeById: async (id) => {
        try {
            const response = await api.get(`/employees/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching employee:", error);
            throw error.response ? error.response.data : error;
        }
    },
    update: async (id, payload) => {
        try {
            const response = await api.put(`/employees/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating employee:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPotentialManagers: async (shopId) => {
        try {
            const response = await api.get(`/employees/shop/${shopId}/potential-managers`);
            return response.data;
        } catch (error) {
            console.error("Error fetching potential managers:", error);
            throw error.response ? error.response.data : error;
        }
    }
};


export const roleService = {
    getRoleById: async (id) => {
        try {
            const response = await api.get(`/roles/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching role:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getRolesByShopId: async (shopId, allShops = false, userId = null, filterShopId = null) => {
        try {
            if (allShops && userId) {
                const response = await api.post(`/roles/all-shops`, {
                    user_id: userId,
                    get_all_shop_user: true,
                    shopId: filterShopId // Pass the filter if present
                });
                return response.data;
            }
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
    getRoles: async (params = {}) => {
        try {
            const response = await api.get('/roles', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching roles:", error);
            throw error.response ? error.response.data : error;
        }
    },
};

export const customerService = {
    getCustomers: async (params = {}) => {
        try {
            const response = await api.post('/customers/filter', params);
            return response.data;
        } catch (error) {
            console.error("Error fetching customers:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createCustomer: async (payload) => {
        try {
            const response = await api.post('/customers', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating customer:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateCustomer: async (id, payload) => {
        try {
            const response = await api.put(`/customers/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating customer:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteCustomer: async (id) => {
        try {
            const response = await api.delete(`/customers/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting customer:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const settingService = {
    getSettings: async (shopId) => {
        try {
            const response = await api.get('/settings', {
                params: { shopId }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching settings:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getSettingByKey: async (key, shopId) => {
        try {
            const response = await api.get(`/settings/${key}`, {
                params: { shopId }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching setting by key:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateSetting: async (key, payload) => {
        try {
            // Payload should contain { value, shopId }
            const response = await api.put(`/settings/${key}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating setting:", error);
            throw error.response ? error.response.data : error;
        }
    },
};

export const payrollService = {
    getSettings: async (shopId) => {
        try {
            const response = await api.get(`/shop-expenses/${shopId}/payroll/settings`);
            return response.data;
        } catch (error) {
            console.error("Error fetching payroll settings:", error);
            throw error.response ? error.response.data : error;
        }
    },
    saveSettings: async (shopId, payload) => {
        try {
            const response = await api.post(`/shop-expenses/${shopId}/payroll/settings`, payload);
            return response.data;
        } catch (error) {
            console.error("Error saving payroll settings:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPayroll: async (month, shopId) => {
        try {
            const response = await api.get('/payroll', { 
                params: { month, shopId } 
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching payroll:", error);
            throw error.response ? error.response.data : error;
        }
    },
    generatePayroll: async (month, shopId) => {
        try {
            const response = await api.post('/payroll/generate', { month, shopId });
            return response.data;
        } catch (error) {
            console.error("Error generating payroll:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateStatus: async (id, status) => {
        try {
            const response = await api.put(`/payroll/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error("Error updating payroll status:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deletePayroll: async (id) => {
        try {
            const response = await api.delete(`/payroll/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting payroll:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getMySalary: async () => {
        try {
            const response = await api.get('/payroll/my');
            return response.data;
        } catch (error) {
            console.error("Error fetching my salary:", error);
            throw error.response ? error.response.data : error;
        }
    }
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
    },
    getItemBarcodes: async (id) => {
        try {
            const response = await api.get(`/items/${id}/barcodes`);
            return response.data;
        } catch (error) {
            console.error("Error fetching item barcodes:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getUsedCategories: async (params) => {
        try {
            const response = await api.get('/items/used-categories', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching used categories:", error);
            throw error.response ? error.response.data : error;
        }
    },
    bulkUploadItems: async (formData) => {
        try {
            const response = await api.post('/items/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error("Error during bulk upload:", error);
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
    },
    adjustInventory: async (payload) => {
        try {
            const response = await api.post('/inventory/adjust', payload);
            return response.data;
        } catch (error) {
            console.error("Error adjusting inventory:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const tableService = {
    getTables: async (params = {}) => {
        try {
            const response = await api.get('/dining/tables', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching tables:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getTablesByCategory: async (categoryId, params = {}) => {
        try {
            const response = await api.get(`/dining/tables/by-category/${categoryId}`, { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching tables by category:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createTable: async (payload) => {
        try {
            const response = await api.post('/dining/tables', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating table:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateTable: async (id, payload) => {
        try {
            const response = await api.put(`/dining/tables/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating table:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteTable: async (id) => {
        try {
            const response = await api.delete(`/dining/tables/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting table:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const orderService = {
    createOrder: async (payload) => {
        try {
            const response = await api.post('/orders', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating order:", error);
            throw error.response ? error.response.data : error;
        }
    },
    addPayment: async (orderId, payload) => {
        try {
            const response = await api.post(`/orders/${orderId}/pay`, payload);
            return response.data;
        } catch (error) {
            console.error("Error adding order payment:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateOrder: async (orderId, payload) => {
        try {
            const response = await api.put(`/orders/${orderId}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating order:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getOrders: async (params = {}) => {
        try {
            const response = await api.get('/orders', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching orders:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getOrderById: async (id) => {
        try {
            const response = await api.get(`/orders/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching order:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateStatus: async (id, payload) => {
        try {
            const response = await api.put(`/orders/${id}/status`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating order status:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createOrderReturn: async (payload) => {
        try {
            const response = await api.post('/orders/returns', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating order return:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getOrderReturns: async (params = {}) => {
        try {
            const response = await api.get('/orders/returns', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching order returns:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const tableMergeService = {
    mergeTables: async (payload) => {
        try {
            const response = await api.post('/dining/tables/merge', payload);
            return response.data;
        } catch (error) {
            console.error("Error merging tables:", error);
            throw error.response ? error.response.data : error;
        }
    },
    unmergeTables: async (payload) => {
        try {
            const response = await api.post('/dining/tables/unmerge', payload);
            return response.data;
        } catch (error) {
            console.error("Error unmerging tables:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const diningCategoryService = {
    getCategories: async (params = {}) => {
        try {
            const response = await api.get('/dining/categories', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching dining categories:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createCategory: async (payload) => {
        try {
            const response = await api.post('/dining/categories', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating dining category:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateCategory: async (id, payload) => {
        try {
            const response = await api.put(`/dining/categories/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating dining category:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteCategory: async (id) => {
        try {
            const response = await api.delete(`/dining/categories/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting dining category:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const offerService = {
    getOffers: async (params = {}) => {
        try {
            const response = await api.get('/offers', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching offers:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getOfferById: async (id) => {
        try {
            const response = await api.get(`/offers/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching offer:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createOffer: async (payload) => {
        try {
            const response = await api.post('/offers', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating offer:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateOffer: async (id, payload) => {
        try {
            const response = await api.put(`/offers/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating offer:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteOffer: async (id) => {
        try {
            const response = await api.delete(`/offers/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting offer:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const dashboardService = {
    getShopDashboard: async (shopId) => {
        try {
            const response = await api.get(`/dashboard/shop/${shopId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching shop dashboard:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPayInList: async (shopId) => {
        try {
            const response = await api.get(`/dashboard/shop/${shopId}/pay-in`);
            return response.data;
        } catch (error) {
            console.error("Error fetching pay in list:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPayInHistory: async (shopId) => {
        try {
            const response = await api.get(`/dashboard/shop/${shopId}/pay-in/history`);
            return response.data;
        } catch (error) {
            console.error("Error fetching pay in history:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPayOutList: async (shopId) => {
        try {
            const response = await api.get(`/dashboard/shop/${shopId}/pay-out`);
            return response.data;
        } catch (error) {
            console.error("Error fetching pay out list:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPayOutHistory: async (shopId) => {
        try {
            const response = await api.get(`/dashboard/shop/${shopId}/pay-out/history`);
            return response.data;
        } catch (error) {
            console.error("Error fetching pay out history:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getProfitTimeline: async (shopId, branchId, days = 30) => {
        try {
            const response = await api.get(`/dashboard/shop/${shopId}/${branchId}/profit-timeline`, {
                params: { days }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching profit timeline:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const attendanceService = {
    // Policies
    getPolicies: async (params = {}) => {
        try {
            const response = await api.get('/attendance/policies', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching attendance policies:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createPolicy: async (payload) => {
        try {
            const response = await api.post('/attendance/policies', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating attendance policy:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updatePolicy: async (id, payload) => {
        try {
            const response = await api.put(`/attendance/policies/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating attendance policy:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updatePolicyStatus: async (id, status) => {
        try {
            const response = await api.patch(`/attendance/policies/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error("Error updating attendance policy status:", error);
            throw error.response ? error.response.data : error;
        }
    },

    // Assignments
    getAssignments: async (params = {}) => {
        try {
            const response = await api.get('/attendance/assignments', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching attendance assignments:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createAssignment: async (payload) => {
        try {
            const response = await api.post('/attendance/assignments', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating attendance assignment:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteAssignment: async (id) => {
        try {
            const response = await api.delete(`/attendance/assignments/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting attendance assignment:", error);
            throw error.response ? error.response.data : error;
        }
    },

    // Logs / Punching
    checkIn: async (payload) => {
        try {
            const response = await api.post('/attendance/logs/check-in', payload);
            return response.data;
        } catch (error) {
            console.error("Error attendance check-in:", error);
            throw error.response ? error.response.data : error;
        }
    },
    checkOut: async (payload) => {
        try {
            const response = await api.post('/attendance/logs/check-out', payload);
            return response.data;
        } catch (error) {
            console.error("Error attendance check-out:", error);
            throw error.response ? error.response.data : error;
        }
    },
    addEvent: async (payload) => {
        try {
            const response = await api.post('/attendance/logs/event', payload);
            return response.data;
        } catch (error) {
            console.error("Error adding attendance event:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getLogs: async (params = {}) => {
        try {
            const response = await api.get('/attendance/logs', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching attendance logs:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateLog: async (id, payload) => {
        try {
            const response = await api.put(`/attendance/logs/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating attendance log:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getMyLogs: async (params = {}) => {
        try {
            const response = await api.get('/attendance/logs/my-logs', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching my attendance logs:", error);
            throw error.response ? error.response.data : error;
        }
    },
    requestCorrection: async (id, reason) => {
        try {
            const response = await api.post(`/attendance/logs/${id}/request-correction`, { reason });
            return response.data;
        } catch (error) {
            console.error("Error requesting attendance correction:", error);
            throw error.response ? error.response.data : error;
        }
    },
    approveCorrection: async (id, payload) => {
        try {
            const response = await api.post(`/attendance/logs/${id}/approve-correction`, payload);
            return response.data;
        } catch (error) {
            console.error("Error approving attendance correction:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const reportsService = {
    getSalesReport: async (params = {}) => {
        try {
            const response = await api.get('/reports/sales', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching sales report:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getExpensesReport: async (params = {}) => {
        try {
            const response = await api.get('/reports/expenses', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching expenses report:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPerformanceReport: async (params = {}) => {
        try {
            const response = await api.get('/employees/performance-report', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching performance report:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getCustomerReport: async (params = {}) => {
        try {
            const response = await api.get('/reports/customers', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching customer report:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getSupplierReport: async (params = {}) => {
        try {
            const response = await api.get('/reports/suppliers', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching supplier report:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPartyStatement: async (params = {}) => {
        try {
            const response = await api.get('/reports/party-statement', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching party statement:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getPartyItems: async (params = {}) => {
        try {
            const response = await api.get('/reports/party-items', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching party items:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export default api;
export const taxService = {
    getTaxes: async (params = {}) => {
        try {
            const response = await api.get('/taxes', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching taxes:", error);
            throw error.response ? error.response.data : error;
        }
    },
    createTax: async (payload) => {
        try {
            const response = await api.post('/taxes', payload);
            return response.data;
        } catch (error) {
            console.error("Error creating tax:", error);
            throw error.response ? error.response.data : error;
        }
    },
    updateTax: async (id, payload) => {
        try {
            const response = await api.put(`/taxes/${id}`, payload);
            return response.data;
        } catch (error) {
            console.error("Error updating tax:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteTax: async (id) => {
        try {
            const response = await api.delete(`/taxes/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting tax:", error);
            throw error.response ? error.response.data : error;
        }
    }
};

export const leaveService = {
    applyLeave: async (payload) => {
        try {
            const response = await api.post('/leaves/apply', payload);
            return response.data;
        } catch (error) {
            console.error("Error applying leave:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getMyLeaves: async () => {
        try {
            const response = await api.get('/leaves/my');
            return response.data;
        } catch (error) {
            console.error("Error fetching my leaves:", error);
            throw error.response ? error.response.data : error;
        }
    },
    getAllLeaves: async (params = {}) => {
        try {
            const response = await api.get('/leaves/all', { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching all leaves:", error);
            throw error.response ? error.response.data : error;
        }
    },
    reviewLeave: async (leaveId, payload) => {
        try {
            const response = await api.put(`/leaves/${leaveId}/review`, payload);
            return response.data;
        } catch (error) {
            console.error("Error reviewing leave:", error);
            throw error.response ? error.response.data : error;
        }
    },
    deleteLeave: async (leaveId) => {
        try {
            const response = await api.delete(`/leaves/${leaveId}`);
            return response.data;
        } catch (error) {
            console.error("Error deleting leave:", error);
            throw error.response ? error.response.data : error;
        }
    }
};
