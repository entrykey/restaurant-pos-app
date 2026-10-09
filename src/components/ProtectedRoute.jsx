import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePermission } from "../auth/usePermission";
import { ROUTE_ACCESS, getFirstAllowedPath } from "../constants/routeAccess";

const ROOT_PATH_SEGMENTS = new Set([
    "dashboard", "dininghall", "takeaway", "wholesale", "online-orders",
    "reservations", "kds", "inventory", "reports", "settings", "staff",
    "organization", "suppliers", "parties", "service", "purchases",
    "business-types", "shop-management", "client-management", "plan-management",
    "subscription-management", "table-management", "offers", "owner-dashboard",
    "my-attendance", "my-leaves", "my-salary", "staff-dashboard", "sale-marking",
    "sales-history", "operating-expenses", "login", "profile", "salesreturn", "purchasereturn"
]);

/**
 * Prohibits access if user lacks permission for this route.
 * Use routeKey, routeKeys (any one allows), or (module + optional action).
 * Redirects to redirectPath, or first allowed route, when access is denied.
 */
const ProtectedRoute = ({ routeKey, routeKeys, module: moduleId, action: actionId, redirectPath, children }) => {
    const { can, canModule } = usePermission();
    const location = useLocation();

    let allowed = true;
    if (routeKeys != null && Array.isArray(routeKeys)) {
        allowed = routeKeys.some((key) => {
            const r = ROUTE_ACCESS[key];
            if (!r) return false;
            if (r.action != null && r.action !== undefined) return can(r.module, r.action);
            return canModule(r.module);
        });
    } else if (routeKey != null) {
        const r = ROUTE_ACCESS[routeKey];
        if (r) {
            if (r.action != null && r.action !== undefined) allowed = can(r.module, r.action);
            else allowed = canModule(r.module);
        }
    } else if (moduleId != null) {
        allowed = actionId != null && actionId !== undefined ? can(moduleId, actionId) : canModule(moduleId);
    }

    if (!allowed) {
        const segs = String(location.pathname || "/").split("/").filter(Boolean);
        let shopPrefix = "";
        if (segs.length > 0 && !ROOT_PATH_SEGMENTS.has(segs[0])) {
            shopPrefix = `/${segs[0]}`;
        }
        const firstPath = getFirstAllowedPath(can, canModule);
        const to = redirectPath ?? `${shopPrefix}${firstPath}`;
        return <Navigate to={to} replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
