/**
 * Backend permission (action) IDs. Align with API permissions response.
 * Structure: user.permissions[moduleId] = [permissionId, ...]
 * Add new permission IDs here when they exist in DB.
 */

// Organization module
export const ORGANIZATION_VIEW = "6995c3942e3c2c5ce06a6fb3";
export const ORGANIZATION_CREATE = "6995c4002e3c2c5ce06a6fb6";
export const ORGANIZATION_EDIT = "6995c4232e3c2c5ce06a6fb9";
export const ORGANIZATION_DELETE = "6995c4412e3c2c5ce06a6fbc";
export const BRANCH_VIEW = "6995c4722e3c2c5ce06a6fbf";
export const BRANCH_CREATE = "6995c47e2e3c2c5ce06a6fc2";
export const BRANCH_EDIT = "6995c4882e3c2c5ce06a6fc5";
export const BRANCH_DELETE = "6995c4a42e3c2c5ce06a6fc8";

// Staff module
export const STAFF_VIEW = "6995ca7b2e3c2c5ce06a6fcb";
export const STAFF_CREATE = "6995ca8b2e3c2c5ce06a6fce";
export const STAFF_EDIT = "6995caef2e3c2c5ce06a6fd1";
export const STAFF_DELETE = "6995d3222e3c2c5ce06a6fd8";

// Supplier module
export const SUPPLIER_VIEW = "6996c19afa5b2233a1d0f9e1";
export const SUPPLIER_CREATE = "6996c1b3fa5b2233a1d0f9e4";
export const SUPPLIER_EDIT = "6996c1c8fa5b2233a1d0f9e7";
export const SUPPLIER_DELETE = "6996c1dbfa5b2233a1d0f9ea";

// Inventory module
export const INVENTORY_VIEW = "69980cbc8bdc0655b6cac9da";
export const INVENTORY_CREATE = "69980cd28bdc0655b6cac9dd";
export const INVENTORY_EDIT = "69980ce08bdc0655b6cac9e0";
export const INVENTORY_DELETE = "69980c8a8bdc0655b6cac9d6";

// Menu (within Inventory module)
export const MENU_VIEW = "699af34ef6f6f08e99157354";
export const MENU_CREATE = "699af358f6f6f08e99157357";
export const MENU_EDIT = "699af337f6f6f08e99157351";
export const MENU_DELETE = "699af328f6f6f08e9915734e";

// Settings module 
export const SETTINGS_INVENTORY_SETTINGS = "6997f4fa8869b52cb74bbf76";

// Purchase module
export const PURCHASE_VIEW = "699be2c8769dc90f5fc1e9ac";
export const PURCHASE_CREATE = "699be2ce769dc90f5fc1e9af";
export const PURCHASE_EDIT = "699be2d1769dc90f5fc1e9b2";
export const PURCHASE_DELETE = "699be2d5769dc90f5fc1e9b5";

/** Single object for use in components: ACTIONS.ORGANIZATION_VIEW, etc. */
export const ACTIONS = Object.freeze({
  ORGANIZATION_VIEW,
  ORGANIZATION_CREATE,
  ORGANIZATION_EDIT,
  ORGANIZATION_DELETE,
  BRANCH_VIEW,
  BRANCH_CREATE,
  BRANCH_EDIT,
  BRANCH_DELETE,
  STAFF_VIEW,
  STAFF_CREATE,
  STAFF_EDIT,
  STAFF_DELETE,
  SUPPLIER_VIEW,
  SUPPLIER_CREATE,
  SUPPLIER_EDIT,
  SUPPLIER_DELETE,
  INVENTORY_VIEW,
  INVENTORY_CREATE,
  INVENTORY_EDIT,
  INVENTORY_DELETE,
  MENU_VIEW,
  MENU_CREATE,
  MENU_EDIT,
  MENU_DELETE,
  SETTINGS_INVENTORY_SETTINGS,
  PURCHASE_VIEW,
  PURCHASE_CREATE,
  PURCHASE_EDIT,
  PURCHASE_DELETE,
});
