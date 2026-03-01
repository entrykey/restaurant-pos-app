/**
 * Maps sidebar/route keys to (moduleId, permissionId?) for permission checks.
 * If action is omitted, access is granted when user has any permission in that module.
 */
import { MODULES } from "./modules";
import { ACTIONS } from "./actions";

export const ROUTE_ACCESS = Object.freeze({
  DINING: { module: MODULES.POS, action: 'pos.dining' },
  TAKEAWAY: { module: MODULES.POS, action: 'pos.takeaway' },
  DIRECT_SALE: { module: MODULES.POS, action: 'pos.direct_sale' },
  WHOLESALE: { module: MODULES.POS, action: 'pos.wholesale' },
  ONLINE_ORDERS: { module: MODULES.POS, action: 'pos.onlineorder' },
  KDS: { module: MODULES.KDS },
  RESERVATIONS: { module: MODULES.RESERVATIONS, action: ACTIONS.RESERVATION_VIEWING },
  INVENTORY: { module: MODULES.INVENTORY },
  REPORTS: { module: MODULES.REPORTS },
  SETTINGS: { module: MODULES.SETTINGS },
  STAFF: { module: MODULES.STAFF, action: ACTIONS.STAFF_VIEW },
  ORGANIZATION: { module: MODULES.ORGANIZATION, action: ACTIONS.ORGANIZATION_VIEW },
  SUPPLIERS: { module: MODULES.SUPPLIER, action: ACTIONS.SUPPLIER_VIEW },
  SERVICE: { module: MODULES.SERVICE },
  PURCHASES: { module: MODULES.PURCHASE, action: ACTIONS.PURCHASE_VIEW },
  BUSINESS_TYPES: { module: MODULES.BUSINESS_TYPES },
  SHOP_MANAGEMENT: { module: MODULES.SHOP_MANAGEMENT },
  PLAN_MANAGEMENT: { module: MODULES.PLAN_MANAGEMENT },
  SUBSCRIPTION_MANAGEMENT: { module: MODULES.SUBSCRIPTION_MANAGEMENT },
  TABLE_MANAGEMENT: { module: MODULES.TABLE_MANAGEMENT, action: ACTIONS.TABLE_VIEWING },
});

// Define order in sidebar
export const ROUTE_KEYS_ORDER = [
  'DINING',
  'TAKEAWAY',
  'DIRECT_SALE',
  'WHOLESALE',
  'ONLINE_ORDERS',
  'KDS',
  'RESERVATIONS',
  'INVENTORY',
  'PURCHASES',
  'SERVICE',
  'STAFF',
  'ORGANIZATION',
  'SUPPLIERS',
  'REPORTS',
  'SETTINGS',
  'BUSINESS_TYPES',
  'SHOP_MANAGEMENT',
  'PLAN_MANAGEMENT',
  'SUBSCRIPTION_MANAGEMENT',
  'TABLE_MANAGEMENT'
];

/** Map route key to path for redirects */
export const ROUTE_KEY_TO_PATH = Object.freeze({
  DINING: "/dininghall",
  TAKEAWAY: "/takeaway",
  DIRECT_SALE: "/takeaway",
  WHOLESALE: "/wholesale",
  ONLINE_ORDERS: "/online-orders",
  KDS: "/kds",
  RESERVATIONS: "/reservations",
  INVENTORY: "/inventory",
  REPORTS: "/reports",
  SETTINGS: "/settings",
  STAFF: "/staff",
  ORGANIZATION: "/organization",
  SUPPLIERS: "/suppliers",
  SERVICE: "/service",
  PURCHASES: "/purchases",
  BUSINESS_TYPES: "/business-types",
  SHOP_MANAGEMENT: "/shop-management",
  PLAN_MANAGEMENT: "/plan-management",
  SUBSCRIPTION_MANAGEMENT: "/subscription-management",
  TABLE_MANAGEMENT: "/table-management",
});

/** Resolve first path the user is allowed to access (for redirect when denying a route) */
export function getFirstAllowedPath(can, canModule) {
  for (const key of ROUTE_KEYS_ORDER) {
    const r = ROUTE_ACCESS[key];
    if (!r) continue;
    const allowed = r.action != null && r.action !== undefined ? can(r.module, r.action) : canModule(r.module);
    if (allowed) return ROUTE_KEY_TO_PATH[key];
  }
  return "/dininghall";
}
