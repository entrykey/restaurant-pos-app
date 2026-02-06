import { buildPermissionKey } from "../config/permissionStructure";

/**
 * Check if user has a permission.
 * @param {object} user - User object with .permissions (array of "module.resource.action" keys)
 * @param {string} permissionKey - Full key e.g. "organization.branch.create", or legacy key e.g. "POS_ACCESS"
 * @returns {boolean}
 */
export const hasPermission = (user, permissionKey) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return (
        user.permissions && user.permissions.includes(permissionKey)
    );
};

/**
 * Check by module, resource, and action (builds key "module.resource.action").
 * Use in UI: hasPermissionFor(currentUser, "organization", "branch", "create")
 * @param {object} user
 * @param {string} module - e.g. "organization"
 * @param {string} resource - e.g. "branch", "organization"
 * @param {string} action - e.g. "view", "create", "edit", "delete"
 */
export const hasPermissionFor = (user, module, resource, action) => {
    const key = buildPermissionKey(module, resource, action);
    return hasPermission(user, key);
};
