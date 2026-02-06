import React, { createContext, useContext, useState } from "react";
import { initialTables } from "../Settings/SettingsService";
import { useApp } from "../../context/AppContext";

const DiningContext = createContext();

export const useDining = () => useContext(DiningContext);

export const DiningProvider = ({ children }) => {
    const { currentTime } = useApp();
    const [tables, setTables] = useState(initialTables);
    const [activeTableId, setActiveTableId] = useState(null);
    const [reservations, setReservations] = useState([
        {
            id: 1,
            customerName: "Amit Sharma",
            phone: "9876543210",
            date: new Date().toISOString().split("T")[0],
            time: "19:30",
            guests: 4,
            tableId: 2,
            status: "Confirmed",
        },
        {
            id: 2,
            customerName: "Priya Singh",
            phone: "9988776655",
            date: new Date().toISOString().split("T")[0],
            time: "20:00",
            guests: 2,
            tableId: null,
            status: "Pending",
        },
    ]);

    const getTableDuration = (startTime) => {
        if (!startTime) return null;
        const diff = currentTime - startTime;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        let label = `${minutes} min`;
        if (hours > 0) label = `${hours}h ${mins}m`;

        let colorClass = "bg-green-100 text-green-700";
        if (minutes >= 30) colorClass = "bg-orange-100 text-orange-700";
        if (minutes >= 60) colorClass = "bg-red-100 text-red-700";

        return { label, colorClass };
    };

    const handleCheckInReservation = (reservation) => {
        if (!reservation.tableId) {
            alert("Please assign a table to this reservation before checking in.");
            return;
        }
        const table = tables.find((t) => t.id === parseInt(reservation.tableId));
        if (!table) {
            alert("Assigned table not found. Please verify table ID.");
            return;
        }
        if (table.status === "occupied") {
            alert(`Table ${table.name} is currently occupied.`);
            return;
        }
        if (table.isMaintenance) {
            alert(`Table ${table.name} is under maintenance.`);
            return;
        }

        // Convert to Active Order
        setTables((prev) =>
            prev.map((t) => {
                if (t.id === table.id) {
                    return {
                        ...t,
                        status: "occupied",
                        startTime: Date.now(),
                        order: { items: [], isSentToKOT: false },
                    };
                }
                return t;
            })
        );

        // Update Reservation Status
        setReservations((prev) =>
            prev.map((r) =>
                r.id === reservation.id ? { ...r, status: "Checked-in" } : r
            )
        );

        // Return the table ID so the caller can handle navigation
        return table.id;
    };

    const handleCompleteKOT = (tableId) => {
        setTables((prev) =>
            prev.map((t) => {
                if (t.id === tableId && t.order) {
                    return { ...t, order: { ...t.order, kotStatus: "ready" } };
                }
                return t;
            })
        );
    };

    const joinTables = (tableIds) => {
        if (!tableIds || tableIds.length < 2) return;

        // Correctly parse IDs to integers to match table IDs
        const ids = tableIds.map(id => parseInt(id));
        const primaryTableId = ids[0];
        const primaryStartTime = Date.now();

        setTables(prev => prev.map(t => {
            // Is this the primary table?
            if (t.id === primaryTableId) {
                return {
                    ...t,
                    status: 'occupied',
                    startTime: primaryStartTime,
                    order: { items: [], isSentToKOT: false },
                    isParent: true,
                    childTables: ids.slice(1)
                };
            }
            // Is this one of the child tables?
            if (ids.includes(t.id)) {
                return {
                    ...t,
                    status: 'occupied',
                    startTime: primaryStartTime,
                    parentTableId: primaryTableId,
                    order: null // Children don't have orders
                };
            }
            return t;
        }));
    };

    return (
        <DiningContext.Provider
            value={{
                tables,
                setTables,
                activeTableId,
                setActiveTableId,
                reservations,
                setReservations,
                getTableDuration,
                handleCheckInReservation,
                handleCheckInReservation,
                handleCompleteKOT,
                joinTables
            }}
        >
            {children}
        </DiningContext.Provider>
    );
};
