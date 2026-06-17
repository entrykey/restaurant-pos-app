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
 * Whitelist of modules/resources that are always allowed regardless of subscription status.
 * This ensures users can still access the dashboard, organization settings (to subscribe),
 * and plan management.
 */
const ALWAYS_ALLOWED_MODULES = ["DASHBOARD", "ORGANIZATION", "SUBSCRIPTION_MANAGEMENT", "PLAN_MANAGEMENT", "SHOP_MANAGEMENT", "SETTINGS"];
const ALWAYS_ALLOWED_RESOURCES = ["organization", "branch", "settings", "subscription"];

const isSubscribedOrCore = (user, module, resource) => {
  if (!user || user.isSuperAdmin === true || user.isOwner === true) return true;
  
  // If user is shop-linked, check subscription
  if (user.shop_id && user.subscription) {
    if (user.subscription.active) return true;
    
    // If not active, check if it's a core module/resource
    const isCoreModule = ALWAYS_ALLOWED_MODULES.includes(module?.toUpperCase());
    const isCoreResource = ALWAYS_ALLOWED_RESOURCES.includes(resource?.toLowerCase());
    
    return isCoreModule || isCoreResource;
  }
  
  // Default to true for users not tied to a shop (SuperAdmins already handled)
  return true;
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
  const module = parts[0];
  const resource = parts.length > 1 ? parts[parts.length - 2] : null;

  // Subscription check
  if (!isSubscribedOrCore(user, module, resource)) return false;

  if (parts.length >= 3) {
    // If it's a 3-part generic string like organization.branch.create
    const [moduleName, resourceName, action] = parts;
    const normalizedAction = normalizeAction(action);
    const key = `${resourceName}.${normalizedAction}`;
    return hasPermissionById(user, moduleName, key);
  } else if (parts.length === 2) {
    // If it's a 2-part string matching DB keys exactly like settings.inventory_settings
    const [moduleName] = parts;
    return hasPermissionById(user, moduleName, permissionKey);
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

  // Subscription check
  if (!isSubscribedOrCore(user, module, resource)) return false;

  // Handle special edge cases for settings
  if (module === "settings") {
    if (resource === "inventory_settings") {
      return hasPermissionById(user, "settings", "settings.inventory_settings");
    }
    if (resource === "barcode-bill") {
      if (hasPermissionById(user, "settings", "MANAGE.BARCODE-BILL")) return true;
      if (hasPermissionById(user, "settings", "barcode-bill.MANAGE")) return true;
    }
    if (resource === "settings" && (action === "view" || action === "manage")) {
      if (hasPermissionById(user, "settings", "SETTINGS.GENERAL")) return true;
    }
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
