import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { hasPermission, hasModuleAccess } from "./permissionUtils";

/**
 * Permission hook. Use with MODULES and ACTIONS constants.
 * - can(moduleId, actionId): has specific permission in module (actionId optional → any permission in module).
 * - canModule(moduleId): has any permission in that module (for route/sidebar visibility).
 * @example
 * const { can, canModule } = usePermission();
 * can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW)
 * canModule(MODULES.POS)
 */
export const usePermission = () => {
  const { user } = useAuth();

  return useMemo(
    () => ({
      can: (module, action) => hasPermission(user, module, action),
      canModule: (moduleId) => hasModuleAccess(user, moduleId),
    }),
    [user]
  );
};
