import {
    PERMISSIONS_WITH_LABELS,
    ALL_PERMISSION_KEYS_LIST,
    buildPermissionKey,
    MODULES,
    DEFAULT_ACTIONS,
    EXTRA_ACTIONS,
} from "../../config/permissionStructure";

/** Permission key -> label for role editor. Backend can send same keys. */
export const PERMISSIONS = PERMISSIONS_WITH_LABELS;

/** All permission keys (for Admin full access) */
const ALL_KEYS = ALL_PERMISSION_KEYS_LIST;

export const initialRoles = [];
export const initialStaff = [];

