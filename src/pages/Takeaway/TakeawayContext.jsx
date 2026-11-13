import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { orderService, settingService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

const TakeawayContext = createContext();

export const useTakeaway = () => useContext(TakeawayContext);

const getActiveShopScope = (shopId, branchId) => {
    const s = shopId || (typeof localStorage !== 'undefined' && localStorage.getItem("pos_shopId")) || "default_shop";
    const b = branchId || (typeof localStorage !== 'undefined' && localStorage.getItem("pos_activeBranchId")) || "default_branch";
    return `${s}:${b}`;
};

const getTabsStorageKey = (scope) => `pos_active_tabs_${scope}`;
const getActiveTabStorageKey = (scope) => `pos_active_tab_id_${scope}`;

const INITIAL_TAB_DATA = {
    takeawayOrder: {
        items: [],
        isSentToKOT: false,
        orderType: (typeof localStorage !== 'undefined' && localStorage.getItem("activePosOrderType")) || 'DIRECT_SALE',
    },
    takeawayCustName: "",
    takeawayCustPhone: "",
    selectedCustomer: null,
    billDiscount: { type: "flat", value: 0 },
    loyaltyDiscount: { points: 0, amount: 0 },
    isTakeaway: true,
    tableId: null
};

const createTab = (id, name, tableId = null) => {
    const formattedId = String(id).padStart(5, '0');
    const defaultType = (typeof localStorage !== 'undefined' && localStorage.getItem("activePosOrderType")) || 'DIRECT_SALE';
    const tabData = JSON.parse(JSON.stringify(INITIAL_TAB_DATA));
    tabData.takeawayOrder.orderType = defaultType;
    return {
        id,
        name: name || `Tab ${id}`,
        orderName: `ORD-${formattedId}`,
        ...tabData,
        tableId: tableId || null,
        isTakeaway: !tableId
    };
};

const loadPersistedSaleTabs = (scope) => {
    if (!scope) return [createTab(1)];
    try {
        const saved = localStorage.getItem(getTabsStorageKey(scope));
        if (!saved) return [createTab(1)];
        const parsed = JSON.parse(saved);
        const saleTabs = Array.isArray(parsed) ? parsed.filter((t) => !t.tableId) : [];
        return saleTabs.length > 0 ? saleTabs : [createTab(1)];
    } catch {
        return [createTab(1)];
    }
};

const loadPersistedActiveTabId = (scope) => {
    if (!scope) return 1;
    try {
        const saved = localStorage.getItem(getActiveTabStorageKey(scope));
        return saved ? Number(saved) : 1;
    } catch {
        return 1;
    }
};

export const TakeawayProvider = ({ children }) => {
    const { user } = useAuth();
    const { currentShopId, activeBranchId } = useApp();

    const currentScope = getActiveShopScope(currentShopId, activeBranchId);
    const prevScopeRef = useRef(currentScope);

    // Unique client session ID to distinguish events originating from this tab instance
    const clientSessionIdRef = useRef(`client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const lastRemoteSyncedAtRef = useRef(0);

    // Multi-tab state with persistence scoped strictly per shop & branch
    const [tabs, setTabs] = useState(() => loadPersistedSaleTabs(currentScope));
    const [activeTabId, setActiveTabId] = useState(() => loadPersistedActiveTabId(currentScope));

    // Active tab state
    const [isTakeaway, setIsTakeaway] = useState(false);
    const [takeawayOrder, setTakeawayOrder] = useState(() => {
        const savedType = (typeof localStorage !== 'undefined' && localStorage.getItem("activePosOrderType")) || 'DIRECT_SALE';
        return {
            ...INITIAL_TAB_DATA.takeawayOrder,
            orderType: savedType
        };
    });
    const [takeawayCustName, setTakeawayCustName] = useState("");
    const [takeawayCustPhone, setTakeawayCustPhone] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [billDiscount, setBillDiscount] = useState({ type: "flat", value: 0 });
    const [loyaltyDiscount, setLoyaltyDiscount] = useState({ points: 0, amount: 0 });
    const [tableId, setTableId] = useState(null);

    // Keep active values in refs for safe event handlers and debounce sync
    const activeTabIdRef = useRef(activeTabId);
    activeTabIdRef.current = activeTabId;
    const takeawayOrderRef = useRef(takeawayOrder);
    takeawayOrderRef.current = takeawayOrder;
    const takeawayCustNameRef = useRef(takeawayCustName);
    takeawayCustNameRef.current = takeawayCustName;
    const takeawayCustPhoneRef = useRef(takeawayCustPhone);
    takeawayCustPhoneRef.current = takeawayCustPhone;
    const selectedCustomerRef = useRef(selectedCustomer);
    selectedCustomerRef.current = selectedCustomer;
    const billDiscountRef = useRef(billDiscount);
    billDiscountRef.current = billDiscount;
    const loyaltyDiscountRef = useRef(loyaltyDiscount);
    loyaltyDiscountRef.current = loyaltyDiscount;

    // Flag to prevent persistence loops during reset or remote updates
    const isResettingRef = useRef(false);
    const persistTimeoutRef = useRef(null);
    const syncBackendTimeoutRef = useRef(null);
    const prevActiveTabIdRef = useRef(activeTabId);

    // Broadcast tab changes to other browser tabs/windows in real time (0ms)
    const broadcastTabsUpdate = useCallback((updatedTabs, activeId) => {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel(`pos_tab_channel_${currentScope}`);
                channel.postMessage({
                    type: 'SYNC_TABS',
                    tabs: updatedTabs,
                    activeTabId: activeId,
                    senderId: clientSessionIdRef.current,
                    timestamp: Date.now()
                });
                channel.close();
            }
        } catch (e) { }
    }, [currentScope]);

    // Debounced sync to backend Setting (for cross-user and cross-device live sync per branch)
    const syncTabsToBackend = useCallback((tabsToSave, activeId) => {
        if (!currentShopId) return;

        if (syncBackendTimeoutRef.current) {
            clearTimeout(syncBackendTimeoutRef.current);
        }

        syncBackendTimeoutRef.current = setTimeout(async () => {
            try {
                const now = Date.now();
                lastRemoteSyncedAtRef.current = now;

                const sanitized = tabsToSave.map(t => ({
                    id: t.id,
                    name: t.name,
                    orderName: t.orderName,
                    takeawayOrder: t.takeawayOrder,
                    takeawayCustName: t.takeawayCustName,
                    takeawayCustPhone: t.takeawayCustPhone,
                    selectedCustomer: t.selectedCustomer,
                    billDiscount: t.billDiscount,
                    loyaltyDiscount: t.loyaltyDiscount,
                    isTakeaway: t.isTakeaway,
                    tableId: null
                }));

                await settingService.updateSetting('POS_ACTIVE_TABS', {
                    value: {
                        tabs: sanitized,
                        activeTabId: activeId,
                        updatedAt: now,
                        clientSessionId: clientSessionIdRef.current,
                        updatedBy: user?._id || user?.id || 'staff'
                    },
                    shopId: currentShopId,
                    branchId: activeBranchId || null
                });
            } catch (err) {
                // Silently ignore network failures
            }
        }, 500);
    }, [currentShopId, activeBranchId, user]);

    // Handle incoming remote tabs from BroadcastChannel or server polling
    const handleRemoteTabsUpdate = useCallback((remoteTabs, remoteActiveTabId, timestamp) => {
        if (!Array.isArray(remoteTabs) || remoteTabs.length === 0) return;

        setTabs(prevTabs => {
            const merged = remoteTabs.map(rt => {
                const local = prevTabs.find(lt => lt.id === rt.id);
                if (!local) return rt;
                // If this is currently active tab and user is actively working on it, keep local active state
                if (rt.id === activeTabIdRef.current) {
                    return {
                        ...rt,
                        takeawayOrder: takeawayOrderRef.current || rt.takeawayOrder,
                        takeawayCustName: takeawayCustNameRef.current ?? rt.takeawayCustName,
                        takeawayCustPhone: takeawayCustPhoneRef.current ?? rt.takeawayCustPhone,
                        selectedCustomer: selectedCustomerRef.current ?? rt.selectedCustomer,
                        billDiscount: billDiscountRef.current ?? rt.billDiscount,
                        loyaltyDiscount: loyaltyDiscountRef.current ?? rt.loyaltyDiscount,
                    };
                }
                return rt;
            });

            try {
                localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify(merged));
            } catch (e) { }

            return merged;
        });

        // If current active tab was closed remotely, safely fallback to an existing tab
        setActiveTabId(prevActiveId => {
            const exists = remoteTabs.some(t => t.id === prevActiveId);
            if (!exists) {
                const fallback = remoteTabs[0];
                const fallbackId = fallback ? fallback.id : 1;
                try {
                    localStorage.setItem(getActiveTabStorageKey(currentScope), String(fallbackId));
                } catch (e) { }
                return fallbackId;
            }
            return prevActiveId;
        });
    }, [currentScope]);

    // Listen for local BroadcastChannel events from other tabs in the same branch
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        let channel = null;
        try {
            channel = new BroadcastChannel(`pos_tab_channel_${currentScope}`);
            channel.onmessage = (event) => {
                const data = event?.data;
                if (!data || data.senderId === clientSessionIdRef.current) return;
                if (data.type === 'SYNC_TABS' && Array.isArray(data.tabs)) {
                    handleRemoteTabsUpdate(data.tabs, data.activeTabId, data.timestamp);
                }
            };
        } catch (e) { }

        return () => {
            if (channel) {
                try { channel.close(); } catch (e) { }
            }
        };
    }, [currentScope, handleRemoteTabsUpdate]);

    // Background polling: check server Setting for live tabs added/changed by other branch users
    useEffect(() => {
        if (!currentShopId) return;

        let isMounted = true;
        const pollInterval = setInterval(async () => {
            if (document.hidden || isResettingRef.current) return;
            try {
                const res = await settingService.getSettingByKey('POS_ACTIVE_TABS', currentShopId, activeBranchId || null);
                if (!isMounted || !res?.value) return;

                const { tabs: remoteTabs, updatedAt, clientSessionId, activeTabId: remoteActiveTabId } = res.value;
                if (
                    clientSessionId !== clientSessionIdRef.current &&
                    updatedAt &&
                    updatedAt > (lastRemoteSyncedAtRef.current || 0) &&
                    Array.isArray(remoteTabs) &&
                    remoteTabs.length > 0
                ) {
                    lastRemoteSyncedAtRef.current = updatedAt;
                    handleRemoteTabsUpdate(remoteTabs, remoteActiveTabId, updatedAt);
                }
            } catch (err) {
                // Ignore if setting doesn't exist yet
            }
        }, 3500);

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [currentShopId, activeBranchId, currentScope, handleRemoteTabsUpdate]);

    // When switching shops or branches: strictly load tabs belonging to the selected shop & branch
    useEffect(() => {
        if (prevScopeRef.current === currentScope) return;
        prevScopeRef.current = currentScope;

        isResettingRef.current = true;

        const savedTabs = loadPersistedSaleTabs(currentScope);
        const savedActiveId = loadPersistedActiveTabId(currentScope);
        const activeTab = savedTabs.find(t => t.id === savedActiveId) || savedTabs[0] || createTab(1);

        setTabs(savedTabs);
        setActiveTabId(activeTab.id);
        prevActiveTabIdRef.current = activeTab.id;

        setIsTakeaway(activeTab.isTakeaway);
        setTakeawayOrder(activeTab.takeawayOrder);
        setTakeawayCustName(activeTab.takeawayCustName || "");
        setTakeawayCustPhone(activeTab.takeawayCustPhone || "");
        setSelectedCustomer(activeTab.selectedCustomer || null);
        setBillDiscount(activeTab.billDiscount || { type: "flat", value: 0 });
        setLoyaltyDiscount(activeTab.loyaltyDiscount || { points: 0, amount: 0 });
        setTableId(null);

        // Fetch remote tabs from server for newly selected shop/branch
        if (currentShopId) {
            settingService.getSettingByKey('POS_ACTIVE_TABS', currentShopId, activeBranchId || null)
                .then(res => {
                    if (res?.value?.tabs && Array.isArray(res.value.tabs) && res.value.tabs.length > 0) {
                        lastRemoteSyncedAtRef.current = res.value.updatedAt || Date.now();
                        handleRemoteTabsUpdate(res.value.tabs, res.value.activeTabId, res.value.updatedAt);
                    }
                })
                .catch(() => { });
        }

        setTimeout(() => {
            isResettingRef.current = false;
        }, 250);
    }, [currentScope, currentShopId, activeBranchId, handleRemoteTabsUpdate]);

    // Sync: Load active tab data into states when activeTabId changes
    useEffect(() => {
        if (isResettingRef.current) return;
        
        const isTabSwitch = prevActiveTabIdRef.current !== activeTabId;
        if (isTabSwitch) {
            prevActiveTabIdRef.current = activeTabId;
            const targetTab = tabs.find(t => t.id === activeTabId);
            if (targetTab) {
                setIsTakeaway(targetTab.isTakeaway);
                setTakeawayOrder(targetTab.takeawayOrder);
                setTakeawayCustName(targetTab.takeawayCustName || "");
                setTakeawayCustPhone(targetTab.takeawayCustPhone || "");
                setSelectedCustomer(targetTab.selectedCustomer || null);
                setBillDiscount(targetTab.billDiscount || { type: "flat", value: 0 });
                setLoyaltyDiscount(targetTab.loyaltyDiscount || { points: 0, amount: 0 });
                setTableId(targetTab.tableId || null);
            }
        }
    }, [activeTabId, tabs]);

    // Persistence: Sync active takeaway tab state to the tabs array and localStorage & backend
    useEffect(() => {
        if (isResettingRef.current) return;
        const shouldPersistTabs = !tableId;

        if (!shouldPersistTabs) {
            try {
                localStorage.setItem(getActiveTabStorageKey(currentScope), activeTabId.toString());
            } catch (e) { }
            return;
        }

        if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
        }

        persistTimeoutRef.current = setTimeout(() => {
            setTabs((prevTabs) => {
                const updatedTabs = prevTabs.map(t => {
                    if (t.id === activeTabId) {
                        return {
                            ...t,
                            isTakeaway,
                            takeawayOrder,
                            takeawayCustName,
                            takeawayCustPhone,
                            selectedCustomer,
                            billDiscount,
                            loyaltyDiscount,
                            tableId: null
                        };
                    }
                    return t;
                });

                if (JSON.stringify(updatedTabs) !== JSON.stringify(prevTabs)) {
                    try {
                        localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify(updatedTabs));
                        localStorage.setItem(getActiveTabStorageKey(currentScope), activeTabId.toString());
                    } catch (e) { }

                    broadcastTabsUpdate(updatedTabs, activeTabId);
                    syncTabsToBackend(updatedTabs, activeTabId);
                    return updatedTabs;
                }
                return prevTabs;
            });

            try {
                localStorage.setItem(getActiveTabStorageKey(currentScope), activeTabId.toString());
            } catch (e) { }
        }, 200);

        return () => {
            if (persistTimeoutRef.current) {
                clearTimeout(persistTimeoutRef.current);
            }
        };
    }, [isTakeaway, takeawayOrder, takeawayCustName, takeawayCustPhone, selectedCustomer, billDiscount, loyaltyDiscount, tableId, activeTabId, currentScope, broadcastTabsUpdate, syncTabsToBackend]);

    const addTab = () => {
        const nextId = Math.max(0, ...tabs.map(t => Number(t.id) || 0)) + 1;
        const newTab = createTab(nextId);
        const updatedTabs = [...tabs, newTab];
        setTabs(updatedTabs);
        setActiveTabId(nextId);

        try {
            localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify(updatedTabs));
            localStorage.setItem(getActiveTabStorageKey(currentScope), nextId.toString());
        } catch (e) { }

        broadcastTabsUpdate(updatedTabs, nextId);
        syncTabsToBackend(updatedTabs, nextId);
    };

    const addTableTab = (tId, tName) => {
        setTableId(tId);
        setIsTakeaway(false);
        setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'DINE_IN' });
        setTakeawayCustName(tName || "");
        setTakeawayCustPhone("");
        setSelectedCustomer(null);
        setBillDiscount({ type: "flat", value: 0 });
        setLoyaltyDiscount({ points: 0, amount: 0 });
    };

    const switchTab = (id) => {
        if (id === activeTabId) return;
        setActiveTabId(id);
        try {
            localStorage.setItem(getActiveTabStorageKey(currentScope), id.toString());
        } catch (e) { }
    };

    const closeTab = (id, e, skipDelete = false) => {
        if (e) e.stopPropagation();

        const targetTab = tabs.find(t => t.id === id);
        const draftOrderId = targetTab?.takeawayOrder?.orderId || (id === activeTabId ? takeawayOrder?.orderId : null);

        if (draftOrderId && !skipDelete) {
            orderService.deleteOrder(draftOrderId).catch(err => console.error("Failed to delete draft order on close tab:", err));
        }

        if (tabs.length === 1) {
            // Closing the only open tab: clear current tab completely and replace with a fresh, blank Tab 1
            isResettingRef.current = true;
            
            const freshTabId = 1;
            const freshTab = createTab(freshTabId, "Tab 1");

            setTakeawayOrder(freshTab.takeawayOrder);
            setTakeawayCustName("");
            setTakeawayCustPhone("");
            setSelectedCustomer(null);
            setBillDiscount({ type: "flat", value: 0 });
            setLoyaltyDiscount({ points: 0, amount: 0 });
            setIsTakeaway(true);
            setTableId(null);

            setTabs([freshTab]);
            setActiveTabId(freshTabId);

            try {
                localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify([freshTab]));
                localStorage.setItem(getActiveTabStorageKey(currentScope), freshTabId.toString());
            } catch (e) { }

            broadcastTabsUpdate([freshTab], freshTabId);
            syncTabsToBackend([freshTab], freshTabId);

            setTimeout(() => {
                isResettingRef.current = false;
            }, 300);
            return;
        }

        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);

        let nextActiveId = activeTabId;
        if (activeTabId === id) {
            const remainingTab = newTabs[newTabs.length - 1];
            nextActiveId = remainingTab.id;
            setActiveTabId(nextActiveId);
        }

        try {
            localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify(newTabs));
            localStorage.setItem(getActiveTabStorageKey(currentScope), nextActiveId.toString());
        } catch (e) { }

        broadcastTabsUpdate(newTabs, nextActiveId);
        syncTabsToBackend(newTabs, nextActiveId);
    };

    const reorderTabs = (fromIndex, toIndex) => {
        setTabs(prev => {
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) return prev;
            const newTabs = [...prev];
            const [movedTab] = newTabs.splice(fromIndex, 1);
            newTabs.splice(toIndex, 0, movedTab);
            try {
                localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify(newTabs));
            } catch (e) { }

            broadcastTabsUpdate(newTabs, activeTabId);
            syncTabsToBackend(newTabs, activeTabId);
            return newTabs;
        });
    };

    const resetTakeaway = (skipDelete = true) => {
        const draftOrderId = takeawayOrder?.orderId;
        if (draftOrderId && !skipDelete) {
            orderService.deleteOrder(draftOrderId).catch(err => console.error("Failed to delete draft order on resetTakeaway:", err));
        }

        isResettingRef.current = true;
        
        const resetOrder = {
            ...INITIAL_TAB_DATA.takeawayOrder,
            orderType: takeawayOrder?.orderType || 'TAKEAWAY'
        };

        setTakeawayOrder(resetOrder);
        setTakeawayCustName("");
        setTakeawayCustPhone("");
        setSelectedCustomer(null);
        setBillDiscount({ type: "flat", value: 0 });
        setLoyaltyDiscount({ points: 0, amount: 0 });
        setIsTakeaway(true);
        setTableId(null);
        
        setTabs(prev => {
            const updated = prev.map(t => {
                if (t.id === activeTabId) {
                    return {
                        ...t,
                        takeawayOrder: resetOrder,
                        takeawayCustName: "",
                        takeawayCustPhone: "",
                        selectedCustomer: null,
                        billDiscount: { type: "flat", value: 0 },
                        loyaltyDiscount: { points: 0, amount: 0 },
                        isTakeaway: true,
                        tableId: null
                    };
                }
                return t;
            });
            try {
                localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify(updated));
            } catch (e) { }

            broadcastTabsUpdate(updated, activeTabId);
            syncTabsToBackend(updated, activeTabId);
            return updated;
        });
        
        setTimeout(() => {
            isResettingRef.current = false;
        }, 300);
    };

    const clearAllTabs = () => {
        tabs.forEach(t => {
            const draftOrderId = t.takeawayOrder?.orderId;
            if (draftOrderId) {
                orderService.deleteOrder(draftOrderId).catch(err => console.error("Failed to delete draft order on clearAllTabs:", err));
            }
        });
        const resetTab = createTab(1);
        setTabs([resetTab]);
        setActiveTabId(1);
        try {
            localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify([resetTab]));
            localStorage.setItem(getActiveTabStorageKey(currentScope), "1");
        } catch (e) { }

        broadcastTabsUpdate([resetTab], 1);
        syncTabsToBackend([resetTab], 1);
        resetTakeaway();
    };

    const activateSaleTab = React.useCallback((orderTypeOverride) => {
        const targetType = orderTypeOverride || localStorage.getItem("activePosOrderType") || 'DIRECT_SALE';
        try { localStorage.setItem("activePosOrderType", targetType); } catch (e) {}

        setIsTakeaway(true);
        setTableId(null);

        setTakeawayOrder(prev => {
            const updated = {
                ...(prev || INITIAL_TAB_DATA.takeawayOrder),
                orderType: targetType
            };
            return updated;
        });
    }, []);

    const loadHistorySale = (orderState, customerName, customerPhone, selectedCustomerData, historyEditBaseline) => {
        const nextOrder = {
            ...orderState,
            historyEditBaseline,
        };

        setIsTakeaway(true);
        setTableId(null);
        setTakeawayOrder(nextOrder);
        setTakeawayCustName(customerName || "");
        setTakeawayCustPhone(customerPhone || "");
        setSelectedCustomer(selectedCustomerData || null);

        setTabs((prev) => {
            const updated = prev.map((tab) => (
                tab.id === activeTabId
                    ? {
                        ...tab,
                        isTakeaway: true,
                        tableId: null,
                        takeawayOrder: nextOrder,
                        takeawayCustName: customerName || "",
                        takeawayCustPhone: customerPhone || "",
                        selectedCustomer: selectedCustomerData || null,
                        billDiscount: selectedCustomerData?.discountPercentage > 0 
                            ? { type: 'percent', value: Math.min(100, Math.max(0, Number(selectedCustomerData.discountPercentage) || 0)) }
                            : { type: "flat", value: 0 }
                    }
                    : tab
            ));
            try {
                localStorage.setItem(getTabsStorageKey(currentScope), JSON.stringify(updated));
            } catch (e) { }

            broadcastTabsUpdate(updated, activeTabId);
            syncTabsToBackend(updated, activeTabId);
            return updated;
        });
    };

    return (
        <TakeawayContext.Provider
            value={{
                isTakeaway,
                setIsTakeaway,
                takeawayOrder,
                setTakeawayOrder,
                takeawayCustName,
                setTakeawayCustName,
                takeawayCustPhone,
                setTakeawayCustPhone,
                selectedCustomer,
                setSelectedCustomer,
                billDiscount,
                setBillDiscount,
                loyaltyDiscount,
                setLoyaltyDiscount,
                tableId,
                setTableId,
                resetTakeaway,
                // Multi-tab exports
                tabs,
                activeTabId,
                setActiveTabId,
                addTab,
                addNewTab: addTab,
                addTableTab,
                switchTab,
                closeTab,
                clearAllTabs,
                activateSaleTab,
                loadHistorySale,
                reorderTabs
            }}
        >
            {children}
        </TakeawayContext.Provider>
    );
};
