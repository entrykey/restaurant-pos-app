import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { usePermission } from "../auth/usePermission";
import { ROUTE_ACCESS, getFirstAllowedPath } from "../constants/routeAccess";

/**
 * Prohibits access if user lacks permission for this route.
 * Use either routeKey or (module + optional action).
 * - routeKey: e.g. "STAFF", "ORGANIZATION" → resolves module/action from ROUTE_ACCESS
 * - module + action: direct IDs (action optional → any permission in module)
 * Redirects to redirectPath, or first allowed route, when access is denied.
 */
const ProtectedRoute = ({ routeKey, module: moduleId, action: actionId, redirectPath, children }) => {
    const { can, canModule } = usePermission();

    let allowed = true;
    if (routeKey != null) {
        const r = ROUTE_ACCESS[routeKey];
        if (r) {
            if (r.action != null && r.action !== undefined) allowed = can(r.module, r.action);
            else allowed = canModule(r.module);
        }
    } else if (moduleId != null) {
        allowed = actionId != null && actionId !== undefined ? can(moduleId, actionId) : canModule(moduleId);
    }

    if (!allowed) {
        const to = redirectPath ?? getFirstAllowedPath(can, canModule);
        return <Navigate to={to} replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
