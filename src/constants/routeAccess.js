/**
 * Maps sidebar/route keys to (moduleId, permissionId?) for permission checks.
 * If action is omitted, access is granted when user has any permission in that module.
 */
import { MODULES } from "./modules";
import { ACTIONS } from "./actions";

export const ROUTE_ACCESS = Object.freeze({
  DINING: { module: MODULES.POS },
  TAKEAWAY: { module: MODULES.POS },
  ONLINE_ORDERS: { module: MODULES.ORDERS },
  KDS: { module: MODULES.KDS },
  RESERVATIONS: { module: MODULES.RESERVATIONS },
  INVENTORY: { module: MODULES.INVENTORY },
  REPORTS: { module: MODULES.REPORTS },
  SETTINGS: { module: MODULES.SETTINGS },
  STAFF: { module: MODULES.STAFF, action: ACTIONS.STAFF_VIEW },
  ORGANIZATION: { module: MODULES.ORGANIZATION, action: ACTIONS.ORGANIZATION_VIEW },
  SUPPLIERS: { module: MODULES.SUPPLIER, action: ACTIONS.SUPPLIER_VIEW },
  SERVICE: { module: MODULES.SERVICE },
  PURCHASES: { module: MODULES.PURCHASE, action: ACTIONS.PURCHASE_VIEW },
});

/** Order of route keys for "first allowed" redirect when access is denied */
export const ROUTE_KEYS_ORDER = [
  "DINING", "TAKEAWAY", "ONLINE_ORDERS", "KDS", "RESERVATIONS", "INVENTORY",
  "REPORTS", "SETTINGS", "STAFF", "ORGANIZATION", "SUPPLIERS", "SERVICE", "PURCHASES",
];

/** Map route key to path for redirects */
export const ROUTE_KEY_TO_PATH = Object.freeze({
  DINING: "/dininghall",
  TAKEAWAY: "/takeaway",
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
