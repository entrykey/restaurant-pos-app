/**
 * RBAC: MODULE -> RESOURCE -> ACTION (dynamic actions from backend)
 * Permission key = "module.resource.action"
 * Backend can send any actions (view, create, edit, delete, approve, export, manage, etc.)
 */

/** Default CRUD-style actions; backend can add more (approve, export, manage, etc.) */
export const DEFAULT_ACTIONS = Object.freeze({
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
});

/** Legacy alias for code that still references ACTIONS */
export const ACTIONS = DEFAULT_ACTIONS;

export const DEFAULT_ACTION_LIST = Object.values(DEFAULT_ACTIONS);

/**
 * All app modules (align with sidebar / routes).
 * Backend: use these exact module keys.
 */
export const MODULES = Object.freeze({
  ORGANIZATION: "organization",
  POS: "pos",
  ORDERS: "orders",
  KDS: "kds",
  RESERVATIONS: "reservation",
  TABLE_MANAGEMENT: "TABLE_MANAGEMENT",
  INVENTORY: "inventory",
  REPORTS: "reports",
  SETTINGS: "settings",
  STAFF: "staff",
  SERVICE: "service",
  SUPPLIER: "supplier",
  PARTIES: "PARTIES",
  PURCHASE: "purchase",
  BUSINESS_TYPES: "business_types",
  SHOP_MANAGEMENT: "shop_management",
  PLAN_MANAGEMENT: "plan_management",
  SUBSCRIPTION_MANAGEMENT: "subscription_management",
  OFFER_MANAGEMENT: "OFFER_MANAGEMENT",
});

/**
 * Resources per module. Backend can extend; UI uses this for structure.
 */
export const MODULE_RESOURCES = Object.freeze({
  [MODULES.ORGANIZATION]: ["organization", "branch"],
  [MODULES.POS]: ["pos", "dining", "takeaway", "direct_sale", "wholesale", "order", "onlineorder"],
  [MODULES.ORDERS]: ["online_orders"],
  [MODULES.KDS]: ["kds"],
  [MODULES.RESERVATIONS]: ["reservation"],
  [MODULES.INVENTORY]: ["inventory", "menu", "tradeitem"],
  [MODULES.REPORTS]: ["report"],
  [MODULES.SETTINGS]: ["settings", "inventory_settings"],
  [MODULES.STAFF]: ["staff"],
  [MODULES.SERVICE]: ["service", "jobcard"],
  [MODULES.SUPPLIER]: ["supplier"],
  [MODULES.PARTIES]: ["supplier", "customer"],
  [MODULES.PURCHASE]: ["purchase"],
  [MODULES.BUSINESS_TYPES]: ["business_type"],
  [MODULES.SHOP_MANAGEMENT]: ["shop"],
  [MODULES.PLAN_MANAGEMENT]: ["plan"],
  [MODULES.SUBSCRIPTION_MANAGEMENT]: ["subscription"],
  [MODULES.TABLE_MANAGEMENT]: ["TABLE", "DININGCATEGORY"],
  [MODULES.OFFER_MANAGEMENT]: ["OFFER"],
});

/**
 * Builds permission key. Actions are dynamic (any string from backend).
 * @returns e.g. "organization.branch.create", "pos.order.apply_discount"
 */
export function buildPermissionKey(module, resource, action) {
  return `${module}.${resource}.${action}`;
}

/**
 * All permission keys for a module (for a given action list).
 * If actions not provided, uses DEFAULT_ACTION_LIST. Backend can send custom actions.
 */
