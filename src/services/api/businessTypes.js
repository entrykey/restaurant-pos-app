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

    // --- Default Roles (per business type / subtype) ---
    getDefaultRoles: (params) => api.get('/business-type-default-roles', { params }),
    getMergedDefaultRoles: (businessType, subType) => api.get('/business-type-default-roles', {
        params: { businessType, subType, merged: 'true' },
    }),
    getDefaultRoleAllowedPermissions: (params) => api.get('/business-type-default-roles/allowed-permissions', { params }),
    createDefaultRole: (data) => api.post('/business-type-default-roles', data),
    updateDefaultRole: (id, data) => api.put(`/business-type-default-roles/${id}`, data),
    deleteDefaultRole: (id) => api.delete(`/business-type-default-roles/${id}`),
};
