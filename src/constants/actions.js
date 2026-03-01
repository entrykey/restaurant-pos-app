/**
 * Backend permission (action) IDs. Align with API permissions response.
 * Structure: user.permissions[moduleId] = [permissionId, ...]
 * Add new permission IDs here when they exist in DB.
 */

// Organization module
export const ORGANIZATION_VIEW = "organization.view";
export const ORGANIZATION_CREATE = "organization.create";
export const ORGANIZATION_EDIT = "organization.edit";
export const ORGANIZATION_DELETE = "organization.delete";
export const BRANCH_VIEW = "branch.view";
export const BRANCH_CREATE = "branch.create";
export const BRANCH_EDIT = "branch.edit";
export const BRANCH_DELETE = "branch.delete";

// Staff module
export const STAFF_VIEW = "staff.view";
export const STAFF_CREATE = "staff.create";
export const STAFF_EDIT = "staff.edit";
export const STAFF_DELETE = "staff.delete";

// Supplier module
export const SUPPLIER_VIEW = "supplier.view";
export const SUPPLIER_CREATE = "supplier.create";
export const SUPPLIER_EDIT = "supplier.edit";
export const SUPPLIER_DELETE = "supplier.delete";

// Inventory module
export const INVENTORY_VIEW = "inventory.view";
export const INVENTORY_CREATE = "inventory.create";
export const INVENTORY_EDIT = "inventory.edit";
export const INVENTORY_DELETE = "inventory.delete";

// Menu (within Inventory module)
export const MENU_VIEW = "menu.view";
export const MENU_CREATE = "menu.create";
export const MENU_EDIT = "menu.edit";
export const MENU_DELETE = "menu.delete";

// Settings module 
export const SETTINGS_INVENTORY_SETTINGS = "settings.inventory_settings";

// Purchase module
export const PURCHASE_VIEW = "purchase.view";
export const PURCHASE_CREATE = "purchase.create";
export const PURCHASE_EDIT = "purchase.edit";
export const PURCHASE_DELETE = "purchase.delete";

// Table Management module
export const TABLE_VIEWING = "TABLE.VIEWING";

// Reservations module
export const RESERVATION_VIEWING = "RESERVATION.VIEWING";

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
  TABLE_VIEWING,
  RESERVATION_VIEWING,
});