export function getModulePermissionKeys(moduleName, actions = DEFAULT_ACTION_LIST) {
  const resources = MODULE_RESOURCES[moduleName];
  if (!resources) return [];
  const keys = [];
  for (const resource of resources) {
    for (const action of actions) {
      keys.push(buildPermissionKey(moduleName, resource, action));
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Route/section access: one permission per sidebar item and page guard.
// Use hasPermissionFor(module, resource, action) with these values.
// ---------------------------------------------------------------------------
export const ROUTE_ACCESS = Object.freeze({
  DINING: { module: MODULES.POS, resource: "dining", action: "view" },
  DIRECT_SALE: { module: MODULES.POS, resource: "direct_sale", action: "view" },
  WHOLESALE: { module: MODULES.POS, resource: "wholesale", action: "view" },
  ONLINE_ORDERS: { module: MODULES.POS, resource: "onlineorder", action: "view" },
  KDS: { module: MODULES.KDS, resource: "kds", action: "view" },
  TAKEAWAY: { module: MODULES.POS, resource: "dining", action: "takeaway" },
  RESERVATIONS: { module: MODULES.RESERVATIONS, resource: "reservation", action: "viewing" },
  INVENTORY: { module: MODULES.INVENTORY, resource: "inventory", action: "view" },
  REPORTS: { module: MODULES.REPORTS, resource: "report", action: "VIEW.REPORTS" },
  SETTINGS: { module: MODULES.SETTINGS, resource: "settings", action: "view" },
  STAFF: { module: MODULES.STAFF, resource: "staff", action: "view" },
  STAFF_DASHBOARD: { module: MODULES.STAFF, resource: "staff", action: "dashboard" },
  SERVICE: { module: MODULES.SERVICE, resource: "service", action: "view" },
  SUPPLIERS: { module: MODULES.SUPPLIER, resource: "supplier", action: "view" },
  PARTIES: { module: MODULES.PARTIES, resource: "supplier", action: "view" }, // any PARTIES permission grants access
  PURCHASES: { module: MODULES.PURCHASE, resource: "purchase", action: "view" },
  BUSINESS_TYPES: { module: MODULES.BUSINESS_TYPES, resource: "business_type", action: "view" },
  SHOP_MANAGEMENT: { module: MODULES.SHOP_MANAGEMENT, resource: "shop", action: "view" },
  PLAN_MANAGEMENT: { module: MODULES.PLAN_MANAGEMENT, resource: "plan", action: "view" },
  SUBSCRIPTION_MANAGEMENT: { module: MODULES.SUBSCRIPTION_MANAGEMENT, resource: "subscription", action: "view" },
  TABLE_MANAGEMENT: { module: MODULES.TABLE_MANAGEMENT, resource: "TABLE", action: "VIEWING" },
  ORGANIZATION: { module: MODULES.ORGANIZATION, resource: "organization", action: "view" },
  OFFERS: { module: MODULES.OFFER_MANAGEMENT, resource: "OFFER", action: "view" },
  ATTENDANCE_POLICIES: { module: MODULES.STAFF, resource: "ATTENDANCE", action: "POLICIES" },
  ATTENDANCE_LOGS: { module: MODULES.STAFF, resource: "ATTENDANCE", action: "LOGS" },
  PAYROLL_SETTINGS: { module: MODULES.SETTINGS, resource: "PAYROLL", action: "SETTINGS" },
});

/** Optional: page-level "manage" for sections that have edit/delete (e.g. staff.staff.manage) */
export const ROUTE_ACCESS_MANAGE = Object.freeze({
  ONLINE_ORDERS: { module: MODULES.ORDERS, resource: "online_orders", action: "manage" },
  RESERVATIONS: { module: MODULES.RESERVATIONS, resource: "reservation", action: "creating" },
  INVENTORY: { module: MODULES.INVENTORY, resource: "inventory", action: "manage" },
  SETTINGS: { module: MODULES.SETTINGS, resource: "settings", action: "manage" },
  STAFF: { module: MODULES.STAFF, resource: "staff", action: "manage" },
  SERVICE: { module: MODULES.SERVICE, resource: "service", action: "manage" },
  PURCHASES: { module: MODULES.PURCHASE, resource: "purchase", action: "manage" },
  BUSINESS_TYPES: { module: MODULES.BUSINESS_TYPES, resource: "business_type", action: "manage" },
  SHOP_MANAGEMENT: { module: MODULES.SHOP_MANAGEMENT, resource: "shop", action: "manage" },
  KDS: { module: MODULES.KDS, resource: "kds", action: "manage" },
  TABLE_MANAGEMENT: { module: MODULES.TABLE_MANAGEMENT, resource: "TABLE", action: "EDITING" },
});

/**
 * Helper: can user access this route? (view permission)
 */
export function getRoutePermissionKey(routeKey) {
  const r = ROUTE_ACCESS[routeKey];
  return r ? buildPermissionKey(r.module, r.resource, r.action) : null;
}

// ---------------------------------------------------------------------------
// Organization module keys (backend reference)
// ---------------------------------------------------------------------------
export const ORGANIZATION_PERMISSION_KEYS = Object.freeze({
  VIEW_ORGANIZATION: buildPermissionKey(MODULES.ORGANIZATION, "organization", DEFAULT_ACTIONS.VIEW),
  CREATE_ORGANIZATION: buildPermissionKey(MODULES.ORGANIZATION, "organization", DEFAULT_ACTIONS.CREATE),
  EDIT_ORGANIZATION: buildPermissionKey(MODULES.ORGANIZATION, "organization", DEFAULT_ACTIONS.EDIT),
  DELETE_ORGANIZATION: buildPermissionKey(MODULES.ORGANIZATION, "organization", DEFAULT_ACTIONS.DELETE),
  VIEW_BRANCH: buildPermissionKey(MODULES.ORGANIZATION, "branch", DEFAULT_ACTIONS.VIEW),
  CREATE_BRANCH: buildPermissionKey(MODULES.ORGANIZATION, "branch", DEFAULT_ACTIONS.CREATE),
  EDIT_BRANCH: buildPermissionKey(MODULES.ORGANIZATION, "branch", DEFAULT_ACTIONS.EDIT),
  DELETE_BRANCH: buildPermissionKey(MODULES.ORGANIZATION, "branch", DEFAULT_ACTIONS.DELETE),
});

export const ORGANIZATION_PERMISSION_KEYS_LIST = Object.values(ORGANIZATION_PERMISSION_KEYS);

/**
 * Extra actions (non-CRUD) - managed dynamically; backend can add more.
 */
export const EXTRA_ACTIONS = Object.freeze({
  MANAGE: "manage",
  PROCESS_PAYMENT: "process_payment",
  APPLY_DISCOUNT: "apply_discount",
});

/**
 * All permission keys used in the app with human-readable labels.
 * Used by role editor and for seeding. Backend can extend actions and send same keys.
 */
function buildPermissionsWithLabels() {
  const r = (module, resource, action, label) => [buildPermissionKey(module, resource, action), label];
  const list = [
    ...Object.entries(ROUTE_ACCESS).map(([routeKey, { module, resource, action }]) => {
      const labels = {
        DINING: "Dining Hall",
        TAKEAWAY: "Takeaway",
        JOINTABLES: "Join Tables",
        DIRECT_SALE: "Direct Sale",
        WHOLESALE: "Wholesale",
        ONLINE_ORDERS: "View Online Orders",
        KDS: "View KDS",
        RESERVATIONS: "View Reservations",
        INVENTORY: "View Inventory",
        REPORTS: "View Reports",
        SETTINGS: "View Settings",
        STAFF: "View Staff",
        STAFF_DASHBOARD: "View Staff Dashboard",
        ORGANIZATION: "View Organization",
        SERVICE: "View Service",
        PURCHASES: "View Purchases",
      };
      return r(module, resource, action, labels[routeKey] || `${resource} ${action}`);
    }),
    r(MODULES.POS, "order", EXTRA_ACTIONS.PROCESS_PAYMENT, "Process Payments"),
    r(MODULES.POS, "dining", "jointables", "Join Tables"),
    r(MODULES.ORDERS, "ORDERS", "PROCESSPAYMENT", "Process Payments (Orders)"),
    r(MODULES.ORDERS, "ORDERS", "KOS", "Send to KOT"),
    r(MODULES.POS, "order", EXTRA_ACTIONS.APPLY_DISCOUNT, "Apply Discounts"),
    r(MODULES.ORDERS, "online_orders", "manage", "Manage Online Orders"),
    r(MODULES.RESERVATIONS, "reservation", "manage", "Manage Reservations"),
    r(MODULES.RESERVATIONS, "reservation", "creating", "Create Reservations"),
    r(MODULES.INVENTORY, "inventory", "manage", "Manage Inventory"),
    r(MODULES.SETTINGS, "settings", "manage", "Manage Settings"),
    r(MODULES.SETTINGS, "settings", "appearence_settings", "Appearance Settings"),
    r(MODULES.STAFF, "staff", "manage", "Manage Staff & Roles"),
    r(MODULES.SERVICE, "service", "manage", "Manage Service"),
    r(MODULES.SUPPLIER, "supplier", "manage", "Manage Suppliers"),
    r(MODULES.PURCHASE, "purchase", "manage", "Manage Purchases"),
    r(MODULES.BUSINESS_TYPES, "business_type", "manage", "Manage Business Types"),
    r(MODULES.SHOP_MANAGEMENT, "shop", "manage", "Manage Shops"),
    ...ORGANIZATION_PERMISSION_KEYS_LIST.map((k) => {
      const [, resource, action] = k.split(".");
      const resLabel = resource === "branch" ? "Branch" : "Organization";
      const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
      return [k, `${actionLabel} ${resLabel}`];
    }),
  ];
  return Object.fromEntries(list);
}

export const PERMISSIONS_WITH_LABELS = buildPermissionsWithLabels();
export const ALL_PERMISSION_KEYS_LIST = Object.keys(PERMISSIONS_WITH_LABELS);
