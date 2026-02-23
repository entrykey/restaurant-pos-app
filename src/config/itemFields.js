// Only fields from backend item.model.js - all other attributes are dynamic based on business type/subtype
export const ALL_FIELDS = {
    // --- Core Fields (from item.model.js) ---
    item_code: { key: "itemCode", label: "Item Code", type: "text", required: true, section: "Common" },
    barcode: { key: "barcode", label: "Barcode", type: "text", section: "Common" },
    name: { key: "name", label: "Item Name", type: "text", required: true, section: "Common" },
    description: { key: "description", label: "Description", type: "textarea", section: "Common" },

    // References (IDs) - these should be select dropdowns populated from API
    category_id: { key: "categoryId", label: "Category", type: "select", section: "Common" }, // Will be populated dynamically
    brand_id: { key: "brandId", label: "Brand", type: "select", section: "Common" }, // Will be populated dynamically
    supplier_id: { key: "supplierId", label: "Supplier", type: "select", section: "Common" }, // Will be populated dynamically
    unit_id: { key: "unitId", label: "Unit", type: "select", required: true, section: "Common" }, // Will be populated dynamically

    item_type: {
        key: "itemType",
        label: "Item Type",
        type: "select",
        options: ["STOCK", "SERVICE", "MANUFACTURED"],
        defaultValue: "STOCK",
        required: true,
        section: "Common"
    },

    // Pricing
    purchase_price: { key: "purchasePrice", label: "Purchase Price", type: "number", section: "Pricing" },
    selling_price: { key: "sellingPrice", label: "Selling Price", type: "number", section: "Pricing" },
    mrp: { key: "mrp", label: "MRP", type: "number", section: "Pricing" },

    // Tax
    tax_id: { key: "taxId", label: "Tax", type: "select", section: "Tax" }, // Will be populated dynamically
    hsn_sac_code: { key: "hsnSacCode", label: "HSN / SAC Code", type: "text", section: "Tax" },

    // Stock Settings
    stock_applicable: { key: "stockApplicable", label: "Stock Applicable", type: "boolean", defaultValue: true, section: "Stock" },
    min_stock_alert: { key: "minStockAlert", label: "Min Stock Alert", type: "number", section: "Stock" },
    allow_negative_stock: { key: "allowNegativeStock", label: "Allow Negative Stock", type: "boolean", defaultValue: false, section: "Stock" },

    // Tracking
    batch_tracking: { key: "batchTracking", label: "Batch Tracking", type: "boolean", defaultValue: false, section: "Tracking" },
    expiry_tracking: { key: "expiryTracking", label: "Expiry Tracking", type: "boolean", defaultValue: false, section: "Tracking" },
    serial_tracking: { key: "serialTracking", label: "Serial Tracking", type: "boolean", defaultValue: false, section: "Tracking" },

    // Status
    status: {
        key: "status",
        label: "Status",
        type: "select",
        options: ["ACTIVE", "INACTIVE"],
        defaultValue: "ACTIVE",
        section: "Common"
    },
};

// Helper to get common/core field keys (always visible)
export const getCommonFieldKeys = () => {
    return Object.keys(ALL_FIELDS);
};
