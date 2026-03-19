import api from '../api';

export const businessTypesService = {
    // --- Business Types ---
    getBusinessTypes: () => api.get('/business-types'),
    createBusinessType: (data) => api.post('/business-types', data),
    updateBusinessType: (id, data) => api.put(`/business-types/${id}`, data),
    deleteBusinessType: (id) => api.delete(`/business-types/${id}`),
    getBusinessTypeById: (id) => api.get(`/business-types/${id}`),

    // --- Business SubTypes ---
    getBusinessSubTypes: () => api.get('/business-sub-types'),
    createBusinessSubType: (data) => api.post('/business-sub-types', data),
    updateBusinessSubType: (id, data) => api.put(`/business-sub-types/${id}`, data),
    deleteBusinessSubType: (id) => api.delete(`/business-sub-types/${id}`),

    // --- Capabilities ---
    getCapabilities: () => api.get('/business-module-capabilities'),
    getCapabilityBySubtype: (typeId, subtypeId) => api.get(`/business-module-capabilities?businessType=${typeId}&subType=${subtypeId}`),
    bulkUpsertCapabilities: (data) => api.put('/business-module-capabilities', data), // [{ businessType, subType, modules }]
    createCapability: (data) => api.post('/business-module-capabilities', data),
    updateCapability: (id, data) => api.put(`/business-module-capabilities/${id}`, data),
    deleteCapability: (id) => api.delete(`/business-module-capabilities/${id}`),

    // --- Meta ---
    getAllModules: () => api.get('/modules'),
    getAllPermissions: () => api.get('/permissions'),
};
