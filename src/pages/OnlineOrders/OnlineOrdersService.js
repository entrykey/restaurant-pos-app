export const onlineOrdersService = {
    getOnlineOrders: async () => {
        // In a real app, this would be an API call
        return [
            {
                id: "ON-201",
                customer: "Arun Kumar",
                phone: "9876543210",
                address: "Flat 4B, Galaxy Apts",
                platform: "Zomato",
                timestamp: Date.now() - 1000 * 60 * 5,
                status: "pending",
                paymentStatus: "paid",
                items: [
                    {
                        id: "m1",
                        name: "Butter Chicken Masala",
                        price: 450.0,
                        quantity: 1,
                        taxPercent: 5,
                        sellingType: "Standard",
                        selectedExtras: [],
                    },
                    {
                        id: "m4",
                        name: "Garlic Naan",
                        price: 65.0,
                        quantity: 2,
                        taxPercent: 5,
                        sellingType: "Standard",
                        selectedExtras: [],
                    },
                ],
                total: 580.0,
                note: "Less spicy please",
            },
            {
                id: "ON-202",
                customer: "Sarah J",
                phone: "9988776655",
                address: "Pickup",
                platform: "Swiggy",
                timestamp: Date.now() - 1000 * 60 * 2,
                status: "pending",
                paymentStatus: "paid",
                items: [
                    {
                        id: "m7",
                        name: "Chicken Biryani",
                        price: 350.0,
                        quantity: 2,
                        taxPercent: 5,
                        sellingType: "Standard",
                        selectedExtras: [],
                    },
                ],
                total: 700.0,
                note: "",
            },
        ];
    }
};
