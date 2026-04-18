import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { initialMenu, initialInventoryItems } from "../pages/Inventory/InventoryService";
import { initialSettings } from "../pages/Settings/SettingsService";
import { initialSalesHistory } from "../pages/Reports/ReportsService";
import { initialRoles, initialStaff } from "../pages/Staff/StaffService";
import { initialOrganization, initialBranches } from "../pages/Organization/OrganizationService";
import { BUSINESS_TYPES, getDefaultModules } from "../config/businessTypes";
import { businessTypesService } from "../services/api/businessTypes";
import { formatCurrency } from "../utils/format";

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
    const [expenses, setExpenses] = useState([]);

    const addExpense = (expense) => {
        setExpenses((prev) => [...prev, expense]);
    };

    // Settings State
    const [settings, setSettings] = useState(initialSettings);

    // Sales History State
    const [salesHistory, setSalesHistory] = useState([]);

    // Staff & Roles State
    const [rolesList, setRolesList] = useState(initialRoles);
    const [staffList, setStaffList] = useState(initialStaff);

    // Organization & Branches State
    const [organization, setOrganization] = useState(initialOrganization);
    const [branches, setBranches] = useState(initialBranches);
    const [ownerShops, setOwnerShops] = useState([]);

    // Business Type & Enabled Modules State - Persisted
    const [businessType, setBusinessType] = useState(() => {
        return localStorage.getItem("pos_businessType") || BUSINESS_TYPES.RESTAURANT;
    });

    const [businessSubtype, setBusinessSubtype] = useState(() => {
        return localStorage.getItem("pos_businessSubtype") || "fine_dining";
    });

    const [businessTypeData, setBusinessTypeData] = useState(null);
    
    // Global Loading State
    const [globalLoading, setGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");

    const showLoader = (message = "") => {
        setLoadingMessage(message);
        setGlobalLoading(true);
    };

    const hideLoader = () => {
        setGlobalLoading(false);
        setLoadingMessage("");
    };

    // Branch Selection State - Persisted
    const [activeBranchId, setActiveBranchId] = useState(() => {
        const stored = localStorage.getItem("pos_activeBranchId");
        return (stored === "null" || stored === "undefined") ? null : stored;
    });

    const { isAuthenticated, user } = useAuth();

    const getSafeId = (id) => (id === "null" || id === "undefined" || !id) ? null : id;
    const currentShopId = getSafeId(user?.shop_id || user?.shopId) || getSafeId(organization?.id || organization?._id) || (branches.find(b => String(b.id || b._id) === String(activeBranchId))?.organizationId) || null;

    // Fetch full business type details when businessType changes
    useEffect(() => {
        const fetchTypeDetails = async () => {
            // Guard: only fetch if authenticated and we have a potential ID
            if (!isAuthenticated) return;
            
            if (businessType && businessType.length > 0) {
                try {
                    const res = await businessTypesService.getBusinessTypeById(businessType);
                    setBusinessTypeData(res.data);
                } catch (error) {
                    console.error("Failed to fetch business type details:", error);
                }
            } else {
                // Fallback for default state
                setBusinessTypeData({
                    features: {
                        sellStockItems: true,
                        sellManufacturedItems: true,
                        sellTradeItems: true
                    }
                });
            }
        };
        fetchTypeDetails();
    }, [businessType, isAuthenticated]);

    // End branch selection state

    const [enabledModules, setEnabledModules] = useState(() => {
        // const stored = localStorage.getItem("pos_enabledModules");
        return getDefaultModules(BUSINESS_TYPES.RESTAURANT, "fine_dining");
    });

    // Persist changes to localStorage
    useEffect(() => {
        localStorage.setItem("pos_businessType", businessType);
        localStorage.setItem("pos_businessSubtype", businessSubtype);
        localStorage.setItem("pos_activeBranchId", activeBranchId);
        // localStorage.setItem("pos_enabledModules", JSON.stringify(enabledModules));
    }, [businessType, businessSubtype, enabledModules, activeBranchId]);

    // Sync business type from organization data when it loads
    useEffect(() => {
        if (organization?.businessType && organization.businessType !== businessType) {
            setBusinessType(organization.businessType);
        }
    }, [organization?.businessType, businessType]);

    // Fetch allowed branches globally
    useEffect(() => {
        const fetchBranches = async () => {
            if (isAuthenticated) {
                try {
                    const { branchService } = await import("../services/api");
                    const data = await branchService.getAllowedBranches();
                    setBranches(data || []);
                    
                    // Optional: auto-select first branch if none selected
                    if (!activeBranchId && data && data.length > 0) {
                        const firstBranchId = data[0]._id || data[0].id;
                        setActiveBranchId(firstBranchId);
                    }
                } catch (error) {
                    console.error("Failed to fetch branches globally:", error);
                }
            }
        };
        fetchBranches();
    }, [isAuthenticated]);

    // Fetch owner's shops globally
    useEffect(() => {
        const fetchShops = async () => {
            if (isAuthenticated && (user?.isOwner || user?.isSuperAdmin)) {
                try {
                    const { shopService } = await import("../services/api");
                    const userId = user.id || user._id;
                    const shops = await shopService.getShopsByOwner(userId);
                    setOwnerShops(shops || []);
                } catch (error) {
                    console.error("Failed to fetch owner shops globally:", error);
                }
            }
        };
        fetchShops();
    }, [isAuthenticated, user?.id, user?._id, user?.isOwner, user?.isSuperAdmin]);

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
                ownerShops,
                setOwnerShops,
                businessType,
                setBusinessType,
                businessTypeData,
                businessSubtype,
                setBusinessSubtype,
                activeBranchId,
                setActiveBranchId,
                enabledModules,
                setEnabledModules,
                inventoryItems,
                setInventoryItems,
                currentShopId,
                formatCurrency: (value, currency) => {
                    const codeRaw = (currency || organization?.defaultCurrency || 'USD');
                    const finalCode = (typeof codeRaw === 'object' && codeRaw !== null) ? (codeRaw.code || codeRaw.id || 'USD') : codeRaw;
                    return formatCurrency(value, finalCode);
                },
                globalLoading,
                loadingMessage,
                showLoader,
                hideLoader,
                setGlobalLoading
            }}
        >
            {children}
        </AppContext.Provider>
    );
};
