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

const MODULE_ALIASES = {
  "EXPENSE_LEDGER": ["EXPENSE_LEDGER", "expense ledger", "6ab12a46fd8bac0f2fbd186e", "OPERATING_EXPENSES"],
  "expense ledger": ["EXPENSE_LEDGER", "expense ledger", "6ab12a46fd8bac0f2fbd186e", "OPERATING_EXPENSES"],
  "6ab12a46fd8bac0f2fbd186e": ["EXPENSE_LEDGER", "expense ledger", "6ab12a46fd8bac0f2fbd186e", "OPERATING_EXPENSES"],
  "OPERATING_EXPENSES": ["EXPENSE_LEDGER", "expense ledger", "6ab12a46fd8bac0f2fbd186e", "OPERATING_EXPENSES"]
};

const ACTION_ALIASES = {
  "MANAGE.EXPENSE": ["MANAGE.EXPENSE", "manage.expense", "6ab12a75fd8bac0f2fbd1ad8"],
  "manage.expense": ["MANAGE.EXPENSE", "manage.expense", "6ab12a75fd8bac0f2fbd1ad8"],
  "6ab12a75fd8bac0f2fbd1ad8": ["MANAGE.EXPENSE", "manage.expense", "6ab12a75fd8bac0f2fbd1ad8"]
};

export const hasPermission = (user, module, action) => {
  if (!user) return false;
  
  const moduleTargets = (MODULE_ALIASES[module] || [module]).map(m => String(m).toLowerCase());
  const actionTargets = action ? (ACTION_ALIASES[action] || [action]).map(a => String(a).toLowerCase()) : null;

  if (user.isSuperAdmin === true) {
    const isAutoGranted = SUPER_ADMIN_MODULES.some(m => moduleTargets.includes(m.toLowerCase()));
    if (isAutoGranted) return true;
  }

  const permissions = user.permissions;
  if (!permissions) return false;

  // Case A: permissions is an Array
  if (Array.isArray(permissions)) {
    return permissions.some((p) => {
      if (typeof p === "string") {
        const lower = p.toLowerCase();
        if (actionTargets) return actionTargets.includes(lower);
        return moduleTargets.includes(lower);
      }
      if (p && typeof p === "object") {
        const pMod = p.module ? String(p.module).toLowerCase() : "";
        const pId = p._id ? String(p._id).toLowerCase() : "";
        const pName = p.name ? String(p.name).toLowerCase() : "";
        const pKey = p.key ? String(p.key).toLowerCase() : "";

        const modMatches = moduleTargets.includes(pMod) || moduleTargets.includes(pId) || moduleTargets.includes(pName) || moduleTargets.includes(pKey);
        if (actionTargets) {
          const actMatches = actionTargets.includes(pId) || actionTargets.includes(pName) || actionTargets.includes(pKey);
          return modMatches && actMatches;
        }
        return modMatches;
      }
      return false;
    });
  }

  // Case B: permissions is an Object
  if (typeof permissions === "object") {
    // Check module key in object
    const matchedModuleKey = Object.keys(permissions).find(
      (k) => moduleTargets.includes(String(k).toLowerCase())
    );

    if (matchedModuleKey) {
      const modulePermissions = permissions[matchedModuleKey];

      if (action == null || action === undefined) {
        return Array.isArray(modulePermissions) ? modulePermissions.length > 0 : Boolean(modulePermissions);
      }

      if (Array.isArray(modulePermissions)) {
        return modulePermissions.some((p) => {
          if (typeof p === "string") return actionTargets.includes(p.toLowerCase());
          if (p && typeof p === "object") {
            const pId = p._id ? String(p._id).toLowerCase() : "";
            const pName = p.name ? String(p.name).toLowerCase() : "";
            const pKey = p.key ? String(p.key).toLowerCase() : "";
            return actionTargets.some(a => a === pId || a === pName || a === pKey);
          }
          return false;
        });
      }

      if (typeof modulePermissions === "boolean") return modulePermissions;
    }

    // Secondary check: search across all keys in object if action specified
    if (actionTargets) {
      for (const [, actVal] of Object.entries(permissions)) {
        if (Array.isArray(actVal)) {
          const found = actVal.some((p) => {
            if (typeof p === "string") return actionTargets.includes(p.toLowerCase());
            if (p && typeof p === "object") {
              const pId = p._id ? String(p._id).toLowerCase() : "";
              const pName = p.name ? String(p.name).toLowerCase() : "";
              const pKey = p.key ? String(p.key).toLowerCase() : "";
              return actionTargets.some(a => a === pId || a === pName || a === pKey);
            }
            return false;
          });
          if (found) return true;
        }
      }
    }
  }

  return false;
};

/**
 * Check if user has access to a module (any permission in that module).
 * @param {object} user - User with .permissions object
 * @param {string} moduleId - Module ID
 * @returns {boolean}
 */
export const hasModuleAccess = (user, moduleId) => {
  if (!user) return false;
  const moduleTargets = (MODULE_ALIASES[moduleId] || [moduleId]).map(m => String(m).toLowerCase());

  if (user.isSuperAdmin === true) {
    const isAutoGranted = SUPER_ADMIN_MODULES.some(m => moduleTargets.includes(m.toLowerCase()));
    if (isAutoGranted) return true;
  }
  
  const permissions = user.permissions;
  if (!permissions) return false;

  if (Array.isArray(permissions)) {
    return permissions.some(p => {
      if (typeof p === "string") return moduleTargets.includes(p.toLowerCase());
      if (p && typeof p === "object") {
        const pMod = p.module ? String(p.module).toLowerCase() : "";
        const pId = p._id ? String(p._id).toLowerCase() : "";
        const pName = p.name ? String(p.name).toLowerCase() : "";
        const pKey = p.key ? String(p.key).toLowerCase() : "";
        return moduleTargets.some(m => m === pMod || m === pId || m === pName || m === pKey);
      }
      return false;
    });
  }

  if (typeof permissions === "object") {
    const matchedModuleKey = Object.keys(permissions).find(
      (k) => moduleTargets.includes(String(k).toLowerCase())
    );
    if (!matchedModuleKey) return false;

    const list = permissions[matchedModuleKey];
    if (Array.isArray(list)) return list.length > 0;
    return Boolean(list);
  }

  return false;
};
