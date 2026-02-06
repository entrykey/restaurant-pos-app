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

export const initialRoles = [
    {
        id: 1,
        name: "Admin",
        permissions: [...ALL_KEYS],
    },
    {
        id: 2,
        name: "Manager",
        permissions: [
            buildPermissionKey(MODULES.POS, "dining", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.POS, "takeaway", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.POS, "order", EXTRA_ACTIONS.PROCESS_PAYMENT),
            buildPermissionKey(MODULES.POS, "order", EXTRA_ACTIONS.APPLY_DISCOUNT),
            buildPermissionKey(MODULES.ORDERS, "online_orders", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.ORDERS, "online_orders", "manage"),
            buildPermissionKey(MODULES.KDS, "kds", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.RESERVATIONS, "reservation", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.RESERVATIONS, "reservation", "manage"),
            buildPermissionKey(MODULES.INVENTORY, "inventory", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.INVENTORY, "inventory", "manage"),
            buildPermissionKey(MODULES.REPORTS, "report", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.SETTINGS, "settings", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.SETTINGS, "settings", "manage"),
            buildPermissionKey(MODULES.STAFF, "staff", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.STAFF, "staff", "manage"),
        ],
    },
    {
        id: 3,
        name: "Cashier",
        permissions: [
            buildPermissionKey(MODULES.POS, "dining", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.POS, "takeaway", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.POS, "order", EXTRA_ACTIONS.PROCESS_PAYMENT),
            buildPermissionKey(MODULES.POS, "order", EXTRA_ACTIONS.APPLY_DISCOUNT),
            buildPermissionKey(MODULES.ORDERS, "online_orders", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.ORDERS, "online_orders", "manage"),
            buildPermissionKey(MODULES.RESERVATIONS, "reservation", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.RESERVATIONS, "reservation", "manage"),
        ],
    },
    {
        id: 4,
        name: "Chef",
        permissions: [
            buildPermissionKey(MODULES.KDS, "kds", DEFAULT_ACTIONS.VIEW),
        ],
    },
    {
        id: 5,
        name: "Waiter",
        permissions: [
            buildPermissionKey(MODULES.POS, "dining", DEFAULT_ACTIONS.VIEW),
            buildPermissionKey(MODULES.POS, "takeaway", DEFAULT_ACTIONS.VIEW),
        ],
    },
];

export const initialStaff = [
    {
        id: 101,
        name: "Rajesh Kumar",
        role: "Manager",
        pin: "1111",
        phone: "9876543210",
        active: true,
    },
    {
        id: 102,
        name: "Suresh Singh",
        role: "Cashier",
        pin: "2222",
        phone: "9123456789",
        active: true,
    },
    {
        id: 103,
        name: "Ramesh Gupta",
        role: "Chef",
        pin: "3333",
        phone: "9988776655",
        active: true,
    },
];
