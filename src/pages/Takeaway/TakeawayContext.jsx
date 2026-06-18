import React, { createContext, useContext, useState, useEffect } from "react";

const TakeawayContext = createContext();

export const useTakeaway = () => useContext(TakeawayContext);

const INITIAL_TAB_DATA = {
    takeawayOrder: {
        items: [],
        isSentToKOT: false,
        orderType: 'TAKEAWAY',
    },
    takeawayCustName: "",
    takeawayCustPhone: "",
    selectedCustomer: null,
    billDiscount: { type: "flat", value: 0 }, // Add tab-specific discount
    loyaltyDiscount: { points: 0, amount: 0 }, // Separate loyalty discount tracking
    isTakeaway: true,
    tableId: null
};

const createTab = (id, name, tableId = null) => ({
    id,
    name: name || `Tab ${id}`,
    ...JSON.parse(JSON.stringify(INITIAL_TAB_DATA)),
    tableId: tableId || null,
    isTakeaway: !tableId // If there's a tableId, it's not a takeaway tab
});

export const TakeawayProvider = ({ children }) => {
    // Multi-tab state with persistence — only stores sale tabs (no table orders)
    const [tabs, setTabs] = useState(() => {
        const saved = localStorage.getItem('pos_active_tabs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Filter out any stale table tabs that may have been saved previously
                const saleTabs = parsed.filter(t => !t.tableId);
                return saleTabs.length > 0 ? saleTabs : [createTab(1)];
            } catch (e) {
                return [createTab(1)];
            }
        }
        return [createTab(1)];
    });
    
    const [activeTabId, setActiveTabId] = useState(() => {
        const saved = localStorage.getItem('pos_active_tab_id');
        return saved ? Number(saved) : 1;
    });

    // Active tab state
    const [isTakeaway, setIsTakeaway] = useState(false);
    const [takeawayOrder, setTakeawayOrder] = useState(INITIAL_TAB_DATA.takeawayOrder);
    const [takeawayCustName, setTakeawayCustName] = useState("");
    const [takeawayCustPhone, setTakeawayCustPhone] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [billDiscount, setBillDiscount] = useState({ type: "flat", value: 0 }); // Add tab-specific discount state
    const [loyaltyDiscount, setLoyaltyDiscount] = useState({ points: 0, amount: 0 }); // Separate loyalty discount
    const [tableId, setTableId] = useState(null);
    
    // Flag to prevent persistence loop during reset
    const isResettingRef = React.useRef(false);
    const persistTimeoutRef = React.useRef(null);

    // Sync: Load active tab data into states when activeTabId changes
    useEffect(() => {
        if (isResettingRef.current) return; // Skip sync during reset
        
        const targetTab = tabs.find(t => t.id === activeTabId);
        if (targetTab) {
            setIsTakeaway(targetTab.isTakeaway);
            setTakeawayOrder(targetTab.takeawayOrder);
            setTakeawayCustName(targetTab.takeawayCustName || "");
            setTakeawayCustPhone(targetTab.takeawayCustPhone || "");
            setSelectedCustomer(targetTab.selectedCustomer || null);
            setBillDiscount(targetTab.billDiscount || { type: "flat", value: 0 }); // Load tab-specific discount
            setLoyaltyDiscount(targetTab.loyaltyDiscount || { points: 0, amount: 0 }); // Load loyalty discount
            setTableId(targetTab.tableId || null);
        }
    }, [activeTabId, tabs]);

    // Persistence: Sync active takeaway tab state to the tabs array and localStorage
    useEffect(() => {
        if (isResettingRef.current) return; // Skip persistence during reset
        
        const shouldPersistTabs = isTakeaway && !tableId;

        if (!shouldPersistTabs) {
            // Still remember which tab is active, but don't overwrite sale tabs
            localStorage.setItem('pos_active_tab_id', activeTabId.toString());
            return;
        }

        // Clear any pending persistence timeout
        if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
        }

        // Debounce persistence to avoid rapid updates
        persistTimeoutRef.current = setTimeout(() => {
            const updatedTabs = tabs.map(t => {
                if (t.id === activeTabId) {
                    return {
                        ...t,
                        isTakeaway,
                        takeawayOrder,
                        takeawayCustName,
                        takeawayCustPhone,
                        selectedCustomer,
                        billDiscount, // Save tab-specific discount
                        loyaltyDiscount, // Save loyalty discount
                        tableId: null
                    };
                }
                return t;
            });
            
            // Only update if something actually changed to avoid unnecessary renders
            const isDifferent = JSON.stringify(updatedTabs) !== JSON.stringify(tabs);
            if (isDifferent) {
                setTabs(updatedTabs);
                localStorage.setItem('pos_active_tabs', JSON.stringify(updatedTabs));
            }
            localStorage.setItem('pos_active_tab_id', activeTabId.toString());
        }, 100); // 100ms debounce

        return () => {
            if (persistTimeoutRef.current) {
                clearTimeout(persistTimeoutRef.current);
            }
        };
    }, [isTakeaway, takeawayOrder, takeawayCustName, takeawayCustPhone, selectedCustomer, billDiscount, loyaltyDiscount, tableId, activeTabId, tabs]);

    const addTab = () => {
        const nextId = Math.max(...tabs.map(t => t.id), 0) + 1;
        const newTab = createTab(nextId);
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(nextId);
    };

    // Table orders are NOT added to the tabs array — they are handled separately
    // Just set the active table context state directly
    const addTableTab = (tId, tName) => {
        setTableId(tId);
        setIsTakeaway(false);
        setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'DINE_IN' });
        setTakeawayCustName(tName || "");
        setTakeawayCustPhone("");
        setSelectedCustomer(null);
        setBillDiscount({ type: "flat", value: 0 }); // Reset discount for table
        setLoyaltyDiscount({ points: 0, amount: 0 }); // Reset loyalty discount
    };

    const switchTab = (id) => {
        if (id === activeTabId) return;
        setActiveTabId(id);
    };

    const closeTab = (id, e) => {
        if (e) e.stopPropagation();
        if (tabs.length === 1) {
            // Can't close the last tab, just reset it
            resetTakeaway();
            return;
        }

        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);

        if (activeTabId === id) {
            switchTab(newTabs[newTabs.length - 1].id);
        }
    };

    const resetTakeaway = () => {
        // Set flag to prevent sync/persistence loops
        isResettingRef.current = true;
        
        setTakeawayOrder(prev => ({
            ...INITIAL_TAB_DATA.takeawayOrder,
            orderType: prev?.orderType || 'TAKEAWAY'
        }));
        setTakeawayCustName("");
        setTakeawayCustPhone("");
        setSelectedCustomer(null);
        setBillDiscount({ type: "flat", value: 0 }); // Reset discount
        setLoyaltyDiscount({ points: 0, amount: 0 }); // Reset loyalty discount
        setIsTakeaway(true);
        setTableId(null);
        
        // Update the active tab in the tabs array immediately
        setTabs(prev => prev.map(t => {
            if (t.id === activeTabId) {
                return {
                    ...t,
                    takeawayOrder: {
                        ...INITIAL_TAB_DATA.takeawayOrder,
                        orderType: t.takeawayOrder?.orderType || 'TAKEAWAY'
                    },
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
        }));
        
        // Clear localStorage immediately
        setTimeout(() => {
            const updatedTabs = tabs.map(t => {
                if (t.id === activeTabId) {
                    return {
                        ...t,
                        takeawayOrder: {
                            ...INITIAL_TAB_DATA.takeawayOrder,
                            orderType: t.takeawayOrder?.orderType || 'TAKEAWAY'
                        },
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
            localStorage.setItem('pos_active_tabs', JSON.stringify(updatedTabs));
        }, 0);
        
        // Reset flag after a delay to allow state updates to settle
        setTimeout(() => {
            isResettingRef.current = false;
        }, 300);
    };

    const clearAllTabs = () => {
        const resetTab = createTab(1);
        setTabs([resetTab]);
        setActiveTabId(1);
        resetTakeaway();
    };

    const activateSaleTab = (orderTypeOverride) => {
        const currentTab = tabs.find(t => t.id === activeTabId) || createTab(1);

        setIsTakeaway(true);
        setTableId(null);

        const baseOrder = currentTab.takeawayOrder || INITIAL_TAB_DATA.takeawayOrder;
        setTakeawayOrder({
            ...baseOrder,
            orderType: orderTypeOverride || baseOrder.orderType || 'TAKEAWAY'
        });

        setTakeawayCustName(currentTab.takeawayCustName || "");
        setTakeawayCustPhone(currentTab.takeawayCustPhone || "");
        setSelectedCustomer(currentTab.selectedCustomer || null);
        setBillDiscount(currentTab.billDiscount || { type: "flat", value: 0 }); // Load discount
    };

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
        // Don't set discount here - let it be applied based on customer selection

        setTabs((prev) => prev.map((tab) => (
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
                        ? { type: 'percent', value: selectedCustomerData.discountPercentage }
                        : { type: "flat", value: 0 }
                }
                : tab
        )));
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
                billDiscount, // Export tab-specific discount
                setBillDiscount, // Export tab-specific discount setter
                loyaltyDiscount, // Export loyalty discount
                setLoyaltyDiscount, // Export loyalty discount setter
                tableId,
                setTableId,
                resetTakeaway,
                // Multi-tab exports
                tabs,
                activeTabId,
                addTab,
                addTableTab,
                switchTab,
                closeTab,
                clearAllTabs,
                activateSaleTab,
                loadHistorySale
            }}
        >
            {children}
        </TakeawayContext.Provider>
    );
};
