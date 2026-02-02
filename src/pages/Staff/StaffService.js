export const PERMISSIONS = {
    POS_ACCESS: "Access POS System",
    MANAGE_ORDERS: "Manage Orders (Edit/Delete)",
    MANAGE_INVENTORY: "Manage Inventory",
    VIEW_REPORTS: "View Reports",
    ACCESS_SETTINGS: "Access Settings",
    MANAGE_STAFF: "Manage Staff & Roles",
    MANAGE_RESERVATIONS: "Manage Reservations",
    MANAGE_ONLINE_ORDERS: "Manage Online Orders",
    VIEW_KDS: "View Kitchen Display System (KDS)",
};

export const initialRoles = [
    {
        id: 1,
        name: "Admin",
        permissions: Object.keys(PERMISSIONS),
    },
    {
        id: 2,
        name: "Manager",
        permissions: [
            "POS_ACCESS",
            "MANAGE_ORDERS",
            "MANAGE_INVENTORY",
            "VIEW_REPORTS",
            "MANAGE_RESERVATIONS",
            "MANAGE_ONLINE_ORDERS",
            "VIEW_KDS",
        ],
    },
    {
        id: 3,
        name: "Cashier",
        permissions: [
            "POS_ACCESS",
            "MANAGE_ORDERS",
            "MANAGE_RESERVATIONS",
            "MANAGE_ONLINE_ORDERS",
        ],
    },
    {
        id: 4,
        name: "Chef",
        permissions: ["VIEW_KDS"],
    },
    {
        id: 5,
        name: "Waiter",
        permissions: ["POS_ACCESS"],
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
