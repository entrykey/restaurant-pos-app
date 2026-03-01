/**
 * Backend module IDs. Align with API /modules response.
 * Add new modules here when they exist in DB.
 */
export const MODULES = Object.freeze({
  ORGANIZATION: "organization",
  POS: "pos",
  ORDERS: "orders",
  KDS: "kds",
  RESERVATIONS: "reservation",
  INVENTORY: "inventory",
  REPORTS: "reports",
  SETTINGS: "settings",
  STAFF: "staff",
  SERVICE: "service",
  SUPPLIER: "supplier",
  PURCHASE: "purchase",

  // Superadmin Only Modules
  BUSINESS_TYPES: "business_types",
  SHOP_MANAGEMENT: "shop_management",
  PLAN_MANAGEMENT: "plan_management",
  SUBSCRIPTION_MANAGEMENT: "subscription_management",
  TABLE_MANAGEMENT: "TABLE_MANAGEMENT",
});
