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
  PARTIES: "PARTIES", // Module for Suppliers + Customers (backend key)
  PURCHASE: "purchase",

  // Superadmin Only Modules
  BUSINESS_TYPES: "business_types",
  SHOP_MANAGEMENT: "shop_management",
  PLAN_MANAGEMENT: "plan_management",
  SUBSCRIPTION_MANAGEMENT: "subscription_management",
  TABLE_MANAGEMENT: "TABLE_MANAGEMENT",
  OFFER_MANAGEMENT: "OFFER_MANAGEMENT",
  DASHBOARD: "DASHBOARD",
  CLIENT_MANAGEMENT: "client_management",
  MYATTENDANCE: "MYATTENDANCE",
  MYLEAVES: "MYLEAVES",
  MYSALARY: "MYSALARY",
  EMPLOYEESALARY: "EMPLOYEESALARY",
  SALE_MARKING: "SALE MARKING",
  SALES_HISTORY: "SALES HISTORY",
  PAY_IN: "pay in",
  PAY_OUT: "pay out",
});
