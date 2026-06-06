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
    const [tableId, setTableId] = useState(null);

    // Sync: Load active tab data into states when activeTabId changes
    useEffect(() => {
        const targetTab = tabs.find(t => t.id === activeTabId);
        if (targetTab) {
            setIsTakeaway(targetTab.isTakeaway);
            setTakeawayOrder(targetTab.takeawayOrder);
            setTakeawayCustName(targetTab.takeawayCustName || "");
            setTakeawayCustPhone(targetTab.takeawayCustPhone || "");
            setSelectedCustomer(targetTab.selectedCustomer || null);
            setTableId(targetTab.tableId || null);
        }
    }, [activeTabId]);

    // Persistence: Sync active takeaway tab state to the tabs array and localStorage
    useEffect(() => {
        const shouldPersistTabs = isTakeaway && !tableId;

        if (!shouldPersistTabs) {
            // Still remember which tab is active, but don't overwrite sale tabs
            localStorage.setItem('pos_active_tab_id', activeTabId.toString());
            return;
        }

        const updatedTabs = tabs.map(t => {
            if (t.id === activeTabId) {
                return {
                    ...t,
                    isTakeaway,
                    takeawayOrder,
                    takeawayCustName,
                    takeawayCustPhone,
                    selectedCustomer,
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
    }, [isTakeaway, takeawayOrder, takeawayCustName, takeawayCustPhone, selectedCustomer, tableId, activeTabId, tabs]);

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
        setTakeawayOrder(prev => ({
            ...INITIAL_TAB_DATA.takeawayOrder,
            orderType: prev?.orderType || 'TAKEAWAY'
        }));
        setTakeawayCustName("");
        setTakeawayCustPhone("");
        setSelectedCustomer(null);
        setIsTakeaway(true);
        setTableId(null);
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
