/**
 * Maps legacy permission keys (module.resource.action) to backend moduleId + permissionId.
 * Used so hasPermissionFor(module, resource, action) works with ID-based user.permissions.
 */
import { MODULES } from "./modules";
import { ACTIONS } from "./actions";

function key(module, resource, action) {
  return `${module}.${resource}.${action}`;
}

const MAP = {
  [key("organization", "organization", "view")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.ORGANIZATION_VIEW },
  [key("organization", "organization", "create")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.ORGANIZATION_CREATE },
  [key("organization", "organization", "edit")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.ORGANIZATION_EDIT },
  [key("organization", "organization", "delete")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.ORGANIZATION_DELETE },
  [key("organization", "branch", "view")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.BRANCH_VIEW },
  [key("organization", "branch", "create")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.BRANCH_CREATE },
  [key("organization", "branch", "edit")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.BRANCH_EDIT },
  [key("organization", "branch", "delete")]: { moduleId: MODULES.ORGANIZATION, actionId: ACTIONS.BRANCH_DELETE },
  [key("staff", "staff", "view")]: { moduleId: MODULES.STAFF, actionId: ACTIONS.STAFF_VIEW },
  [key("staff", "staff", "create")]: { moduleId: MODULES.STAFF, actionId: ACTIONS.STAFF_CREATE },
  [key("staff", "staff", "edit")]: { moduleId: MODULES.STAFF, actionId: ACTIONS.STAFF_EDIT },
  [key("staff", "staff", "delete")]: { moduleId: MODULES.STAFF, actionId: ACTIONS.STAFF_DELETE },
  [key("supplier", "supplier", "view")]: { moduleId: MODULES.SUPPLIER, actionId: ACTIONS.SUPPLIER_VIEW },
  [key("supplier", "supplier", "create")]: { moduleId: MODULES.SUPPLIER, actionId: ACTIONS.SUPPLIER_CREATE },
  [key("supplier", "supplier", "edit")]: { moduleId: MODULES.SUPPLIER, actionId: ACTIONS.SUPPLIER_EDIT },
  [key("supplier", "supplier", "delete")]: { moduleId: MODULES.SUPPLIER, actionId: ACTIONS.SUPPLIER_DELETE },
  [key("inventory", "inventory", "view")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.INVENTORY_VIEW },
  [key("inventory", "inventory", "create")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.INVENTORY_CREATE },
  [key("inventory", "inventory", "edit")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.INVENTORY_EDIT },
  [key("inventory", "inventory", "delete")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.INVENTORY_DELETE },
  [key("inventory", "inventory", "manage")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.INVENTORY_EDIT }, // Map manage to edit for UI convenience
  [key("inventory", "menu", "view")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.MENU_VIEW },
  [key("inventory", "menu", "create")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.MENU_CREATE },
  [key("inventory", "menu", "edit")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.MENU_EDIT },
  [key("inventory", "menu", "delete")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.MENU_DELETE },
  [key("inventory", "menu", "manage")]: { moduleId: MODULES.INVENTORY, actionId: ACTIONS.MENU_EDIT },
  [key("settings", "inventory_settings", "manage")]: { moduleId: MODULES.SETTINGS, actionId: ACTIONS.SETTINGS_INVENTORY_SETTINGS },
  // Purchase module
  [key("purchase", "purchase", "view")]: { moduleId: MODULES.PURCHASE, actionId: ACTIONS.PURCHASE_VIEW },
  [key("purchase", "purchase", "create")]: { moduleId: MODULES.PURCHASE, actionId: ACTIONS.PURCHASE_CREATE },
  [key("purchase", "purchase", "edit")]: { moduleId: MODULES.PURCHASE, actionId: ACTIONS.PURCHASE_EDIT },
  [key("purchase", "purchase", "delete")]: { moduleId: MODULES.PURCHASE, actionId: ACTIONS.PURCHASE_DELETE },
  [key("purchase", "purchase", "manage")]: { moduleId: MODULES.PURCHASE, actionId: ACTIONS.PURCHASE_VIEW }, // manage maps to view for route access
};

export function getPermissionIds(module, resource, action) {
  return MAP[key(module, resource, action)] || null;
}
