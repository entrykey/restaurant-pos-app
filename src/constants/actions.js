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
export const STAFF_DASHBOARD = "STAFF.DASHBOARD";
export const ATTENDANCE_POLICIES = "ATTENDANCE.POLICIES";
export const ATTENDANCE_LOGS = "ATTENDANCE.LOGS";

// Supplier module (under PARTIES)
export const SUPPLIER_VIEW = "supplier.view";
export const SUPPLIER_CREATE = "supplier.create";
export const SUPPLIER_EDIT = "supplier.edit";
export const SUPPLIER_DELETE = "supplier.delete";

// Customer module (under PARTIES)
export const CUSTOMER_VIEW = "customer.view";
export const CUSTOMER_CREATE = "customer.create";
export const CUSTOMER_EDIT = "customer.edit";
export const CUSTOMER_DELETE = "customer.delete";

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
export const SETTINGS_APPEARENCE_SETTINGS = "SETTINGS.APPEARENCE_SETTINGS";

// Purchase module
export const PURCHASE_VIEW = "purchase.view";
export const PURCHASE_CREATE = "purchase.create";
export const PURCHASE_EDIT = "purchase.edit";
export const PURCHASE_DELETE = "purchase.delete";

// Table Management module
export const TABLE_VIEWING = "TABLE.VIEWING";

// POS module
export const POS_DINING_TAKEAWAY = "POS.DINING.TAKEAWAY";
export const POS_DINING_JOINTABLES = "POS.DINING.JOINTABLES";

// Reservations module
export const RESERVATION_VIEWING = "RESERVATION.VIEWING";
export const RESERVATION_CREATING = "RESERVATION.CREATING";
export const OFFER_MANAGE = "OFFER.MANAGE";

// Dashboard module
export const OWNER_DASHBOARD = "OWNER.DASHBOARD";

// Reports module
export const REPORTS_VIEW = "VIEW.REPORTS";

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
  STAFF_DASHBOARD,
  SUPPLIER_VIEW,
  SUPPLIER_CREATE,
  SUPPLIER_EDIT,
  SUPPLIER_DELETE,
  CUSTOMER_VIEW,
  CUSTOMER_CREATE,
  CUSTOMER_EDIT,
  CUSTOMER_DELETE,
  INVENTORY_VIEW,
  INVENTORY_CREATE,
  INVENTORY_EDIT,
  INVENTORY_DELETE,
  MENU_VIEW,
  MENU_CREATE,
  MENU_EDIT,
  MENU_DELETE,
  SETTINGS_INVENTORY_SETTINGS,
  SETTINGS_APPEARENCE_SETTINGS,
  PURCHASE_VIEW,
  PURCHASE_CREATE,
  PURCHASE_EDIT,
  PURCHASE_DELETE,
  TABLE_VIEWING,
  RESERVATION_VIEWING,
  OFFER_MANAGE,
  OWNER_DASHBOARD,
  ATTENDANCE_POLICIES,
  ATTENDANCE_LOGS,
  REPORTS_VIEW,
  POS_DINING_TAKEAWAY,
  POS_DINING_JOINTABLES,
  RESERVATION_CREATING,
});
