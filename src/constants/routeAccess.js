/**
 * Maps sidebar/route keys to (moduleId, permissionId?) for permission checks.
 * If action is omitted, access is granted when user has any permission in that module.
 */
import { MODULES } from "./modules";
import { ACTIONS } from "./actions";

export const ROUTE_ACCESS = Object.freeze({
  DASHBOARD: { module: MODULES.DASHBOARD },
  DINING: { module: MODULES.POS, action: 'pos.dining' },
  TAKEAWAY: { module: MODULES.POS, action: 'POS.DINING.TAKEAWAY' },
  DIRECT_SALE: { module: MODULES.POS, action: 'pos.direct_sale' },
  WHOLESALE: { module: MODULES.POS, action: 'pos.wholesale' },
  ONLINE_ORDERS: { module: MODULES.POS, action: 'pos.onlineorder' },
  KDS: { module: MODULES.KDS },
  RESERVATIONS: { module: MODULES.RESERVATIONS, action: ACTIONS.RESERVATION_VIEWING },
  MYATTENDANCE: { module: MODULES.MYATTENDANCE, action: ACTIONS.ATTENDANCE_MANAGE },
  MYLEAVES: { module: MODULES.MYLEAVES },
  MYSALARY: { module: MODULES.MYSALARY },
  INVENTORY: { module: MODULES.INVENTORY },
  REPORTS: { module: MODULES.REPORTS, action: ACTIONS.REPORTS_VIEW },
  SETTINGS: { module: MODULES.SETTINGS },
  STAFF: { module: MODULES.STAFF, action: ACTIONS.STAFF_VIEW },
  STAFF_DASHBOARD: { module: MODULES.DASHBOARD, action: ACTIONS.STAFF_DASHBOARD },
  ORGANIZATION: { module: MODULES.ORGANIZATION, action: ACTIONS.ORGANIZATION_VIEW },
  SUPPLIERS: { module: MODULES.SUPPLIER, action: ACTIONS.SUPPLIER_VIEW },
  PARTIES: { module: MODULES.PARTIES }, // Access if user has any PARTIES permission (supplier/customer)
  SERVICE: { module: MODULES.SERVICE },
  PURCHASES: { module: MODULES.PURCHASE, action: ACTIONS.PURCHASE_VIEW },
  BUSINESS_TYPES: { module: MODULES.BUSINESS_TYPES },
  SHOP_MANAGEMENT: { module: MODULES.SHOP_MANAGEMENT },
  PLAN_MANAGEMENT: { module: MODULES.PLAN_MANAGEMENT },
  SUBSCRIPTION_MANAGEMENT: { module: MODULES.SUBSCRIPTION_MANAGEMENT },
  TABLE_MANAGEMENT: { module: MODULES.TABLE_MANAGEMENT, action: ACTIONS.TABLE_VIEWING },
  OFFERS: { module: MODULES.OFFER_MANAGEMENT, action: ACTIONS.OFFER_MANAGE },
  CLIENT_MANAGEMENT: { module: MODULES.CLIENT_MANAGEMENT },
});

// Define order in sidebar
export const ROUTE_KEYS_ORDER = [
  'DASHBOARD',
  'MYATTENDANCE',
  'MYLEAVES',
  'MYSALARY',
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
  'PARTIES',
  'REPORTS',
  'OFFERS',
  'SETTINGS',
  'BUSINESS_TYPES',
  'CLIENT_MANAGEMENT',
  'SHOP_MANAGEMENT',
  'PLAN_MANAGEMENT',
  'SUBSCRIPTION_MANAGEMENT',
  'TABLE_MANAGEMENT'
];

/** Map route key to path for redirects */
export const ROUTE_KEY_TO_PATH = Object.freeze({
  DASHBOARD: "/dashboard",
  STAFF_DASHBOARD: "/staff-dashboard",
  MYATTENDANCE: "/my-attendance",
  MYLEAVES: "/my-leaves",
  MYSALARY: "/my-salary",
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
  PARTIES: "/parties",
  SERVICE: "/service",
  PURCHASES: "/purchases",
  BUSINESS_TYPES: "/business-types",
  SHOP_MANAGEMENT: "/shop-management",
  PLAN_MANAGEMENT: "/plan-management",
  SUBSCRIPTION_MANAGEMENT: "/subscription-management",
  TABLE_MANAGEMENT: "/table-management",
  OFFERS: "/offers",
  CLIENT_MANAGEMENT: "/client-management",
});

/** Resolve first path the user is allowed to access (for redirect when denying a route) */
export function getFirstAllowedPath(can, canModule) {
  for (const key of ROUTE_KEYS_ORDER) {
    const r = ROUTE_ACCESS[key];
    if (!r) continue;
    const allowed = r.action != null && r.action !== undefined ? can(r.module, r.action) : canModule(r.module);
    if (allowed) return ROUTE_KEY_TO_PATH[key];
  }
  return "/dashboard";
}
