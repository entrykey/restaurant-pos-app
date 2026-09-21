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
  "EXPENSE_LEDGER",
  "expense ledger",
  "6ab12a46fd8bac0f2fbd186e",
  "OPERATING_EXPENSES",
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
  if (user.isSuperAdmin === true) {
    const modTargets = (MODULE_ALIASES[module] || [module]).map(m => String(m).toLowerCase());
    return SUPER_ADMIN_MODULES.some(m => modTargets.includes(m.toLowerCase()));
  }

  const permissions = user.permissions;
  if (!permissions || typeof permissions !== "object") return false;

  const moduleTargets = (MODULE_ALIASES[module] || [module]).map(m => String(m).toLowerCase());

  // Case-insensitive module matching
  const matchedModuleKey = Object.keys(permissions).find(
    (k) => moduleTargets.includes(String(k).toLowerCase())
  );
  if (!matchedModuleKey) return false;

  const modulePermissions = permissions[matchedModuleKey];
  if (!Array.isArray(modulePermissions)) return false;

  if (action == null || action === undefined) {
    return modulePermissions.length > 0;
  }

  const actionTargets = (ACTION_ALIASES[action] || [action]).map(a => String(a).toLowerCase());

  // Case-insensitive action matching
  return modulePermissions.some(
    (p) => typeof p === "string" && actionTargets.includes(p.toLowerCase())
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
    const modTargets = (MODULE_ALIASES[moduleId] || [moduleId]).map(m => String(m).toLowerCase());
    return SUPER_ADMIN_MODULES.some(m => modTargets.includes(m.toLowerCase()));
  }
  const permissions = user.permissions;
  if (!permissions || typeof permissions !== "object") return false;

  const moduleTargets = (MODULE_ALIASES[moduleId] || [moduleId]).map(m => String(m).toLowerCase());

  const matchedModuleKey = Object.keys(permissions).find(
    (k) => moduleTargets.includes(String(k).toLowerCase())
  );
  if (!matchedModuleKey) return false;

  const list = permissions[matchedModuleKey];
  return Array.isArray(list) && list.length > 0;
};
