/**
 * Permission check using backend structure: user.permissions = { moduleId: [permissionId, ...] }
 * @param {object} user - User with .permissions object
 * @param {string} module - Module ID (e.g. MODULES.ORGANIZATION)
 * @param {string} [action] - Permission ID (e.g. ACTIONS.ORGANIZATION_VIEW). If omitted, checks if user has any permission in the module.
 * @returns {boolean}
 */
const SUPER_ADMIN_MODULES = [
  "business_types",
  "shop_management",
  "plan_management",
  "subscription_management",
  "settings",
  "client_management",
  "DASHBOARD",
];

export const hasPermission = (user, module, action) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) {
    return SUPER_ADMIN_MODULES.includes(module);
  }

  const permissions = user.permissions;
  if (!permissions || typeof permissions !== "object") return false;

  // Case-insensitive module matching
  const matchedModuleKey = Object.keys(permissions).find(
    (k) => k.toLowerCase() === String(module || "").toLowerCase()
  );
  if (!matchedModuleKey) return false;

  const modulePermissions = permissions[matchedModuleKey];
  if (!Array.isArray(modulePermissions)) return false;

  if (action == null || action === undefined) {
    return modulePermissions.length > 0;
  }

  // Case-insensitive action matching
  return modulePermissions.some(
    (p) => typeof p === "string" && p.toLowerCase() === String(action).toLowerCase()
  );
};

/**
 * Check if user has access to a module (any permission in that module).
 * @param {object} user - User with .permissions object
 * @param {string} moduleId - Module ID
 * @returns {boolean}
 */
export const hasModuleAccess = (user, moduleId) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) {
    return SUPER_ADMIN_MODULES.includes(moduleId);
  }
  const permissions = user.permissions;
  if (!permissions || typeof permissions !== "object") return false;

  const matchedModuleKey = Object.keys(permissions).find(
    (k) => k.toLowerCase() === String(moduleId || "").toLowerCase()
  );
  if (!matchedModuleKey) return false;

  const list = permissions[matchedModuleKey];
  return Array.isArray(list) && list.length > 0;
};
