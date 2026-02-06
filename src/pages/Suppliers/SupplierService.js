// Mock data for suppliers
let suppliers = [
    {
        id: 1,
        name: "Fresh Farms Ltd",
        contactPerson: "John Doe",
        phone: "+91 98765 43210",
        email: "john@freshfarms.com",
        address: "123 Farm Road, Green Valley",
        taxId: "GST123456789",
        status: "Active"
    },
    {
        id: 2,
        name: "City Wholesale Traders",
        contactPerson: "Jane Smith",
        phone: "+91 98765 12345",
        email: "jane@citytraders.com",
        address: "45 Market Street, City Center",
        taxId: "GST987654321",
        status: "Active"
    },
    {
        id: 3,
        name: "Tech Supplies Inc",
        contactPerson: "Mike Johnson",
        phone: "+91 91234 56789",
        email: "support@techsupplies.com",
        address: "78 Tech Park, Silicon Hub",
        taxId: "GST567890123",
        status: "Inactive"
    }
];

export const SupplierService = {
    getSuppliers: () => {
        // Simulate API delay
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([...suppliers]);
            }, 300);
        });
    },

    addSupplier: (supplier) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newSupplier = {
                    ...supplier,
                    id: suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1
                };
                suppliers = [...suppliers, newSupplier];
                resolve(newSupplier);
            }, 300);
        });
    },

    updateSupplier: (id, updatedData) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                suppliers = suppliers.map(s =>
                    s.id === id ? { ...s, ...updatedData } : s
                );
                resolve(suppliers.find(s => s.id === id));
            }, 300);
        });
    },

    deleteSupplier: (id) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                suppliers = suppliers.filter(s => s.id !== id);
                resolve(true);
            }, 300);
        });
    }
};
