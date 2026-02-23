import React, { createContext, useContext, useState, useEffect } from "react";
import { initialMenu, initialInventoryItems } from "../pages/Inventory/InventoryService";
import { initialSettings } from "../pages/Settings/SettingsService";
import { initialSalesHistory } from "../pages/Reports/ReportsService";
import { initialRoles, initialStaff } from "../pages/Staff/StaffService";
import { initialOrganization, initialBranches } from "../pages/Organization/OrganizationService";
import { BUSINESS_TYPES, getDefaultModules } from "../config/businessTypes";

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
    const [inventoryItems, setInventoryItems] = useState(initialInventoryItems);
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

    // Organization & Branches State
    const [organization, setOrganization] = useState(initialOrganization);
    const [branches, setBranches] = useState(initialBranches);

    // Business Type & Enabled Modules State - Persisted
    const [businessType, setBusinessType] = useState(() => {
        return localStorage.getItem("pos_businessType") || BUSINESS_TYPES.RESTAURANT;
    });

    const [businessSubtype, setBusinessSubtype] = useState(() => {
        return localStorage.getItem("pos_businessSubtype") || "fine_dining";
    });

    // Branch Selection State - Persisted
    const [activeBranchId, setActiveBranchId] = useState(() => {
        return localStorage.getItem("pos_activeBranchId") || null;
    });

    const [enabledModules, setEnabledModules] = useState(() => {
        // const stored = localStorage.getItem("pos_enabledModules");
        return getDefaultModules(BUSINESS_TYPES.RESTAURANT, "fine_dining");
    });

    // Persist changes to localStorage
    useEffect(() => {
        localStorage.setItem("pos_businessType", businessType);
        localStorage.setItem("pos_businessSubtype", businessSubtype);
        if (activeBranchId) {
            localStorage.setItem("pos_activeBranchId", activeBranchId);
        }
        // localStorage.setItem("pos_enabledModules", JSON.stringify(enabledModules));
    }, [businessType, businessSubtype, enabledModules, activeBranchId]);

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
                setStaffList,
                organization,
                setOrganization,
                branches,
                setBranches,
                businessType,
                setBusinessType,
                businessSubtype,
                setBusinessSubtype,
                activeBranchId,
                setActiveBranchId,
                enabledModules,
                setEnabledModules,
                inventoryItems,
                setInventoryItems,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};
