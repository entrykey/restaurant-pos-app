import React, { createContext, useContext, useState } from "react";

const OnlineOrderContext = createContext();

export const useOnlineOrders = () => useContext(OnlineOrderContext);

export const OnlineOrderProvider = ({ children }) => {
    const [isOnlineOrderingEnabled, setIsOnlineOrderingEnabled] = useState(true);
    const [onlineOrderTab, setOnlineOrderTab] = useState("pending");

    const [onlineOrders, setOnlineOrders] = useState([
        {
            id: "ON-201",
            customer: "Arun Kumar",
            phone: "9876543210",
            address: "Flat 4B, Galaxy Apts",
            platform: "Zomato",
            timestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
            status: "pending", // pending, accepted, preparing, ready, rejected, completed
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
            timestamp: Date.now() - 1000 * 60 * 2, // 2 mins ago
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
    ]);

    const pendingOnlineOrdersCount = onlineOrders.filter(
        (o) => o.status === "pending"
    ).length;

    const handleAcceptOnlineOrder = (order) => {
        const acceptedOrder = {
            ...order,
            status: "accepted",
            kotStatus: "preparing",
            kotSentAt: Date.now(),
        };

        setOnlineOrders((prev) =>
            prev.map((o) => (o.id === order.id ? acceptedOrder : o))
        );
        return {
            tableId: order.id,
            tableName: `Online: ${order.customer}`,
            sentAt: Date.now(),
            waiterName: "Online Platform",
        };
    };

    const handleRejectOnlineOrder = (orderId) => {
        setOnlineOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: "rejected" } : o))
        );
    };

    const handleCompleteOnlineKOT = (orderId) => {
        setOnlineOrders((prev) =>
            prev.map((o) =>
                o.id === orderId ? { ...o, kotStatus: "ready", status: "ready" } : o
            )
        );
    };

    return (
        <OnlineOrderContext.Provider
            value={{
                onlineOrders,
                setOnlineOrders,
                isOnlineOrderingEnabled,
                setIsOnlineOrderingEnabled,
                onlineOrderTab,
                setOnlineOrderTab,
                pendingOnlineOrdersCount,
                handleAcceptOnlineOrder,
                handleRejectOnlineOrder,
                handleCompleteOnlineKOT,
            }}
        >
            {children}
        </OnlineOrderContext.Provider>
    );
};
