import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import api, { tableService, tableMergeService, diningCategoryService } from "../../services/api";
import { reservationsService } from "../Reservations/ReservationsService";

const DiningContext = createContext();

export const useDining = () => useContext(DiningContext);

export const DiningProvider = ({ children }) => {
    const { currentTime, activeBranchId, enabledModules, branches } = useApp();
    const { user } = useAuth();
    const [tables, setTables] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTableId, setActiveTableId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState([]);

    const resolveBranchId = useCallback(() => (
        activeBranchId ||
        user?.branch_id ||
        user?.branchId ||
        user?.branch ||
        (user?.branchIds?.length ? user.branchIds[0] : null) ||
        branches?.[0]?._id ||
        null
    ), [activeBranchId, user, branches]);

    const fetchDiningData = useCallback(async (isPolling = false) => {
        const branchId = resolveBranchId();

        if (!branchId) {
            if (!isPolling) {
                setTables([]);
                setCategories([]);
                setLoading(false);
            }
            return;
        }

        const isDiningEnabled = enabledModules?.DINING;
        const isReservationsEnabled = enabledModules?.RESERVATIONS;
        const isKdsEnabled = enabledModules?.KDS;

        if (!isPolling) setLoading(true);
        try {
            const results = await Promise.allSettled([
                tableService.getTables({ all: true, branchId }),
                diningCategoryService.getCategories({ all: true, branchId }),
                isReservationsEnabled ? reservationsService.getReservations({
                    branchId,
                    date: new Date().toISOString().split("T")[0],
                    status: 'CONFIRMED'
                }) : Promise.resolve({ data: [] }),
                isDiningEnabled
                    ? tableService.getActiveTableOrders({ branchId })
                    : Promise.resolve({ data: [] }),
                (isKdsEnabled || isDiningEnabled)
                    ? api.get('/kitchen/kots', { params: { branchId } })
                    : Promise.resolve({ data: [] })
            ]);

            const unwrap = (result, fallback = null) => (
                result.status === 'fulfilled' ? result.value : fallback
            );

            const tablesRes = unwrap(results[0], []);
            const categoriesRes = unwrap(results[1], { data: [] });
            const reservationsRes = unwrap(results[2], { data: [] });
            const ordersRes = unwrap(results[3], { data: [] });
            const kotsRes = unwrap(results[4], { data: [] });

            if (results.some((r) => r.status === 'rejected')) {
                console.warn('Some dining hall data failed to load:', results.filter((r) => r.status === 'rejected'));
            }

            const activeOrders = ordersRes?.data || ordersRes || [];
            const ordersByTableId = new Map();
            (Array.isArray(activeOrders) ? activeOrders : []).forEach((order) => {
                const oTableId = order.tableId;
                if (!oTableId) return;
                const oTableIdStr = typeof oTableId === 'object'
                    ? String(oTableId._id || oTableId.id || oTableId)
                    : String(oTableId);
                if (!ordersByTableId.has(oTableIdStr)) {
                    ordersByTableId.set(oTableIdStr, order);
                }
            });

            const activeKots = kotsRes?.data || kotsRes || [];

            const rawCategories = categoriesRes?.data || categoriesRes || [];
            const activeCategories = (Array.isArray(rawCategories) ? rawCategories : [])
                .filter((cat) => cat.isActive !== false);
            const activeCategoryIds = new Set(
                activeCategories.map((cat) => String(cat._id || cat.id))
            );

            const rawTables = Array.isArray(tablesRes) ? tablesRes : (tablesRes?.data || []);
            const displayTables = rawTables.filter((table) => {
                if (table.isActive === false) return false;
                const categoryId = String(table.diningCategoryId?._id || table.diningCategoryId || '');
                return !categoryId || activeCategoryIds.has(categoryId);
            });

            // Map backend _id to id for frontend consistency and merge active orders
            const mappedTables = displayTables.map(t => {
                const tableId = String(t._id);
                const activeOrderForTable = ordersByTableId.get(tableId) || null;

                let status = (t.status || "available").toLowerCase();
                let order = null;

                if (activeOrderForTable) {
                    status = "occupied";

                    // Check if any KOT for this order is not served
                    const tableKots = activeKots.filter(kot => {
                        const kotOrderId = kot.orderId?._id || kot.orderId;
                        return String(kotOrderId) === String(activeOrderForTable._id);
                    });

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
                        grandTotal: activeOrderForTable.grandTotal,
                        items: (activeOrderForTable.items || []).map(item => ({
                            ...item,
                            id: item.itemId?._id || item.itemId,
                            name: item.itemId?.name || item.itemName,
                            price: item.price ?? item.itemId?.pricing?.sellingPrice ?? 0,
                            sellingPrice: item.price ?? item.itemId?.pricing?.sellingPrice ?? 0,
                            taxPercent: item.taxPercent ?? 0,
                            // If the order already has at least one KOT, treat backend quantities as already sent
                            // so the POS can generate incremental KOTs only for newly added/increased items.
                            sentQuantity: (tableKots.length > 0 ? (item.quantity ?? 0) : (item.sentQuantity ?? 0)),
                        })),
                        isSentToKOT: tableKots.length > 0,
                        kotStatus: kotStatus,
                        // Use startedAt from a PREPARING/READY kot (when KDS worker started it),
                        // fall back to the earliest KOT's createdAt
                        kotSentAt: (() => {
                            const preparingKot = tableKots.find(k => k.startedAt);
                            return preparingKot ? preparingKot.startedAt : (tableKots.length > 0 ? tableKots[0].createdAt : null);
                        })(),
                        // Staff info
                        createdBy: activeOrderForTable.createdBy,
                        managedBy: activeOrderForTable.managedBy,
                        servedBy: activeOrderForTable.servedBy,
                        actedBy: activeOrderForTable.actedBy || [],
                        createdAt: activeOrderForTable.createdAt,
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
                    const hasLocalPending = Boolean(prevOrder?._localDraftPending);

                    const prevOrderId = prevOrder?.orderId;
                    const nextOrderId = nextOrder?.orderId;
                    const prevHasBackendOrder = Boolean(prevOrderId);
                    const nextHasBackendOrder = Boolean(nextOrderId);
                    const isSameBackendOrder =
                        prevHasBackendOrder &&
                        nextHasBackendOrder &&
                        String(prevOrderId) === String(nextOrderId);

                    // Only keep unsynced local edits on the active table; everyone else uses backend
                    const shouldPreserveLocalOrder =
                        hasLocalPending &&
                        String(activeTableId) === key &&
                        prevItemsCount > 0 &&
                        (isSameBackendOrder || !nextHasBackendOrder);

                    if (!shouldPreserveLocalOrder) {
                        return {
                            ...nextTable,
                            status: nextOrder ? 'occupied' : (nextTable.status || 'available'),
                            startTime: nextTable.startTime ?? prevTable.startTime ?? (nextOrder?.createdAt ? new Date(nextOrder.createdAt).getTime() : null),
                        };
                    }

                    return {
                        ...nextTable,
                        status: 'occupied',
                        startTime: prevTable.startTime ?? nextTable.startTime ?? (nextOrder?.createdAt ? new Date(nextOrder.createdAt).getTime() : null),
                        order: {
                            ...nextOrder,
                            ...prevOrder,
                            items: prevOrder.items,
                            orderId: nextOrder?.orderId ?? prevOrder?.orderId,
                            orderNumber: nextOrder?.orderNumber ?? prevOrder?.orderNumber,
                            grandTotal: nextOrder?.grandTotal ?? prevOrder?.grandTotal,
                            createdBy: nextOrder?.createdBy ?? prevOrder.createdBy,
                            managedBy: nextOrder?.managedBy ?? prevOrder.managedBy,
                            servedBy: nextOrder?.servedBy ?? prevOrder.servedBy,
                            actedBy: nextOrder?.actedBy ?? prevOrder.actedBy ?? [],
                            isSentToKOT: nextOrder?.isSentToKOT ?? prevOrder?.isSentToKOT,
                            kotStatus: nextOrder?.kotStatus ?? prevOrder?.kotStatus,
                            kotSentAt: nextOrder?.kotSentAt ?? prevOrder?.kotSentAt,
                            _localDraftPending: true,
                        },
                    };
                });
            });
            setCategories(activeCategories);
            setReservations(mappedReservations);
        } catch (error) {
            console.error("Failed to fetch dining data:", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [resolveBranchId, activeTableId, user, enabledModules]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        
        fetchDiningData();

        const intervalId = setInterval(() => {
            fetchDiningData(true);
        }, 2500);

        return () => clearInterval(intervalId);
    }, [user, fetchDiningData, enabledModules]);

    const getTableDuration = (startTime) => {
        if (!startTime) return null;
        const diff = currentTime - (typeof startTime === 'string' ? new Date(startTime).getTime() : startTime);
        const minutes = Math.max(0, Math.floor(diff / 60000));
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
                t.id === table.id ? { ...t, status: "occupied", startTime: Date.now() } : t
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
