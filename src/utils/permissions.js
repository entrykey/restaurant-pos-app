import { hasPermission as hasPermissionById } from "../auth/permissionUtils";

/**
 * Normalizes an action string for frontend-backend alignment.
 * Maps 'manage' to 'edit' as our UI heavily uses manage but backend has no manage permission.
 */
const normalizeAction = (action) => {
  if (action === "manage") return "edit";
  return action;
};

/**
 * Check if user has a permission (backend structure: user.permissions = { moduleKey: [permissionKey, ...] }).
 * @param {object} user - User with .permissions object
 * @param {string} permissionKey - Full key e.g. "organization.branch.create", or use hasPermissionFor for (module, resource, action)
 * @returns {boolean}
 */
export const hasPermission = (user, permissionKey) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;

  const parts = permissionKey.split(".");
  if (parts.length >= 3) {
    // If it's a 3-part generic string like organization.branch.create
    const [module, resource, action] = parts;
    const normalizedAction = normalizeAction(action);
    const key = `${resource}.${normalizedAction}`;
    return hasPermissionById(user, module, key);
  } else if (parts.length === 2) {
    // If it's a 2-part string matching DB keys exactly like settings.inventory_settings
    const [module] = parts;
    return hasPermissionById(user, module, permissionKey);
  }

  return false;
};

/**
 * Check by module, resource, and action (maps to backend moduleKey + permissionKey).
 * Use in UI: hasPermissionFor(currentUser, "organization", "branch", "create")
 * @param {object} user
 * @param {string} module - e.g. "organization", "staff"
 * @param {string} resource - e.g. "branch", "organization", "staff"
 * @param {string} action - e.g. "view", "create", "edit", "delete", "manage"
 */
export const hasPermissionFor = (user, module, resource, action) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;

  // Handle special edge case for settings
  if (module === "settings" && resource === "inventory_settings") {
    return hasPermissionById(user, "settings", "settings.inventory_settings");
  }

  // Check the direct action first
  const primaryKey = `${resource}.${action}`;
  if (hasPermissionById(user, module, primaryKey)) return true;

  // Check normalized if different
  const normalizedAction = normalizeAction(action);
  if (normalizedAction !== action) {
    const secondaryKey = `${resource}.${normalizedAction}`;
    return hasPermissionById(user, module, secondaryKey);
  }

  return false;
};
