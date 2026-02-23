import { Navigate } from "react-router-dom";
import { usePermission } from "../auth/usePermission";

/**
 * Protects a route by module + action (backend IDs).
 * Use with MODULES and ACTIONS constants.
 */
const ProtectedRoute = ({ module, action, children }) => {
  const { can } = usePermission();

  if (!can(module, action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
