/**
 * Permission check using backend structure: user.permissions = { moduleId: [permissionId, ...] }
 * @param {object} user - User with .permissions object
 * @param {string} module - Module ID (e.g. MODULES.ORGANIZATION)
 * @param {string} [action] - Permission ID (e.g. ACTIONS.ORGANIZATION_VIEW). If omitted, checks if user has any permission in the module.
 * @returns {boolean}
 */
export const hasPermission = (user, module, action) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;

  const permissions = user.permissions;
  if (!permissions || typeof permissions !== "object") return false;

  const modulePermissions = permissions[module];
  if (!Array.isArray(modulePermissions)) return false;

  if (action == null || action === undefined) {
    return modulePermissions.length > 0;
  }
  return modulePermissions.includes(action);
};

/**
 * Check if user has access to a module (any permission in that module).
 * @param {object} user - User with .permissions object
 * @param {string} moduleId - Module ID
 * @returns {boolean}
 */
export const hasModuleAccess = (user, moduleId) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  const permissions = user.permissions;
  if (!permissions || typeof permissions !== "object") return false;
  const list = permissions[moduleId];
  return Array.isArray(list) && list.length > 0;
};
