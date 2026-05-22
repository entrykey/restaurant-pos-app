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
    // Multi-tab state with persistence
    const [tabs, setTabs] = useState(() => {
        const saved = localStorage.getItem('pos_active_tabs');
        if (saved) {
            try {
                return JSON.parse(saved);
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

    // Persistence: Sync active states to the tabs array and localStorage
    useEffect(() => {
        const updatedTabs = tabs.map(t => {
            if (t.id === activeTabId) {
                return {
                    ...t,
                    isTakeaway,
                    takeawayOrder,
                    takeawayCustName,
                    takeawayCustPhone,
                    selectedCustomer,
                    tableId
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
    }, [isTakeaway, takeawayOrder, takeawayCustName, takeawayCustPhone, selectedCustomer, tableId, activeTabId]);

    const addTab = () => {
        const nextId = Math.max(...tabs.map(t => t.id), 0) + 1;
        const newTab = createTab(nextId);
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(nextId);
    };

    const addTableTab = (tId, tName) => {
        // Check if tab for this table already exists
        const existingTab = tabs.find(t => t.tableId === tId);
        if (existingTab) {
            setActiveTabId(existingTab.id);
            return;
        }

        // Create new tab for the table
        const nextId = Math.max(...tabs.map(t => t.id), 0) + 1;
        const newTab = createTab(nextId, tName, tId);
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(nextId);
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
                clearAllTabs
            }}
        >
            {children}
        </TakeawayContext.Provider>
    );
};
