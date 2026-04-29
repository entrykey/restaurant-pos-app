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
    isTakeaway: false
};

const createTab = (id, name) => ({
    id,
    name: name || `Tab ${id}`,
    ...JSON.parse(JSON.stringify(INITIAL_TAB_DATA))
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

    // Initial Load: Load active tab data into states when component mounts
    useEffect(() => {
        const targetTab = tabs.find(t => t.id === activeTabId);
        if (targetTab) {
            setIsTakeaway(targetTab.isTakeaway);
            setTakeawayOrder(targetTab.takeawayOrder);
            setTakeawayCustName(targetTab.takeawayCustName);
            setTakeawayCustPhone(targetTab.takeawayCustPhone);
            setSelectedCustomer(targetTab.selectedCustomer);
        }
    }, []);

    // Persistence: Sync state to tabs and localStorage
    useEffect(() => {
        const updatedTabs = tabs.map(t => {
            if (t.id === activeTabId) {
                return {
                    ...t,
                    isTakeaway,
                    takeawayOrder,
                    takeawayCustName,
                    takeawayCustPhone,
                    selectedCustomer
                };
            }
            return t;
        });
        setTabs(updatedTabs);
        localStorage.setItem('pos_active_tabs', JSON.stringify(updatedTabs));
        localStorage.setItem('pos_active_tab_id', activeTabId.toString());
    }, [isTakeaway, takeawayOrder, takeawayCustName, takeawayCustPhone, selectedCustomer, activeTabId]);

    const addTab = () => {
        const nextId = Math.max(...tabs.map(t => t.id), 0) + 1;
        const newTab = createTab(nextId);
        setTabs(prev => [...prev, newTab]);
        switchTab(nextId);
    };

    const switchTab = (id) => {
        if (id === activeTabId) return;

        // Save current states to the current active tab before switching
        setTabs(prev => prev.map(t => {
            if (t.id === activeTabId) {
                return {
                    ...t,
                    isTakeaway,
                    takeawayOrder,
                    takeawayCustName,
                    takeawayCustPhone,
                    selectedCustomer
                };
            }
            return t;
        }));

        const targetTab = tabs.find(t => t.id === id);
        if (targetTab) {
            setIsTakeaway(targetTab.isTakeaway);
            setTakeawayOrder(targetTab.takeawayOrder);
            setTakeawayCustName(targetTab.takeawayCustName);
            setTakeawayCustPhone(targetTab.takeawayCustPhone);
            setSelectedCustomer(targetTab.selectedCustomer);
            setActiveTabId(id);
        }
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
        setTakeawayOrder(INITIAL_TAB_DATA.takeawayOrder);
        setTakeawayCustName("");
        setTakeawayCustPhone("");
        setSelectedCustomer(null);
        setIsTakeaway(false);
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
                resetTakeaway,
                // Multi-tab exports
                tabs,
                activeTabId,
                addTab,
                switchTab,
                closeTab
            }}
        >
            {children}
        </TakeawayContext.Provider>
    );
};
