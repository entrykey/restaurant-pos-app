import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import api, { tableService, tableMergeService, diningCategoryService } from "../../services/api";
import { reservationsService } from "../Reservations/ReservationsService";

const DiningContext = createContext();

export const useDining = () => useContext(DiningContext);

export const DiningProvider = ({ children }) => {
    const { currentTime, activeBranchId, enabledModules } = useApp();
    const { user } = useAuth();
    const [tables, setTables] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTableId, setActiveTableId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState([]);

    const fetchDiningData = useCallback(async (isPolling = false) => {
        const branchId = activeBranchId;
        
        // Only return early if enabledModules is null/undefined. 
        // If it's an empty object, we proceed so the module checks below can handle it.
        if (!enabledModules) {
            if (!isPolling) setLoading(false);
            return;
        }

        const isDiningEnabled = enabledModules?.DINING;
        const isReservationsEnabled = enabledModules?.RESERVATIONS;
        const isKdsEnabled = enabledModules?.KDS;

        if (!isDiningEnabled && !isReservationsEnabled) {
            if (!isPolling) setLoading(false);
            return;
        }

        if (!isPolling) setLoading(true);
        try {
            const promises = [
                isDiningEnabled ? tableService.getTables({ branchId: branchId || null }) : Promise.resolve({ data: [] }),
                isDiningEnabled ? diningCategoryService.getCategories({ branchId: branchId || null }) : Promise.resolve({ data: [] }),
                isReservationsEnabled ? reservationsService.getReservations({
                    branchId: branchId || null,
                    date: new Date().toISOString().split("T")[0],
                    status: 'CONFIRMED'
                }) : Promise.resolve({ data: [] }),
                // Fetch active orders (OPEN or IN_PROGRESS) - only if dining enabled or takeaway enabled
                (isDiningEnabled || enabledModules?.TAKEAWAY) 
                    ? api.get('/orders', { params: { branchId: branchId || null, orderStatus: ['OPEN', 'IN_PROGRESS', 'READY', 'SERVED'] } })
                    : Promise.resolve({ data: [] }),
                // Fetch active KOTs (not COMPLETED) - only if KDS or DINING enabled
                (isKdsEnabled || isDiningEnabled)
                    ? api.get('/kitchen/kots', { params: { branchId: branchId || null, status: { $ne: 'COMPLETED' } } })
                    : Promise.resolve({ data: [] })
            ];

            const [tablesRes, categoriesRes, reservationsRes, ordersRes, kotsRes] = await Promise.all(promises);

            const activeOrders = ordersRes.data || [];
            const activeKots = kotsRes.data || [];

            // Map backend _id to id for frontend consistency and merge active orders
            const mappedTables = ((tablesRes.data || tablesRes) || []).map(t => {
                const tableId = t._id;
                const activeOrderForTable = activeOrders.find(o =>
                    o.tableId === tableId || (o.tableId && (o.tableId._id === tableId || o.tableId.id === tableId))
                );

                let status = t.status || "available";
                let order = null;

                if (activeOrderForTable) {
                    status = "OCCUPIED"; // Force status if active order exists

                    // Check if any KOT for this order is not served
                    const tableKots = activeKots.filter(kot =>
                        (kot.orderId?._id || kot.orderId) === activeOrderForTable._id
                    );

                    // Determine overall preparation status for the UI
                    let kotStatus = "pending";
                    if (tableKots.some(kot => kot.status === "PREPARING")) {
                        kotStatus = "preparing";
                    } else if (tableKots.length > 0 && tableKots.every(kot => kot.status === "SERVED" || kot.status === "COMPLETED")) {
                        kotStatus = "served";
                    } else if (tableKots.length > 0 && tableKots.every(kot => kot.status === "READY" || kot.status === "SERVED" || kot.status === "COMPLETED")) {
                        kotStatus = "ready";
                    } else if (tableKots.some(kot => kot.status === "PENDING")) {
                        kotStatus = "preparing"; // Default to preparing if anything is pending
                    }

                    order = {
                        orderId: activeOrderForTable._id,
                        orderNumber: activeOrderForTable.orderNumber,
                        items: (activeOrderForTable.items || []).map(item => ({
                            ...item,
                            id: item.itemId?._id || item.itemId,
                            name: item.itemId?.name || item.itemName,
                            // If the order already has at least one KOT, treat backend quantities as already sent
                            // so the POS can generate incremental KOTs only for newly added/increased items.
                            sentQuantity: (tableKots.length > 0 ? (item.quantity ?? 0) : (item.sentQuantity ?? 0)),
                        })),
                        isSentToKOT: tableKots.length > 0,
                        kotStatus: kotStatus,
                        kotSentAt: tableKots.length > 0 ? tableKots[0].createdAt : null,
                    };
                }

                return {
                    ...t,
                    id: tableId,
                    name: `Table ${t.tableNumber}`,
                    status: status.toLowerCase(), // Frontend expects lowercase
                    order,
                    activeMerge: t.activeMerge // Pass through the merge info from backend
                };
            });

            // Normalize reservations for the DiningHall UI
            const mappedReservations = (reservationsRes.data || reservationsRes || []).map(r => ({
                ...r,
                id: r._id,
                tableId: r.tableId?._id || r.tableId, // Ensure it's a string ID
                date: new Date(r.reservationTime).toISOString().split("T")[0], // Add YYYY-MM-DD
                time: new Date(r.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

            // IMPORTANT:
            // We poll the backend every ~10s. If a cashier is building a cart locally (not yet saved/sent),
            // the backend won't know about those draft items. Replacing `tables` outright would wipe the cart
            // and make the UI total "disappear after some time".
            setTables((prev) => {
                const prevById = new Map((prev || []).map((t) => [String(t.id || t._id), t]));

                return mappedTables.map((nextTable) => {
                    const key = String(nextTable.id || nextTable._id);
                    const prevTable = prevById.get(key);
                    if (!prevTable) return nextTable;

                    const prevOrder = prevTable.order;
                    const nextOrder = nextTable.order;

                    const prevItemsCount = prevOrder?.items?.length || 0;
                    if (prevItemsCount === 0) {
                        // Keep some local fields if backend didn't send them
                        return {
                            ...nextTable,
                            startTime: nextTable.startTime ?? prevTable.startTime ?? null,
                        };
                    }

                    const prevOrderId = prevOrder?.orderId;
                    const nextOrderId = nextOrder?.orderId;
                    const prevHasBackendOrder = Boolean(prevOrderId);
                    const nextHasBackendOrder = Boolean(nextOrderId);
                    const isSameBackendOrder =
                        prevHasBackendOrder &&
                        nextHasBackendOrder &&
                        String(prevOrderId) === String(nextOrderId);

                    // Preserve local draft carts:
                    // - If no backend order id yet (purely local cart), always keep it.
                    // - If this is the currently active table and we're still on the same backend order,
                    //   keep the local items to avoid losing unsent edits between polls.
                    const shouldPreserveLocalOrder =
                        !prevHasBackendOrder ||
                        (String(activeTableId) === key && (isSameBackendOrder || !nextHasBackendOrder));

                    if (!shouldPreserveLocalOrder) {
                        return {
                            ...nextTable,
                            startTime: nextTable.startTime ?? prevTable.startTime ?? null,
                        };
                    }

                    return {
                        ...nextTable,
                        status: prevTable.status ?? nextTable.status,
                        startTime: prevTable.startTime ?? nextTable.startTime ?? null,
                        order: prevOrder,
                    };
                });
            });
            setCategories(categoriesRes.data || categoriesRes || []);
            setReservations(mappedReservations);
        } catch (error) {
            console.error("Failed to fetch dining data:", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [activeBranchId, activeTableId, user, enabledModules]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const isDiningEnabled = enabledModules?.DINING;
        const isReservationsEnabled = enabledModules?.RESERVATIONS;

        if (!isDiningEnabled && !isReservationsEnabled) {
            setLoading(false);
            return;
        }
        
        fetchDiningData();

        // Refresh dining hall data every 10 seconds to catch remote updates/reservations
        const intervalId = setInterval(() => {
            fetchDiningData(true);
        }, 10000);

        return () => clearInterval(intervalId);
    }, [user, fetchDiningData, enabledModules]);

    const getTableDuration = (startTime) => {
        if (!startTime) return null;
        const diff = currentTime - (typeof startTime === 'string' ? new Date(startTime).getTime() : startTime);
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

    const handleCheckInReservation = async (reservation) => {
        if (!reservation.tableId) {
            alert("Please assign a table to this reservation before checking in.");
            return;
        }
        const table = tables.find((t) => t.id === reservation.tableId);
        if (!table) {
            alert("Assigned table not found.");
            return;
        }

        try {
            // Update table status in backend
            await tableService.updateTable(table.id, { status: "OCCUPIED" });

            // Local update
            setTables(prev => prev.map(t =>
                t.id === table.id ? { ...t, status: "OCCUPIED", startTime: Date.now() } : t
            ));

            setReservations(prev => prev.map(r =>
                r.id === reservation.id ? { ...r, status: "Checked-in" } : r
            ));

            return table.id;
        } catch (error) {
            console.error("Failed to check in:", error);
            alert("Check-in failed. Please try again.");
        }
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

    const joinTables = async (tableIds) => {
        if (!tableIds || tableIds.length < 2) return;

        const primaryTableId = tableIds[0];
        const secondaryTableIds = tableIds.slice(1);

        try {
            await tableMergeService.mergeTables({
                primaryTableId,
                mergedTables: secondaryTableIds
            });

            // Refresh tables to get updated statuses from backend
            await fetchDiningData();
        } catch (error) {
            console.error("Failed to join tables:", error);
            alert("Failed to join tables.");
        }
    };

    return (
        <DiningContext.Provider
            value={{
                tables,
                setTables,
                categories,
                loading,
                activeTableId,
                setActiveTableId,
                reservations,
                setReservations,
                getTableDuration,
                handleCheckInReservation,
                handleCompleteKOT,
                joinTables,
                refreshData: fetchDiningData
            }}
        >
            {children}
        </DiningContext.Provider>
    );
};
