/**
 * Business type configuration: maps business types/subtypes to enabled modules.
 * Used for multi-tenant / multi-business-type support.
 */

export const BUSINESS_TYPES = Object.freeze({
  RESTAURANT: "restaurant",
  RETAIL: "retail",
  SALON: "salon",
  CAFE: "cafe",
  HOTEL: "hotel",
  PHARMACY: "pharmacy",
});

export const BUSINESS_SUBTYPES = {
  [BUSINESS_TYPES.RESTAURANT]: [
    { id: "fine_dining", name: "Fine Dining" },
    { id: "casual", name: "Casual Dining" },
    { id: "fast_food", name: "Fast Food" },
    { id: "cafe", name: "Cafe" },
    { id: "bar", name: "Bar & Pub" },
  ],
  [BUSINESS_TYPES.RETAIL]: [
    { id: "grocery", name: "Grocery Store" },
    { id: "clothing", name: "Clothing & Fashion" },
    { id: "electronics", name: "Electronics" },
    { id: "general", name: "General Store" },
  ],
  [BUSINESS_TYPES.SALON]: [
    { id: "hair", name: "Hair Salon" },
    { id: "spa", name: "Spa & Wellness" },
    { id: "beauty", name: "Beauty Parlor" },
  ],
  [BUSINESS_TYPES.CAFE]: [
    { id: "coffee", name: "Coffee Shop" },
    { id: "bakery", name: "Bakery & Cafe" },
  ],
  [BUSINESS_TYPES.HOTEL]: [
    { id: "hotel", name: "Hotel" },
    { id: "resort", name: "Resort" },
  ],
  [BUSINESS_TYPES.PHARMACY]: [
    { id: "pharmacy", name: "Pharmacy" },
    { id: "medical", name: "Medical Store" },
  ],
};

/**
 * Module labels for UI display.
 */
export const MODULE_LABELS = {
  DINING: "Dining Hall",
  TAKEAWAY: "Takeaway",
  ONLINE_ORDERS: "Online Orders",
  KDS: "Kitchen Display (KDS)",
  RESERVATIONS: "Reservations",
  INVENTORY: "Inventory / Menu",
  SUPPLIERS: "Suppliers",
  REPORTS: "Reports",
  SETTINGS: "Settings",
  STAFF: "Staff & Roles",
  ORGANIZATION: "Organization",
  SERVICE: "Service & Repairs",
  TABLE_MANAGEMENT: "Table Management",
  OFFERS: "Offers",
};

/**
 * Default Features Configuration per Business Type
 * Mirrors backend schema: inventory, purchase, sales, dining, production, reservation, serialTracking, serviceManagement
 */
export const BUSINESS_FEATURES = {
  [BUSINESS_TYPES.RESTAURANT]: {
    inventory: true,
    purchase: true,
    sales: true,
    dining: true,
    production: true, // Kitchen
    reservation: true,
    serialTracking: false,
    serviceManagement: false
  },
  [BUSINESS_TYPES.RETAIL]: {
    inventory: true,
    purchase: true,
    sales: true,
    dining: false,
    production: false,
    reservation: false,
    serialTracking: true, // Electronics etc
    serviceManagement: false // Unless electronics repair?
  },
  [BUSINESS_TYPES.SALON]: {
    inventory: true, // Products
    purchase: true,
    sales: true,
    dining: false,
    production: false,
    reservation: true, // Appointments
    serialTracking: false,
    serviceManagement: false
  },
  [BUSINESS_TYPES.CAFE]: {
    inventory: true,
    purchase: true,
    sales: true,
    dining: true,
    production: true,
    reservation: false,
    serialTracking: false,
    serviceManagement: false
  },
  [BUSINESS_TYPES.HOTEL]: {
    inventory: true,
    purchase: true,
    sales: true,
    dining: true,
    production: true,
    reservation: true,
    serialTracking: false,
    serviceManagement: false
  },
  [BUSINESS_TYPES.PHARMACY]: {
    inventory: true,
    purchase: true,
    sales: true,
    dining: false,
    production: false,
    reservation: false,
    serialTracking: false, // Batch tracking is simpler, maybe not serial
    serviceManagement: false
  }
};

/**
 * Default enabled modules per business type/subtype.
 * true = enabled, false = disabled
 */
/**
 * Defined Root Modules per Business Type & Subtype.
 * Defines exactly which Sidebar items appear and in what order.
 */
export const BUSINESS_MODULE_STRUCTURE = {
  [BUSINESS_TYPES.RESTAURANT]: {
    fine_dining: [
      "DINING",
      "TAKEAWAY",
      "ONLINE_ORDERS",
      "KDS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
      "SERVICE",
      "OFFERS",
    ],
    casual: [
      "DINING",
      "TAKEAWAY",
      "ONLINE_ORDERS",
      "KDS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
      "OFFERS",
    ],
    fast_food: [
      "TAKEAWAY",
      "KDS",
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    cafe: [
      "DINING",
      "TAKEAWAY",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    bar: [
      "DINING",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
  },
  [BUSINESS_TYPES.RETAIL]: {
    grocery: [
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    clothing: [
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    electronics: [
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
      "SERVICE",
    ],
    general: [
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
      "SERVICE",
    ],
  },
  [BUSINESS_TYPES.SALON]: {
    hair: [
      "RESERVATIONS",
      "ONLINE_ORDERS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    spa: [
      "RESERVATIONS",
      "ONLINE_ORDERS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    beauty: [
      "RESERVATIONS",
      "ONLINE_ORDERS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
  },
  [BUSINESS_TYPES.CAFE]: {
    coffee: [
      "DINING",
      "TAKEAWAY",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    bakery: [
      "DINING",
      "TAKEAWAY",
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
  },
  [BUSINESS_TYPES.HOTEL]: {
    hotel: [
      "RESERVATIONS",
      "DINING",
      "KDS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    resort: [
      "RESERVATIONS",
      "DINING",
      "KDS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
  },
  [BUSINESS_TYPES.PHARMACY]: {
    pharmacy: [
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
    medical: [
      "ONLINE_ORDERS",
      "RESERVATIONS",
      "TABLE_MANAGEMENT",
      "INVENTORY",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "STAFF",
      "ORGANIZATION",
    ],
  },
};


/**
 * Get default enabled modules (map) for a business type/subtype.
 * Backward compatibility: returns { MODULE: true, ... }
 */
export function getDefaultModules(businessType, subtypeId) {
  const list = getModuleList(businessType, subtypeId);
  return list.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
}

/**
 * Get the ordered list of modules for a business type/subtype.
 */
export function getModuleList(businessType, subtypeId) {
  const typeKey = businessType?.toLowerCase();
  const subKey = subtypeId?.toLowerCase();
  return BUSINESS_MODULE_STRUCTURE[typeKey]?.[subKey] || [];
}

/**
 * Get all available module keys (for reference).
 */
export function getAllModules() {
  return Object.keys(MODULE_LABELS);
}
