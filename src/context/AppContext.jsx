import React, { createContext, useContext, useState, useEffect } from "react";
import { initialMenu } from "../pages/Inventory/InventoryService";
import { initialSettings } from "../pages/Settings/SettingsService";
import { initialSalesHistory } from "../pages/Reports/ReportsService";
import { initialRoles, initialStaff } from "../pages/Staff/StaffService";

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    // Global Timer State
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Menu State
    const [menu, setMenu] = useState(initialMenu);
    const [activeMenuCategory, setActiveMenuCategory] = useState("All");

    // Expenses State
    const [expenses, setExpenses] = useState([
        {
            id: 1,
            title: "Vegetable Supply",
            amount: 1200,
            date: "2023-10-25",
            category: "Supplies",
        },
    ]);

    const addExpense = (expense) => {
        setExpenses((prev) => [...prev, expense]);
    };

    // Settings State
    const [settings, setSettings] = useState(initialSettings);

    // Sales History State
    const [salesHistory, setSalesHistory] = useState(initialSalesHistory);

    // Staff & Roles State
    const [rolesList, setRolesList] = useState(initialRoles);
    const [staffList, setStaffList] = useState(initialStaff);

    return (
        <AppContext.Provider
            value={{
                currentTime,
                menu,
                setMenu,
                activeMenuCategory,
                setActiveMenuCategory,
                expenses,
                addExpense,
                settings,
                setSettings,
                salesHistory,
                setSalesHistory,
                rolesList,
                setRolesList,
                staffList,
                setStaffList
            }}
        >
            {children}
        </AppContext.Provider>
    );
};
