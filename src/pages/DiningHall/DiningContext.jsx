import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import api, { tableService, tableMergeService, diningCategoryService } from "../../services/api";
import { reservationsService } from "../Reservations/ReservationsService";
import { deduplicateCartItems } from "../../utils/cartStockUtils";

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

    const [hasPermissionError, setHasPermissionError] = useState(false);

    const fetchDiningData = useCallback(async (isPolling = false) => {
        const branchId = resolveBranchId();

        if (!branchId || hasPermissionError) {
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

        // Skip fetching if none of the dining/kds/reservation modules are enabled
        if (!isDiningEnabled && !isReservationsEnabled && !isKdsEnabled) {
            if (!isPolling) setLoading(false);
            return;
        }

        if (!isPolling) setLoading(true);
        try {
            const results = await Promise.allSettled([
                isDiningEnabled ? tableService.getTables({ all: true, branchId }) : Promise.resolve([]),
                isDiningEnabled ? diningCategoryService.getCategories({ all: true, branchId }) : Promise.resolve({ data: [] }),
                isReservationsEnabled ? reservationsService.getReservations({
                    branchId,
                    date: new Date().toISOString().split("T")[0]
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

            // Check if permission was denied (403 status code)
            const rejectedResults = results.filter((r) => r.status === 'rejected');
            if (rejectedResults.length > 0) {
                const isForbidden = rejectedResults.some(r => {
                    const status = r.reason?.response?.status || r.reason?.status;
                    return status === 403;
                });

                if (isForbidden) {
                    console.warn('Dining API returned 403 Forbidden. Disabling automatic polling for dining hall.');
                    setHasPermissionError(true);
                    if (!isPolling) setLoading(false);
                    return;
                }
                console.warn('Some dining hall data failed to load:', rejectedResults);
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

            const rawReservationsList = reservationsRes?.data || reservationsRes || [];
            const reservationsByTableId = new Map();
            const nowMs = Date.now();
            (Array.isArray(rawReservationsList) ? rawReservationsList : []).forEach((res) => {
                if (res.status === 'CANCELLED' || res.status === 'COMPLETED') return;

                // Automatically vacate table once reserved time + duration has passed
                const resTime = new Date(res.reservationTime).getTime();
                const durationMs = (res.durationMinutes || 120) * 60 * 1000;
                if (!isNaN(resTime) && (resTime + durationMs) <= nowMs) {
                    return;
                }

                const rTableId = res.tableId?._id || res.tableId;
                if (rTableId) {
                    reservationsByTableId.set(String(rTableId), res);
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

            // Map backend _id to id for frontend consistency and merge active orders/reservations
            const mappedTables = displayTables.map(t => {
                const tableId = String(t._id);
                const activeOrderForTable = ordersByTableId.get(tableId) || null;
                const activeReservationForTable = reservationsByTableId.get(tableId) || null;

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

                    const rawItems = (activeOrderForTable.items || []).map(item => ({
                        ...item,
                        id: item.itemId?._id || item.itemId,
                        name: item.itemId?.name || item.itemName,
                        price: item.price ?? item.itemId?.pricing?.sellingPrice ?? 0,
                        sellingPrice: item.price ?? item.itemId?.pricing?.sellingPrice ?? 0,
                        taxPercent: item.taxPercent ?? 0,
                        sentQuantity: (tableKots.length > 0 ? (item.quantity ?? 0) : (item.sentQuantity ?? 0)),
                    }));

                    // Deduplicate items to fix any duplicates from backend
                    const deduplicatedItems = deduplicateCartItems(rawItems);

                    order = {
                        orderId: activeOrderForTable._id,
                        orderNumber: activeOrderForTable.orderNumber,
                        grandTotal: activeOrderForTable.grandTotal,
                        items: deduplicatedItems,
                        isSentToKOT: tableKots.length > 0,
                        kotStatus: kotStatus,
                        kotSentAt: (() => {
                            const preparingKot = tableKots.find(k => k.startedAt);
                            return preparingKot ? preparingKot.startedAt : (tableKots.length > 0 ? tableKots[0].createdAt : null);
                        })(),
                        createdBy: activeOrderForTable.createdBy,
                        managedBy: activeOrderForTable.managedBy,
                        servedBy: activeOrderForTable.servedBy,
                        actedBy: activeOrderForTable.actedBy || [],
                        createdAt: activeOrderForTable.createdAt,
                    };
                } else if (activeReservationForTable) {
                    status = activeReservationForTable.status === 'SEATED' ? "occupied" : "reserved";
                }

                return {
                    ...t,
                    id: tableId,
                    name: `Table ${t.tableNumber}`,
                    status: status.toLowerCase(),
                    order,
                    activeMerge: t.activeMerge
                };
            });

            // Normalize reservations for the DiningHall UI
            const mappedReservations = (Array.isArray(rawReservationsList) ? rawReservationsList : []).map(r => ({
                ...r,
                id: r._id,
                tableId: r.tableId?._id || r.tableId,
                date: new Date(r.reservationTime).toISOString().split("T")[0],
                time: new Date(r.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

            setTables((prev) => {
                const prevById = new Map((prev || []).map((t) => [String(t.id || t._id), t]));

                return mappedTables.map((nextTable) => {
                    const key = String(nextTable.id || nextTable._id);
                    const prevTable = prevById.get(key);
                    if (!prevTable) return nextTable;

                    const prevOrder = prevTable.order;
                    const nextOrder = nextTable.order;

                    const prevItemsCount = prevOrder?.items?.length || 0;
                    const nextItemsCount = nextOrder?.items?.length || 0;
                    const hasLocalPending = Boolean(prevOrder?._localDraftPending);

                    const prevOrderId = prevOrder?.orderId;
                    const nextOrderId = nextOrder?.orderId;
                    const prevHasBackendOrder = Boolean(prevOrderId);
                    const nextHasBackendOrder = Boolean(nextOrderId);
                    const isSameBackendOrder =
                        prevHasBackendOrder &&
                        nextHasBackendOrder &&
                        String(prevOrderId) === String(nextOrderId);

                    const shouldPreserveLocalOrder =
                        hasLocalPending &&
                        String(activeTableId) === key &&
                        prevItemsCount > 0 &&
                        (isSameBackendOrder || !nextHasBackendOrder || prevItemsCount !== nextItemsCount);

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
    }, [resolveBranchId, activeTableId, user, enabledModules, hasPermissionError]);

    useEffect(() => {
        if (!user || hasPermissionError) {
            setLoading(false);
            return;
        }

        const isDiningEnabled = enabledModules?.DINING;
        const isReservationsEnabled = enabledModules?.RESERVATIONS;
        const isKdsEnabled = enabledModules?.KDS;

        if (!isDiningEnabled && !isReservationsEnabled && !isKdsEnabled) {
            setLoading(false);
            return;
        }
        
        fetchDiningData();

        // Poll every 10 seconds instead of 2.5 seconds to save resources & bandwidth
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible' && !hasPermissionError) {
                fetchDiningData(true);
            }
        }, 10000);

        return () => clearInterval(intervalId);
    }, [user, fetchDiningData, enabledModules, hasPermissionError]);

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
