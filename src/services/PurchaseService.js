import api from './api';

export const PurchaseService = {
    // ── Purchase Invoices ───────────────────────────────────────────────────
    getPurchases: async (params) => {
        const response = await api.get('/purchases', { params });
        return response.data;
    },

    getPurchaseById: async (id) => {
        const response = await api.get(`/purchases/${id}`);
        return response.data;
    },

    createPurchase: async (data) => {
        const response = await api.post('/purchases', data);
        return response.data;
    },

    updatePurchase: async (id, data) => {
        const response = await api.put(`/purchases/${id}`, data);
        return response.data;
    },

    deletePurchase: async (id) => {
        const response = await api.delete(`/purchases/${id}`);
        return response.data;
    },

    confirmPurchase: async (id) => {
        const response = await api.post(`/purchases/${id}/confirm`);
        return response.data;
    },

    cancelPurchase: async (id) => {
        const response = await api.post(`/purchases/${id}/cancel`);
        return response.data;
    },

    addPayment: async (data) => {
        const response = await api.post(`/purchases/${data.purchaseId}/pay`, data);
        return response.data;
    },

    scanInvoice: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/purchases/scan', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    createPurchaseReturn: async (data) => {
        const response = await api.post('/purchases/returns', data);
        return response.data;
    },

    getPurchaseReturns: async (params) => {
        const response = await api.get('/purchases/returns', { params });
        return response.data;
    },

    // ── 🆕 Purchase Orders (PO) ─────────────────────────────────────────────
    getPurchaseOrders: async (params) => {
        const response = await api.get('/purchases/orders', { params });
        return response.data;
    },

    getPurchaseOrderById: async (id) => {
        const response = await api.get(`/purchases/orders/${id}`);
        return response.data;
    },

    getSupplierProductsOverview: async (params) => {
        const response = await api.get('/purchases/orders/supplier-products', { params });
        return response.data;
    },

    createPurchaseOrder: async (data) => {
        const response = await api.post('/purchases/orders', data);
        return response.data;
    },

    updatePurchaseOrder: async (id, data) => {
        const response = await api.put(`/purchases/orders/${id}`, data);
        return response.data;
    },

    updatePOStatus: async (id, status) => {
        const response = await api.patch(`/purchases/orders/${id}/status`, { status });
        return response.data;
    },

    deletePurchaseOrder: async (id) => {
        const response = await api.delete(`/purchases/orders/${id}`);
        return response.data;
    },

    // ── 🆕 Goods Receipts (GRN) ──────────────────────────────────────────────
    getGoodsReceipts: async (params) => {
        const response = await api.get('/purchases/receipts', { params });
        return response.data;
    },

    createGoodsReceipt: async (data) => {
        const response = await api.post('/purchases/receipts', data);
        return response.data;
    },

    convertReceiptToInvoice: async (id) => {
        const response = await api.post(`/purchases/receipts/${id}/convert`);
        return response.data;
    }
};
