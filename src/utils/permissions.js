import { hasPermission as hasPermissionById } from "../auth/permissionUtils";
import { getPermissionIds } from "../constants/permissionKeys";

/**
 * Check if user has a permission (backend structure: user.permissions = { moduleId: [permissionId, ...] }).
 * Supports legacy permissionKey "module.resource.action" by mapping to moduleId + permissionId.
 * @param {object} user - User with .permissions object
 * @param {string} permissionKey - Legacy key e.g. "organization.branch.create", or use hasPermissionFor for (module, resource, action)
 * @returns {boolean}
 */
export const hasPermission = (user, permissionKey) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;

  const parts = permissionKey.split(".");
  if (parts.length >= 3) {
    const [module, resource, action] = parts;
    const ids = getPermissionIds(module, resource, action);
    if (ids) return hasPermissionById(user, ids.moduleId, ids.actionId);
  }
  return false;
};

/**
 * Check by module, resource, and action (maps to backend moduleId + permissionId).
 * Use in UI: hasPermissionFor(currentUser, "organization", "branch", "create")
 * @param {object} user
 * @param {string} module - e.g. "organization", "staff"
 * @param {string} resource - e.g. "branch", "organization", "staff"
 * @param {string} action - e.g. "view", "create", "edit", "delete"
 */
export const hasPermissionFor = (user, module, resource, action) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;

  const ids = getPermissionIds(module, resource, action);
  if (!ids) return false;
  return hasPermissionById(user, ids.moduleId, ids.actionId);
};
