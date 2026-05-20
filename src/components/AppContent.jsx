import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { ROUTE_KEY_TO_PATH, ROUTE_ACCESS, ROUTE_KEYS_ORDER } from "../constants/routeAccess";
import { usePermission } from "../auth/usePermission";
import toast from "react-hot-toast";
import Layout from "./Layout";
import AppRoutes from "../routes/AppRoutes";
import Login from "../pages/Login";
import LandingPage from "../pages/LandingPage";
import { useApp } from "../context/AppContext";
import { useOrder } from "../context/OrderContext";
import { useDining } from "../pages/DiningHall/DiningContext";
import { useTakeaway } from "../pages/Takeaway/TakeawayContext";
import { useOnlineOrders } from "../pages/OnlineOrders/OnlineOrderContext";
import { useAuth } from "../context/AuthContext";
import { hasPermission as checkPermission, hasPermissionFor as checkPermissionFor } from "../utils/permissions";
import { formatCurrency } from "../utils/format";
import { printBill, printBillA4, printKot } from "../utils/print";
import api, { itemService, orderService, settingService, tableService, employeeService, shopService, taxService, roleService } from "../services/api";
import { fetchOrganizationData } from "../pages/Organization/OrganizationService";
import { TextProvider } from "../context/TextContext";
import { useTheme } from "../context/ThemeContext";
import { BUSINESS_TYPES, BUSINESS_FEATURES } from "../config/businessTypes";
import { AlertTriangle, X } from "lucide-react";
import ThemeLoader from "./ui/ThemeLoader";

// Modals
import NoteModal from "./modals/NoteModal";
import CustomizationModal from "./modals/CustomizationModal";
import ExpenseModal from "./modals/ExpenseModal";
import PaymentModal from "./modals/PaymentModal";
import FullOrderSummaryModal from "./modals/FullOrderSummaryModal";
import MultipleShopsModal from "./modals/MultipleShopsModal";
import SubscriptionNoticeModal from "./modals/SubscriptionNoticeModal";
import { sendBrowserNotification } from "../utils/notifications";
import { computeUserHasActiveSubscription } from "../utils/subscriptionStatus";

/** Set only when user dismisses SubscriptionNoticeModal — never on open (avoids React Strict Mode + false "already notified"). */
const POS_SUBSCRIPTION_MODAL_DISMISSED_KEY = "pos_subscription_modal_dismissed";
const SHOW_MULTI_SHOP_MODAL = false;

const ROOT_PATH_SEGMENTS = new Set([
    "dashboard",
    "dininghall",
    "takeaway",
    "wholesale",
    "online-orders",
    "reservations",
    "kds",
    "inventory",
    "reports",
    "settings",
    "staff",
    "organization",
    "suppliers",
    "parties",
    "service",
    "purchases",
    "business-types",
    "shop-management",
    "client-management",
    "plan-management",
    "subscription-management",
    "table-management",
    "offers",
    "owner-dashboard",
    "my-attendance",
    "my-leaves",
    "my-salary",
    "staff-dashboard",
    "sale-marking",
    "sales-history",
    "login",
]);

const AppContent = () => {
    const { theme } = useTheme();
    const auth = useAuth();
    const isAuthenticated = auth.isAuthenticated;
    const currentUser = auth.user;
    const sessionInfo = auth.sessionInfo;
    const authLogs = auth.authLogs;

    // Context Hooks
    const {
        currentTime, menu, setMenu, addExpense, settings, setSettings,
        salesHistory, setSalesHistory, rolesList, staffList, setRolesList, setStaffList,
        organization, setOrganization, branches, setBranches,
        businessType, setBusinessType, businessTypeData, businessSubtype, setBusinessSubtype,
        activeBranchId, setActiveBranchId, currentShopId,
        enabledModules, setEnabledModules, setInventoryItems,
        inventoryItems, globalLoading, loadingMessage
    } = useApp();

    const {
        billingStage, setBillingStage, billDiscount,
        setCouponCode, setCouponStatus, resetBillingState,
        calculateItemTotal, calculateTotal, calculateBillDetails,
        fetchActiveOffers, offers,
        // New global exchange states
        isExchange, setIsExchange, exchangeCredit, setExchangeCredit,
        originalOrderId, setOriginalOrderId, returnedItems, setReturnedItems,
        resetExchange
    } = useOrder();

    const {
        tables, setTables, categories, loading: diningLoading,
        activeTableId, setActiveTableId,
        reservations, setReservations, getTableDuration,
        handleCheckInReservation, handleCompleteKOT, joinTables,
        refreshData
    } = useDining();

    const {
        isTakeaway, setIsTakeaway, takeawayOrder, setTakeawayOrder,
        takeawayCustName, setTakeawayCustName, takeawayCustPhone, setTakeawayCustPhone,
        resetTakeaway, tableId
    } = useTakeaway();

    const {
        onlineOrders, setOnlineOrders, isOnlineOrderingEnabled, setIsOnlineOrderingEnabled,
        onlineOrderTab, setOnlineOrderTab, pendingOnlineOrdersCount,
        handleAcceptOnlineOrder, handleRejectOnlineOrder, handleCompleteOnlineKOT
    } = useOnlineOrders();

    useEffect(() => {
        const fetchSettings = async () => {
            if (isAuthenticated && currentShopId) {
                try {
                    const data = await settingService.getSettings(currentShopId);
                    if (data && Array.isArray(data)) {
                        const settingsMap = {};
                        data.forEach(s => {
                            settingsMap[s.key] = s.value;
                        });
                        console.log("Fetched Backend Settings:", settingsMap);
                        setSettings(prev => ({ ...prev, ...settingsMap }));
                    }
                } catch (error) {
                    console.error("Failed to fetch shop settings:", error);
                }
            }
        };
        fetchSettings();
    }, [isAuthenticated, currentShopId]);

    useEffect(() => {
        const fetchItems = async () => {
            if (isAuthenticated && currentShopId) {
                try {
                    const branchId = getResolvedBranchId();
                    const [response, taxesRes] = await Promise.all([
                        itemService.getItems({
                            limit: 500,
                            filters: {
                                shopId: currentShopId,
                                branchId: branchId,
                                isActive: true
                            }
                        }),
                        taxService.getTaxes({ branchId })
                    ]);
                    
                    const items = response.data || [];
                    const activeTaxes = taxesRes.filter(t => t.isActive !== false);

                    // Filter only items that are sellable for the POS menu
                    const menuData = items.filter(item => item.isSellable !== false);

                    const rawData = items.filter(item => 
                        (item.itemType === "STOCK" || item.itemType === "SERVICE" || item.itemType === "RAW" || item.itemType === "TRADE") && 
                        item.status === "ACTIVE"
                    );

                    // Map backend ID to `id` for frontend consistency and normalize fields for POS logic
                    const mapItems = (arr) => arr.map(item => {
                        const taxPercent = Number(item.taxPercent || item.tax_percent || 0);
                        const taxObj = activeTaxes.find(t => t.percentage === taxPercent);
                        const isExclusiveTax = taxObj ? taxObj.taxType === 'EXCLUSIVE' : false;
                        return {
                            ...item,
                            id: item._id,
                            price: item.pricing?.sellingPrice || 0,
                            pricePerUnit: item.pricing?.sellingPrice || 0,
                            sellingPrice: item.pricing?.sellingPrice || 0,
                            category: item.categoryId?.name || "Uncategorized",
                            unitName: item.unitId?.name || "Unit",
                            sellingType: item.weightBased ? "Weight" : "Standard",
                            unitId: item.unitId, // Ensure this is preserved for React State
                            quantityOnHand: item.quantityOnHand || 0,
                            taxPercent,
                            isExclusiveTax
                        };
                    });

                    setMenu(mapItems(menuData));
                    setInventoryItems(mapItems(rawData));

                    // Fetch Active Offers as well
                    fetchActiveOffers(currentShopId, branchId);
                } catch (error) {
                    console.error("Failed to fetch shop items:", error);
                }
            }
        };
        fetchItems();
    }, [isAuthenticated, currentShopId, activeBranchId, businessTypeData]);

    useEffect(() => {
        const fetchStaff = async () => {
            if (isAuthenticated && currentShopId) {
                try {
                    const branchId = getResolvedBranchId();
                    // Fetch employees for this branch
                    const data = await employeeService.getEmployeesByShopId(currentShopId);
                    
                    // Filter by branch if branchId is available
                    const filteredStaff = data.filter(emp => {
                        if (!branchId) return true;
                        if (!emp.allowedBranches || emp.allowedBranches.length === 0) return true;
                        return emp.allowedBranches.includes(branchId);
                    });

                    const mappedStaff = filteredStaff.map(emp => ({
                        ...emp,
                        id: emp._id,
                        name: emp.userId?.name || "N/A",
                        role: emp.roleId?.name || "N/A",
                        phone: emp.userId?.phone || "",
                        active: emp.status === "ACTIVE"
                    }));

                    console.log("Fetched and mapped staff:", mappedStaff);
                    setStaffList(mappedStaff);
                } catch (error) {
                    console.error("Failed to fetch employees:", error);
                }
            }
        };
        fetchStaff();
    }, [isAuthenticated, currentShopId, activeBranchId]);

    useEffect(() => {
        const fetchRoles = async () => {
            if (isAuthenticated && currentShopId) {
                try {
                    const roles = await roleService.getRolesByShopId(currentShopId);
                    setRolesList(roles || []);
                } catch (error) {
                    console.error("Failed to fetch roles:", error);
                }
            }
        };
        fetchRoles();
    }, [isAuthenticated, currentShopId]);

    useEffect(() => {
        const fetchOrg = async () => {
            if (isAuthenticated && (currentUser?._id || currentUser?.id)) {
                try {
                    const { organization: org, branches: brs } = await fetchOrganizationData(currentUser._id || currentUser.id, currentShopId);
                    console.log("AppContent: Fetched dynamic organization & branches:", { org, brs });
                    setOrganization(org);
                    setBranches(brs);
                } catch (error) {
                    console.error("Failed to fetch organization data:", error);
                }
            }
        };
        fetchOrg();
    }, [isAuthenticated, currentShopId, currentUser?._id, currentUser?.id, currentUser?.shopId, currentUser?.shop_id]);

    useEffect(() => {
        if (!isAuthenticated || !(currentUser?._id || currentUser?.id)) return;

        const refetchOnVisible = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const { organization: org, branches: brs } = await fetchOrganizationData(
                    currentUser._id || currentUser.id,
                    currentShopId
                );
                if (org) setOrganization(org);
                if (brs) setBranches(brs);
            } catch {
                /* ignore */
            }
        };

        document.addEventListener('visibilitychange', refetchOnVisible);
        return () => document.removeEventListener('visibilitychange', refetchOnVisible);
    }, [isAuthenticated, currentShopId, currentUser?._id, currentUser?.id, setOrganization, setBranches]);

    // Local UI State
    const [view, setView] = useState("dashboard");
    
    // Draggable Logic for Profile Completion Dialog
    const [profileOffset, setProfileOffset] = useState({ x: 0, y: 0 });
    const [isDraggingProfile, setIsDraggingProfile] = useState(false);
    const [dragStartProfile, setDragStartProfile] = useState({ x: 0, y: 0 });

    const handleMouseDownProfile = (e) => {
        if (e.target.closest('button')) return;
        setIsDraggingProfile(true);
        setDragStartProfile({
            x: e.clientX - profileOffset.x,
            y: e.clientY - profileOffset.y
        });
    };

    // Draggable Logic for Subscription Dialog
    const [subOffset, setSubOffset] = useState({ x: 0, y: 0 });
    const [isDraggingSub, setIsDraggingSub] = useState(false);
    const [dragStartSub, setDragStartSub] = useState({ x: 0, y: 0 });

    const handleMouseDownSub = (e) => {
        if (e.target.closest('button')) return;
        setIsDraggingSub(true);
        setDragStartSub({
            x: e.clientX - subOffset.x,
            y: e.clientY - subOffset.y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingProfile) {
                setProfileOffset({
                    x: e.clientX - dragStartProfile.x,
                    y: e.clientY - dragStartProfile.y
                });
            }
            if (isDraggingSub) {
                setSubOffset({
                    x: e.clientX - dragStartSub.x,
                    y: e.clientY - dragStartSub.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDraggingProfile(false);
            setIsDraggingSub(false);
        };

        if (isDraggingProfile || isDraggingSub) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingProfile, isDraggingSub, dragStartProfile, dragStartSub]);

    const location = useLocation();
    const navigate = useNavigate();

    const toShopSegment = (rawName) => {
        const raw = String(rawName || "").trim().toLowerCase();
        if (!raw) return "";
        return raw
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60);
    };

    const getCurrentShopSegment = () => {
        const currentShopId = currentUser?.shop_id || currentUser?.shopId;
        const shops = Array.isArray(currentUser?.shops) ? currentUser.shops : [];
        const matched = shops.find((s) =>
            String(s?._id || s?.id || s?.shopId || "") === String(currentShopId || "")
        );
        const fromUserShops = toShopSegment(matched?.name || matched?.shopName);
        if (fromUserShops) return fromUserShops;

        const fromOrg = toShopSegment(organization?.businessName);
        if (fromOrg) return fromOrg;

        return toShopSegment(settings?.shopName);
    };

    const { can, canModule } = usePermission();

    const getFirstAllowedPath = () => {
        for (const key of ROUTE_KEYS_ORDER) {
            const r = ROUTE_ACCESS[key];
            if (!r) continue;

            const hasAccess = r.action
                ? can(r.module, r.action)
                : canModule(r.module);

            if (hasAccess) {
                return ROUTE_KEY_TO_PATH[key] || "/dashboard";
            }
        }
        return "/dashboard";
    };

    // If authenticated user lands on /login, move them into app dashboard.
    useEffect(() => {
        if (!isAuthenticated) return;

        const rawPath = String(location.pathname || "/");
        const isLoginScopedPath =
            rawPath === "/" || // Add root path to login scoped for redirection
            rawPath === "/login" ||
            rawPath.startsWith("/login/") ||
            rawPath.endsWith("/login") ||
            rawPath.includes("/login/");
        if (!isLoginScopedPath) return;

        const isSuperAdmin =
            currentUser?.isSuperAdmin ||
            currentUser?.role === "superadmin" ||
            currentUser?.role?.name === "superadmin";

        if (isSuperAdmin) {
            navigate("/dashboard", { replace: true });
            return;
        }

        if (currentUser?.isOwner) {
            const shops = Array.isArray(currentUser?.shops) ? currentUser.shops : [];
            if (shops.length === 1) {
                const shop = shops[0];
                const shopSegment = toShopSegment(shop.name || shop.shopName || shop.businessName);
                const firstPath = getFirstAllowedPath();
                navigate(`/${shopSegment}${firstPath}`, { replace: true });
                return;
            }
            navigate("/owner-dashboard", { replace: true });
            return;
        }

        const shopSegment = getCurrentShopSegment();
        const firstPath = getFirstAllowedPath();
        navigate(shopSegment ? `/${shopSegment}${firstPath}` : firstPath, { replace: true });
    }, [isAuthenticated, currentUser, location.pathname, navigate, organization?.businessName, settings?.shopName]);

    // Normalize unauthenticated login URL to plain /login (avoid stale scoped login paths).
    useEffect(() => {
        if (isAuthenticated) return;
        const rawPath = String(location.pathname || "/");
        const isScopedLogin =
            rawPath !== "/login" &&
            (rawPath.endsWith("/login") || rawPath.includes("/login/"));
        if (isScopedLogin) {
            navigate("/login", { replace: true });
        }
    }, [isAuthenticated, location.pathname, navigate]);

    // Keep shop slug as a common base URL for all normal app routes.
    // This lets existing absolute navigations (/takeaway, /inventory, etc.)
    // remain backward-compatible while still enforcing /{shopName}/... for scoped users.
    useEffect(() => {
        if (!isAuthenticated) return;

        const isSuperAdmin =
            currentUser?.isSuperAdmin ||
            currentUser?.role === "superadmin" ||
            currentUser?.role?.name === "superadmin";
        if (isSuperAdmin) return;

        const rawPath = String(location.pathname || "/");
        if (rawPath === "/owner-dashboard" || rawPath === "/login" || rawPath.startsWith("/login/")) return;

        const segs = rawPath.split("/").filter(Boolean);
        if (segs.length === 0) return;

        const first = segs[0];
        // Already scoped if first segment is not a known root route.
        if (!ROOT_PATH_SEGMENTS.has(first)) return;

        const shopSegment = getCurrentShopSegment();
        if (!shopSegment) return;

        navigate(`/${shopSegment}${rawPath}`, { replace: true });
    }, [isAuthenticated, currentUser, location.pathname, navigate, organization?.businessName, settings?.shopName]);

    // Sync view with URL path
    useEffect(() => {
        const rawPath = location.pathname;
        const segs = String(rawPath || "/").split("/").filter(Boolean);
        const first = segs[0];

        const path = (first && !ROOT_PATH_SEGMENTS.has(first))
            ? `/${segs.slice(1).join("/")}`
            : rawPath;

        const entry = Object.entries(ROUTE_KEY_TO_PATH).find(([key, routePath]) => path === routePath);
        if (entry) {
            setView(entry[0]);
        }
    }, [location.pathname, setView]);

    // Sync tableId from TakeawayContext to DiningContext when tab changes
    useEffect(() => {
        if (tableId !== activeTableId) {
            setActiveTableId(tableId);
        }
    }, [tableId, activeTableId, setActiveTableId]);
    const [orderSearch, setOrderSearch] = useState("");
    const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isFullOrderSummaryOpen, setIsFullOrderSummaryOpen] = useState(false);
    const [isMultipleShopsModalOpen, setIsMultipleShopsModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [subscriptionRequiredMessage, setSubscriptionRequiredMessage] = useState(null);
    const [isProfileHintExpanded, setIsProfileHintExpanded] = useState(false);
    const [previewOrder, setPreviewOrder] = useState(null); // For KDS/Online

    // Customization State
    const [customizingItem, setCustomizingItem] = useState(null);
    const [customVariant, setCustomVariant] = useState(null);
    const [customWeightInput, setCustomWeightInput] = useState(1);
    const [customWeightUnit, setCustomWeightUnit] = useState("kg");
    const [customExtras, setCustomExtras] = useState({});

    // Note Modal State
    const [noteModal, setNoteModal] = useState({
        isOpen: false,
        idx: null,
        text: "",
    });

    // Override window.alert project-wide for better UX
    useEffect(() => {
        const originalAlert = window.alert;
        window.alert = (message) => {
            if (!message) return;
            const msg = String(message);
            const lowerMsg = msg.toLowerCase();

            // Simple heuristic to distinguish success from error
            const isSuccess = 
                lowerMsg.includes('success') || 
                lowerMsg.includes('successfully') || 
                lowerMsg.includes('done') || 
                lowerMsg.includes('saved');

            if (isSuccess) {
                toast.success(msg);
            } else {
                toast.error(msg);
            }
            
            // Log for debugging
            console.log("Intercepted alert:", msg);
        };

        return () => {
            window.alert = originalAlert;
        };
    }, []);

    // Multiple shops picker + subscription nag (toast uses org data when loaded so it matches "No Active Plan" UI)
    useEffect(() => {
        if (!isAuthenticated || !currentUser) return;

        const hasIgnoredShops = sessionStorage.getItem("multiple_shops_ignored");
        if (SHOW_MULTI_SHOP_MODAL && currentUser.isOwner && currentUser.shops && currentUser.shops.length > 1 && !hasIgnoredShops) {
            setIsMultipleShopsModalOpen(true);
        }

        const isSuperAdmin =
            currentUser.isSuperAdmin ||
            currentUser.role === "superadmin" ||
            currentUser.role?.name === "superadmin";

        const isSubscribed = computeUserHasActiveSubscription(currentUser, organization);

        if (isSubscribed || isSuperAdmin) {
            setIsSubscriptionModalOpen(false);
            return;
        }

        // Normal mode: lists work without a plan; only block writes (handled via API dialog).
        if (organization?.subscriptionMethod === 'normal') {
            setIsSubscriptionModalOpen(false);
            return;
        }

        const dismissedSubscriptionModal =
            localStorage.getItem(POS_SUBSCRIPTION_MODAL_DISMISSED_KEY) === "1";
        if (dismissedSubscriptionModal) return;

        const isOwner = currentUser.isOwner || isSuperAdmin;

        if (organization?.subscriptionMethod === 'trial_run') {
            const ownerBody =
                organization?.trialRunStatus === 'pending'
                    ? "Your trial run request is pending super admin approval."
                    : "Trial run access is not approved yet. Request trial run from Organization page.";
            const staffBody =
                organization?.trialRunStatus === 'pending'
                    ? "Shop trial run is pending super admin approval."
                    : "Shop trial run is not approved yet. Contact the owner.";
            sendBrowserNotification("Trial Run Status", {
                body: isOwner ? ownerBody : staffBody,
                icon: "/logo192.png",
            });
            setIsSubscriptionModalOpen(true);
            return;
        }

        if (isOwner) {
            sendBrowserNotification("Subscription Alert", {
                body: "Your shop is not subscribed. Subscribe and wait for super admin payment confirmation.",
                icon: "/logo192.png",
            });
            setIsSubscriptionModalOpen(true);
        } else {
            sendBrowserNotification("Subscription Required", {
                body: "This shop has no active subscription. Ask the owner to subscribe.",
                icon: "/logo192.png",
            });
            setIsSubscriptionModalOpen(true);
        }
    }, [
        isAuthenticated,
        currentUser,
        organization?.id,
        organization?._id,
        organization?.subscriptionStatus,
        organization?.subscriptionEndDate,
        organization?.subscriptionMethod,
    ]);

    useEffect(() => {
        const onSubscriptionRequired = (event) => {
            setSubscriptionRequiredMessage(
                event?.detail?.message ||
                    "You haven't subscribed. Please subscribe to a plan to perform this action."
            );
        };
        window.addEventListener('pos-subscription-required', onSubscriptionRequired);
        return () => window.removeEventListener('pos-subscription-required', onSubscriptionRequired);
    }, []);

    const hasPermission = (permissionKey) => {
        return checkPermission(currentUser, permissionKey);
    };

    /** Check by module.resource.action (e.g. organization, branch, create) */
    const hasPermissionFor = (module, resource, action) => {
        return checkPermissionFor(currentUser, module, resource, action);
    };

    const handleLogout = () => {
        auth.logout();
        setView("dashboard");
        navigate("/login", { replace: true });
    };

    const handleIgnoreShopsAlert = () => {
        sessionStorage.setItem('multiple_shops_ignored', 'true');
        setIsMultipleShopsModalOpen(false);
    };

    const handleCloseSubscriptionNotice = () => {
        localStorage.setItem(POS_SUBSCRIPTION_MODAL_DISMISSED_KEY, "1");
        localStorage.removeItem("subscription_notified");
        setIsSubscriptionModalOpen(false);
    };

    const handleSwitchShopAction = async (shopId) => {
        setIsMultipleShopsModalOpen(false);
        if (!shopId) return;
        try {
            localStorage.removeItem("pos_activeBranchId");
            setActiveBranchId(null);
            const data = await shopService.switchShop(shopId);
            if (data && data.user) {
                auth.login(data.user);
                const newIsSubscribed = data.user.subscription?.active;
                if (!newIsSubscribed) {
                    setView('organization');
                    toast.success("Switching shop. Access is limited until you subscribe.");
                } else {
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error("Failed to switch shop:", error);
            toast.error("Error switching shop. Please try again.");
        }
    };

    const profileFields = [
        organization?.businessName,
        organization?.ownerName,
        organization?.ownerEmail,
        organization?.defaultCountry,
        organization?.defaultCurrency,
        organization?.defaultTaxSystem,
        branches?.find((b) => b.isMainBranch)?.address?.line1 || branches?.[0]?.address?.line1,
        branches?.find((b) => b.isMainBranch)?.address?.city || branches?.[0]?.address?.city,
        branches?.find((b) => b.isMainBranch)?.address?.state || branches?.[0]?.address?.state,
        branches?.find((b) => b.isMainBranch)?.address?.pincode || branches?.[0]?.address?.pincode,
        (() => {
            const b = branches?.find((b) => b.isMainBranch) || branches?.[0];
            return b?.taxConfig?.gstin || (organization?.defaultTaxSystem && (b?._id || b?.id));
        })()
    ];
    const uiProfileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

    const isSuperAdmin =
        currentUser?.isSuperAdmin ||
        currentUser?.role === "superadmin" ||
        currentUser?.role?.name === "superadmin";

    const isSubscribed = computeUserHasActiveSubscription(currentUser, organization);
    const isOwnerSelectionPage = location.pathname === "/owner-dashboard";

    const showProfileCompletionOverlay = isAuthenticated &&
        currentUser?.isOwner &&
        !isSuperAdmin &&
        !isOwnerSelectionPage &&
        isSubscribed &&
        uiProfileCompletion < 100;


    const handleCompleteSetupNavigation = () => {
        setView("organization");
        navigate(ROUTE_KEY_TO_PATH.organization || "/organization");
    };

    const getResolvedBranchId = () => {
        return (
            activeBranchId ||
            currentUser?.branch_id ||
            currentUser?.branchId ||
            (currentUser?.branchIds && currentUser.branchIds[0]) ||
            (branches[0]?._id) ||
            null
        );
    };

    const getActiveBranchForPrint = () => {
        const branchId = getResolvedBranchId();
        if (!branchId) return null;
        return (branches || []).find((b) => String(b._id || b.id) === String(branchId)) || null;
    };

    const activeBranch = getActiveBranchForPrint();
    const branchStateCode = activeBranch?.address?.state?.code;

    const toAbsoluteLogoUrl = (logoUrl) => {
        if (!logoUrl) return null;
        if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
        const base = (api?.defaults?.baseURL || "").replace(/\/api\/?$/, "");
        if (!base) return logoUrl;
        return `${base}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
    };

    const getPrintHeader = (orderFromBackend = null) => {
        const backendShop = orderFromBackend?.shopId || null;
        const backendBranch = orderFromBackend?.branchId || null;
        const activeBranch = backendBranch || getActiveBranchForPrint();
        const address = activeBranch?.address || {};
        const addressLines = [
            address?.line1,
            address?.line2,
            [address?.city, address?.state?.name || address?.state].filter(Boolean).join(", "),
            [address?.country?.name || address?.country, address?.pincode].filter(Boolean).join(" - "),
        ].filter(Boolean);

        return {
            logoUrl: toAbsoluteLogoUrl(backendShop?.logoUrl || organization?.logoUrl || null),
            shopName: backendShop?.name || organization?.businessName || settings?.shopName || "Shop",
            branchName: backendBranch?.name || activeBranch?.name || "Branch",
            contact: backendShop?.ownerContact || organization?.ownerContact || settings?.shopPhone || settings?.phone || currentUser?.phone || "",
            addressLines,
        };
    };

    const handlePrintReceipt = async (format = "thermal") => {
        try {
            const table = !isTakeaway
                ? tables.find((t) => String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId))
                : null;
            const currentOrder = isTakeaway ? takeawayOrder : (table?.order || { items: [] });
            const orderItems = currentOrder.items || activeOrderItems || [];
            if (orderItems.length === 0) return;

            let orderId = currentOrder.orderId;
            if (!orderId) {
                const { subtotal, taxTotal, total, taxBreakdown } = calculateBillDetails(
                    orderItems,
                    currentOrder.discount || billDiscount || { type: 'flat', value: 0 },
                    settings?.defaultTaxPercent || 0,
                    true, // autoRound
                    isTakeaway ? exchangeCredit : 0,
                    branchStateCode,
                    null // TODO: Get customer state code if possible
                );

                const payloadItems = orderItems.map(item => {
                    const itemTaxPercent = (item.taxPercent !== undefined && item.taxPercent !== null) 
                        ? Number(item.taxPercent) 
                        : (settings?.defaultTaxPercent || 0);
                    return {
                        itemId: item.id || item._id,
                        itemName: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        totalAmount: calculateItemTotal(item),
                        variantId: item.selectedVariant ? item.selectedVariant._id : null,
                        notes: item.suggestion,
                        taxPercent: itemTaxPercent,
                        taxAmount: ((calculateItemTotal(item) * itemTaxPercent) / 100)
                    };
                });

                const created = await orderService.createOrder({
                    shopId: currentShopId,
                    branchId: getResolvedBranchId(),
                    businessType: businessType || "RESTAURANT",
                    orderType: activeOrderType,
                    customerId: null,
                    tableId: !isTakeaway ? table?._id || table?.id : null,
                    items: payloadItems,
                    subtotal,
                    discountTotal: currentOrder.discountTotal || 0,
                    taxTotal,
                    grandTotal: total,
                    taxBreakdown,
                    createdBy: currentUser._id,
                    customerName: takeawayCustName || "",
                    customerPhone: takeawayCustPhone || ""
                });

                orderId = created?._id;
            }

            if (!orderId) return;
            const orderFromBackend = await orderService.getOrderById(orderId);

            const backendItems = orderFromBackend?.items || [];
            const itemsForPrint = backendItems.map((it) => ({
                name: it?.itemId?.name || it?.itemName || it?.name || "Item",
                qty: it?.quantity ?? 0,
                variant: "",
                lineTotal: it?.totalAmount ?? (Number(it?.price || 0) * Number(it?.quantity || 0)),
            }));

            const totals = {
                subtotal: orderFromBackend?.subtotal ?? 0,
                discountAmount: orderFromBackend?.discountTotal ?? 0,
                taxAmount: orderFromBackend?.taxTotal ?? 0,
                taxBreakdown: orderFromBackend?.taxBreakdown ?? null,
                roundOff: 0,
                finalTotal: orderFromBackend?.grandTotal ?? 0,
            };

            const tableLabel = isTakeaway ? "Takeaway" : (table?.name || activeTable?.name || "");
            const invoiceLabel = orderFromBackend?.invoiceNumber ? `Invoice: ${orderFromBackend.invoiceNumber}` : "";
            const orderLabel = orderFromBackend?.orderNumber ? `Order: ${orderFromBackend.orderNumber}` : "";
            const customerLabel = orderFromBackend?.customerId?.name
                ? `Customer: ${orderFromBackend.customerId.name}${orderFromBackend.customerId.phone ? ` (${orderFromBackend.customerId.phone})` : ""}`
                : "";

            const printer = format === "a4" ? printBillA4 : printBill;
            printer({
                header: getPrintHeader(orderFromBackend),
                meta: {
                    orderLabel: [invoiceLabel, orderLabel].filter(Boolean).join(" • "),
                    tableLabel: tableLabel ? `Table: ${tableLabel}` : "",
                    customerLabel,
                    printedAt: new Date().toLocaleString(),
                },
                items: itemsForPrint,
                totals,
                formatCurrency,
            });
        } catch (e) {
            console.error("Print bill failed:", e);
            toast.error("Failed to print bill. Please try again.");
        }
    };

    // --- Order Logic ---

    // Derived State
    const activeOrderItems = isTakeaway
        ? takeawayOrder.items
        : tables.find((t) => String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId))?.order?.items || [];

    const activeOrderType = isTakeaway
        ? (takeawayOrder.orderType || "DIRECT_SALE")
        : "DINE_IN";

    const activeTable = tables.find(t => String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId));
    const activeOrderCustomerId = activeTable?.order?.customerId || null;

    const addToCart = (item, quantity, variant, extras, enteredUnit = null) => {
        let finalQuantity = parseFloat(quantity);

        // --- Advanced Offer Logic (Auto-Add & BOGO) ---
        // We find all "FREE_ITEM" reward offers triggered by this item
        const triggeredOffers = (offers || []).filter(o => 
            o.isActive && 
            o.condition?.applyOn === "ITEM" && 
            (o.condition?.itemIds || []).includes(item.id || item._id) &&
            o.reward?.rewardType === "FREE_ITEM"
        );

        triggeredOffers.forEach(offer => {
            const buyQty = offer.condition.minQuantity || 1;
            const freeQty = offer.reward.rewardQuantity || 1;
            
            // Check if it's the same item (BOGO style) or a different item (Cross-item)
            const rewardItemIds = offer.reward.itemIds || (offer.reward.specificItemId ? [offer.reward.specificItemId] : []);
            const isSameItem = rewardItemIds.length === 0 || rewardItemIds.includes(item.id || item._id);
            
            if (isSameItem) {
                // For BOGO: If adding 'buyQty' multiples, we can automatically add the 'freeQty' multiples
                // Example: Buy 1 Get 1. User adds 1 -> we make it 2. User adds 2 -> we make it 4.
                if (quantity % buyQty === 0) {
                    const numSets = quantity / buyQty;
                    const totalFreeToAdd = numSets * freeQty;
                    finalQuantity = quantity + totalFreeToAdd;
                    toast.success(`${offer.name} Applied: Added ${totalFreeToAdd} extra free ${item.name}`, { 
                        icon: '🎁',
                        duration: 3000
                    });
                }
            } else {
                // Cross-item offer (Buy Pepsi, Get Lays Free)
                const freeItemId = rewardItemIds[0];
                const freeItem = menu.find(m => m.id === freeItemId || m._id === freeItemId);
                
                if (freeItem && quantity >= buyQty) {
                    const numSets = Math.floor(quantity / buyQty);
                    const totalFreeToAdd = numSets * freeQty;

                    // Add the free items with a small delay to separate the cart additions
                    setTimeout(() => {
                        addToCart(freeItem, totalFreeToAdd, null, []);
                        toast.success(`${offer.name} Applied: ${totalFreeToAdd} ${freeItem.name} added as a gift!`, { 
                            icon: '🎁',
                            duration: 3000
                        });
                    }, 100);
                }
            }
        });

        const orderItem = {
            ...item,
            quantity: finalQuantity,
            selectedVariant: variant,
            selectedExtras: extras,
            suggestion: "",
            enteredUnit: enteredUnit,
        };

        const extrasKey = extras
            .map((e) => `${e.name}-${e.quantity}`)
            .sort()
            .join("|");
        const variantKey = variant ? variant.name : "std";
        const groupKey = `${item.id}|${variantKey}|${extrasKey}`;

        const updateOrderItems = (currentItems) => {
            const existingIndex = currentItems.findIndex((i) => {
                const iExtraKey = (i.selectedExtras || [])
                    .map((e) => `${e.name}-${e.quantity}`)
                    .sort()
                    .join("|");
                const iVariantKey = i.selectedVariant ? i.selectedVariant.name : "std";
                const iGroupKey = `${i.id}|${iVariantKey}|${iExtraKey}`;
                return iGroupKey === groupKey;
            });

            if (existingIndex >= 0) {
                const newItems = [...currentItems];
                const existingItem = newItems[existingIndex];
                const newQty = existingItem.quantity + quantity;
                newItems[existingIndex] = {
                    ...existingItem,
                    quantity: parseFloat(newQty.toFixed(3)),
                };
                return newItems;
            } else {
                return [...currentItems, orderItem];
            }
        };

        if (isTakeaway || !activeTableId) {
            // Fallback to takeaway if no table is selected in dining mode
            if (!isTakeaway && !activeTableId) {
                console.warn("No table selected in dining mode. Falling back to takeaway.");
                setIsTakeaway(true);
            }
            setTakeawayOrder((prev) => ({
                ...prev,
                items: updateOrderItems(prev.items),
                isSentToKOT: false,
            }));
        } else {
            setTables((prev) =>
                prev.map((t) => {
                    const tableIdMatch = String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId);
                    if (tableIdMatch) {
                        const currentOrder = t.order || { items: [], isSentToKOT: false };
                        return {
                            ...t,
                            status: "occupied",
                            order: {
                                ...currentOrder,
                                items: updateOrderItems(currentOrder.items),
                                isSentToKOT: false,
                            },
                        };
                    }
                    return t;
                })
            );
        }
    };

    const initiateAddItem = (menuItem, quantity = 1) => {
        const hasNewPortions = menuItem.portionPricing && menuItem.portionPricing.length > 0;
        const hasLegacyVariants = ["Portion", "Volume", "Weight"].includes(menuItem.sellingType);
        const hasExtras = menuItem.availableExtras && menuItem.availableExtras.length > 0;

        if (hasNewPortions || hasLegacyVariants || hasExtras) {
            setCustomizingItem(menuItem);
            if (hasNewPortions) {
                const defPortion = menuItem.portionPricing.find(p => p.isDefault) || menuItem.portionPricing[0];
                setCustomVariant(defPortion);
                setCustomWeightInput(quantity);
            } else if (menuItem.sellingType === "Weight") {
                setCustomWeightInput(quantity);
                setCustomWeightUnit("kg");
                setCustomVariant(null);
            } else if (hasLegacyVariants) {
                setCustomVariant(menuItem.variants[0]);
                setCustomWeightInput(quantity);
            } else {
                setCustomVariant(null);
                setCustomWeightInput(quantity);
            }
            setCustomExtras({});
            setIsCustomizationModalOpen(true);
        } else {
            addToCart(menuItem, quantity, null, []);
        }
    };

    const handleConfirmCustomization = () => {
        const extrasList = Object.keys(customExtras)
            .filter((name) => customExtras[name] > 0)
            .map((name) => {
                const extraDef = customizingItem.availableExtras.find((e) => e.name === name);
                return { ...extraDef, quantity: customExtras[name] };
            });

        let finalQuantity = typeof customWeightInput === "number" ? customWeightInput : parseFloat(customWeightInput);
        if (isNaN(finalQuantity)) finalQuantity = 0;

        if (customizingItem.sellingType === "Weight" && customWeightUnit === "g") {
            finalQuantity = finalQuantity / 1000;
        }

        addToCart(customizingItem, finalQuantity, customVariant, extrasList, customWeightUnit);
        setIsCustomizationModalOpen(false);
    };

    const updateItemQuantity = (itemIndex, delta) => {
        const updateList = (items) => {
            const item = items[itemIndex];
            let newQty = item.quantity + delta;
            if (item.sellingType === "Weight") {
                newQty = item.quantity + delta * 0.25;
            }
            if (newQty <= 0.001) {
                return items.filter((_, idx) => idx !== itemIndex);
            }
            const newItems = [...items];
            newItems[itemIndex] = {
                ...item,
                quantity: parseFloat(newQty.toFixed(3)),
            };
            return newItems;
        };

        if (isTakeaway) {
            setTakeawayOrder((prev) => ({
                ...prev,
                items: updateList(prev.items),
                isSentToKOT: false,
            }));
        } else {
            setTables((prev) =>
                prev.map((t) => {
                    if ((String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId)) && t.order) {
                        const newItems = updateList(t.order.items);
                        return {
                            ...t,
                            status: newItems.length > 0 ? "occupied" : "available",
                            order: newItems.length > 0 ? { ...t.order, items: newItems, isSentToKOT: false } : null,
                        };
                    }
                    return t;
                })
            );
        }
    };

    const updateItemUnit = (itemIndex, selectedUnit) => {
        const updateList = (items) => {
            const item = items[itemIndex];
            if (!item) return items;
            const newItems = [...items];
            newItems[itemIndex] = {
                ...item,
                selectedUnit,
            };
            return newItems;
        };

        if (isTakeaway) {
            setTakeawayOrder((prev) => ({
                ...prev,
                items: updateList(prev.items),
                isSentToKOT: false,
            }));
        } else {
            setTables((prev) =>
                prev.map((t) => {
                    if ((String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId)) && t.order) {
                        const newItems = updateList(t.order.items);
                        return {
                            ...t,
                            order: { ...t.order, items: newItems, isSentToKOT: false },
                        };
                    }
                    return t;
                })
            );
        }
    };

    const handleSendToKOT = async () => {
        const nowTs = Date.now();
        const table = !isTakeaway
            ? tables.find((t) => String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId))
            : null;
        const currentOrder = isTakeaway
            ? takeawayOrder
            : table?.order || { items: [] };
        const orderItems = currentOrder.items || [];

        if (orderItems.length === 0) return;

        try {
            const { subtotal, taxTotal, total, taxBreakdown } = calculateBillDetails(
                orderItems,
                currentOrder.discount || { type: 'flat', value: 0 },
                settings?.defaultTaxPercent || 0,
                true, // autoRound
                isTakeaway ? exchangeCredit : 0,
                branchStateCode,
                null // TODO: Get customer state code
            );

            const payloadItems = orderItems.map(item => {
                const itemTaxPercent = (item.taxPercent !== undefined && item.taxPercent !== null) 
                    ? Number(item.taxPercent) 
                    : (settings?.defaultTaxPercent || 0);
                return {
                    itemId: item.id || item._id,
                    itemName: item.name,
                    price: item.selectedVariant ? item.selectedVariant.price : (item.price || item.sellingPrice),
                    quantity: item.quantity,
                    totalAmount: calculateItemTotal(item),
                    variantId: item.selectedVariant ? (item.selectedVariant._id || item.selectedVariant.id) : null,
                    portionName: item.selectedVariant ? item.selectedVariant.name : null,
                    quantityFactor: item.selectedVariant ? (item.selectedVariant.quantityFactor || 1) : 1,
                    notes: item.suggestion,
                    taxPercent: itemTaxPercent,
                    taxAmount: ((calculateItemTotal(item) * itemTaxPercent) / 100),
                    selectedUnit: item.selectedUnit || "PRIMARY",
                    conversionFactor: item.conversionFactor || 1
                };
            });

            // 1) Create or Update backend Order
            let existingOrderId = currentOrder.orderId;
            const orderPayload = {
                shopId: currentShopId,
                branchId: getResolvedBranchId(),
                businessType: businessType || "RESTAURANT",
                orderType: activeOrderType,
                customerId: null,
                tableId: !isTakeaway ? table?._id || table?.id : null,
                items: payloadItems,
                subtotal,
                discountTotal: currentOrder.discountTotal || 0,
                taxTotal,
                grandTotal: total,
                taxBreakdown,
                exchangeCredit: exchangeCredit,
                originalOrderId: originalOrderId,
                isExchange: isExchange,
                returnedItems: returnedItems,
                createdBy: currentUser._id,
                notes: "Additional items added via KOT"
            };

            if (existingOrderId) {
                await orderService.updateOrder(existingOrderId, orderPayload);
            } else {
                const order = await orderService.createOrder(orderPayload);
                existingOrderId = order._id;
            }

            // 2) Create KOT only for new items or increased quantities
            const kitchenItems = orderItems
                .map(item => {
                    const previouslySent = item.sentQuantity || 0;
                    const diff = item.quantity - previouslySent;
                    if (diff > 0) {
                        return {
                            itemId: item.id || item._id,
                            itemName: item.name,
                            quantity: diff,
                            notes: item.suggestion || "",
                            variant: item.selectedVariant?.name || ""
                        };
                    }
                    return null;
                })
                .filter(Boolean);

            if (kitchenItems.length > 0) {
                await api.post('/kitchen/kots', {
                    shopId: currentShopId,
                    branchId: getResolvedBranchId(),
                    orderId: existingOrderId,
                    tableId: !isTakeaway ? table?._id || table?.id : null,
                    items: kitchenItems.map(k => ({ itemId: k.itemId, quantity: k.quantity, notes: k.notes }))
                });
            }

            // 3) Update local state with sentQuantity and orderId
            const updatedItems = orderItems.map(item => ({
                ...item,
                sentQuantity: item.quantity
            }));

            if (isTakeaway) {
                setTakeawayOrder({
                    ...takeawayOrder,
                    items: updatedItems,
                    orderId: existingOrderId,
                    isSentToKOT: true,
                    kotSentAt: nowTs,
                    kotStatus: "preparing",
                });
            } else {
                setTables((prev) =>
                    prev.map((t) => {
                        if (String(t._id || t.id) === String(activeTableId)) {
                            return {
                                ...t,
                                startTime: t.startTime ? t.startTime : nowTs,
                                order: {
                                    ...(t.order || {}),
                                    orderId: existingOrderId,
                                    isSentToKOT: true,
                                    kotSentAt: nowTs,
                                    kotStatus: "preparing",
                                    items: updatedItems,
                                },
                            };
                        }
                        return t;
                    })
                );
            }

            // Print KOT (only the newly sent/incremental items)
            if (kitchenItems.length > 0) {
                const tableLabel = isTakeaway ? "Takeaway" : (table?.name || "");
                const orderLabel = table?.order?.orderNumber ? `Order #${table.order.orderNumber}` : "";

                printKot({
                    header: getPrintHeader(),
                    meta: {
                        orderLabel,
                        tableLabel: tableLabel ? `Table: ${tableLabel}` : "",
                        printedAt: new Date().toLocaleString(),
                    },
                    items: kitchenItems.map((k) => ({
                        name: k.itemName,
                        qty: k.quantity,
                        notes: k.notes,
                        variant: k.variant,
                    })),
                });
            }
        } catch (error) {
            console.error("Failed to send KOT / create order:", error);
            toast.error("Failed to send KOT. Please try again.");
        }
    };

    const handleFinalizePayment = async (method, billDetails, paidAmount = null, directCustName = "", directCustPhone = "", payments = []) => {
        const now = Date.now();
        const table = !isTakeaway ? tables.find(t => String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId)) : null;
        const orderItems = isTakeaway ? takeawayOrder.items : table?.order?.items || [];
        
        // Use total from payments array if available, otherwise fallback to paidAmount or finalTotal
        const finalPaidAmount = payments.length > 0 
            ? payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
            : (paidAmount !== null ? paidAmount : billDetails.finalTotal);
            
        const finalCustName = directCustName || takeawayCustName || "";
        const finalCustPhone = directCustPhone || takeawayCustPhone || "";

        const saleRecord = {
            id: now,
            amount: billDetails.finalTotal,
            paidAmount: finalPaidAmount,
            ...billDetails,
            taxAmount: billDetails.taxAmount || orderItems.reduce((sum, item) => {
                const itemTaxPercent = (item.taxPercent !== undefined && item.taxPercent !== null) 
                    ? Number(item.taxPercent) 
                    : (settings?.defaultTaxPercent || 0);
                return sum + ((calculateItemTotal(item) * itemTaxPercent) / 100);
            }, 0),
            couponUsed: billDiscount.type !== "flat" || billDiscount.value > 0 ? "COUPON" : null,
            date: new Date().toISOString().split("T")[0],
            method: payments.length > 1 ? "COMBINED" : method,
            timestamp: now,
            tableName: !isTakeaway ? table?.name : "Takeaway",
            waiterName: currentUser?.name || "Staff",
            itemCount: orderItems.length,
            items: orderItems.map(item => {
                const itemTaxPercent = (item.taxPercent !== undefined && item.taxPercent !== null) 
                    ? Number(item.taxPercent) 
                    : (settings?.defaultTaxPercent || 0);
                return {
                    ...item,
                    taxPercent: itemTaxPercent,
                    taxAmount: ((calculateItemTotal(item) * itemTaxPercent) / 100),
                    selectedUnit: item.selectedUnit || "PRIMARY",
                    conversionFactor: item.conversionFactor || 1
                };
            }),
            payments: payments // Store payment breakdown in history too
        };

        try {
            const currentOrder = isTakeaway ? takeawayOrder : table?.order || { items: [] };
            let paymentStatus = 'PAID';
            if (finalPaidAmount === 0) paymentStatus = 'PENDING';
            else if (finalPaidAmount < billDetails.finalTotal) paymentStatus = 'PARTIAL';

            let currentOrderId = currentOrder.orderId;

            if (!currentOrderId) {
                const orderPayload = {
                    shopId: currentShopId,
                    branchId: getResolvedBranchId(),
                    businessType: businessType || "RESTAURANT",
                    orderType: activeOrderType,
                    customerId: billDetails.customerId || null,
                    customerName: finalCustName,
                    customerPhone: finalCustPhone,
                    tableId: !isTakeaway ? table?._id || table?.id : null,
                    items: orderItems.map(item => {
                        const itemTaxPercent = (item.taxPercent !== undefined && item.taxPercent !== null) 
                            ? Number(item.taxPercent) 
                            : (settings?.defaultTaxPercent || 0);
                        return {
                            itemId: item.id || item._id,
                            itemName: item.name,
                            price: item.selectedVariant ? item.selectedVariant.price : (item.price || item.sellingPrice),
                            quantity: item.quantity,
                            totalAmount: calculateItemTotal(item),
                            variantId: item.selectedVariant ? (item.selectedVariant._id || item.selectedVariant.id) : null,
                            portionName: item.selectedVariant ? item.selectedVariant.name : null,
                            quantityFactor: item.selectedVariant ? (item.selectedVariant.quantityFactor || 1) : 1,
                            notes: item.suggestion,
                            taxPercent: itemTaxPercent,
                            taxAmount: ((calculateItemTotal(item) * itemTaxPercent) / 100),
                            selectedUnit: item.selectedUnit || "PRIMARY",
                            conversionFactor: item.conversionFactor || 1
                        };
                    }),
                    subtotal: billDetails.subtotal,
                    discountTotal: billDetails.discountAmount,
                    taxTotal: billDetails.taxAmount,
                    grandTotal: billDetails.finalTotal,
                    taxBreakdown: billDetails.taxBreakdown,
                    exchangeCredit: exchangeCredit,
                    originalOrderId: originalOrderId,
                    isExchange: isExchange,
                    returnedItems: returnedItems,
                    totalPaid: finalPaidAmount,
                    paymentStatus: paymentStatus,
                    orderStatus: 'COMPLETED',
                    createdBy: currentUser._id
                };
                const createdOrder = await orderService.createOrder(orderPayload);
                currentOrderId = createdOrder._id;
            }

            // Always register the payment if the paid amount is greater than 0
            if (currentOrderId && finalPaidAmount >= 0) {
                await orderService.addPayment(currentOrderId, {
                    payments: payments.length > 0 ? payments : undefined, // Explicit array support
                    paymentMethod: method.toUpperCase(),
                    amount: finalPaidAmount,
                    customerName: finalCustName,
                    customerPhone: finalCustPhone
                });

                // createOrder already sets it to COMPLETED, but we update status just in case to ensure synchronization
                await orderService.updateStatus(currentOrderId, { status: 'COMPLETED' });
            }

            try {
                if (!isTakeaway && table) {
                    await tableService.updateTable(table._id || table.id, { status: "AVAILABLE" });
                }
            } catch (tErr) {
                console.warn("Table release call failed (might be already released by backend):", tErr);
            }

            setSalesHistory((prev) => [...prev, saleRecord]);
            if (isTakeaway) {
                resetTakeaway();
            } else {
                setTables((prev) =>
                    prev.map((t) => {
                        const tid = t._id || t.id;
                        const aid = activeTableId;
                        if (String(tid) === String(aid)) {
                            return { ...t, status: "available", order: null, startTime: null, isParent: false, childTables: [] };
                        }
                        if (String(t.parentTableId) === String(aid)) {
                            return { ...t, status: "available", parentTableId: null, startTime: null };
                        }
                        return t;
                    })
                );
            }
            setIsPaymentModalOpen(false);
            resetBillingState();
            resetExchange();
            setTakeawayCustName("");
            setTakeawayCustPhone("");
            setOrderSearch("");
            setView("tables");
            toast.success("Order completed successfully!");

            // Proactive table clean-up
            if (!isTakeaway) {
                setActiveTableId(null);
            }
        } catch (err) {
            console.error("Failed to finalize order / payment:", err);
            setSalesHistory((prev) => [...prev, saleRecord]);
        }
    };

    const openNoteModal = (index, currentText) => {
        setNoteModal({ isOpen: true, idx: index, text: currentText || "" });
    };

    const handleSaveNote = () => {
        if (noteModal.idx !== null) {
            const updateList = (items) => {
                const newItems = [...items];
                newItems[noteModal.idx] = { ...newItems[noteModal.idx], suggestion: noteModal.text };
                return newItems;
            };
            if (isTakeaway) {
                setTakeawayOrder((prev) => ({ ...prev, items: updateList(prev.items) }));
            } else {
                setTables((prev) =>
                    prev.map((t) =>
                        (String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId)) && t.order
                            ? { ...t, order: { ...t.order, items: updateList(t.order.items) } }
                            : t
                    )
                );
            }
        }
        setNoteModal({ isOpen: false, idx: null, text: "" });
    };

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={
                    <Login
                        shopName={settings.shopName}
                        rolesList={rolesList}
                        staffList={staffList}
                        onSetBusinessType={setBusinessType}
                        onSetBusinessSubtype={setBusinessSubtype}
                        onSetEnabledModules={setEnabledModules}
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    }

    return (
        <div className={`flex flex-col-reverse md:flex-row h-screen ${theme.pageBg} overflow-hidden font-sans`}>
            {/* Receipt Print Area */}
            <style>{`
                @media print {
                  @page { size: 80mm auto; margin: 0mm; }
                  body * { visibility: hidden; }
                  #receipt-print-area, #receipt-print-area * { visibility: visible; }
                  #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>
            <div
                id="receipt-print-area"
                className="hidden print:block p-4 font-mono text-xs w-[80mm] mx-auto bg-white"
            >
                <div className="text-center mb-4">
                    <h1 className="text-lg font-bold">{settings.shopName}</h1>
                    <p>Ph: {currentUser?.phone}</p>
                    <p>{new Date().toLocaleString()}</p>
                </div>
                <div className="text-center">Receipt Printing Enabled</div>
            </div>

            <TextProvider>
                <Layout
                    view={view}
                    setView={setView}
                    currentUser={currentUser}
                    handleLogout={handleLogout}
                    businessType={businessType}
                    businessSubtype={businessSubtype}
                    enabledModules={enabledModules}
                    onBusinessTypeChange={(type, subtype, modules) => {
                        setBusinessType(type);
                        setBusinessSubtype(subtype);
                        const newModules = {};
                        Object.keys(modules).forEach(key => {
                            newModules[key] = modules[key] === true;
                        });
                        setEnabledModules({ ...newModules });
                    }}
                    isTakeaway={isTakeaway}
                    takeawayOrder={takeawayOrder}
                    setIsTakeaway={setIsTakeaway}
                    setTakeawayOrder={setTakeawayOrder}
                    setOrderSearch={setOrderSearch}
                    pendingOnlineOrdersCount={pendingOnlineOrdersCount}
                    sessionInfo={sessionInfo}
                    isOnlineOrderingEnabled={isOnlineOrderingEnabled}
                    setIsOnlineOrderingEnabled={setIsOnlineOrderingEnabled}
                    shopName={settings.shopName}
                    onSwitchShop={handleSwitchShopAction}
                >
                    <AppRoutes
                        view={view}
                        isTakeaway={isTakeaway}
                        activeTableId={activeTableId}
                        tables={tables}
                        categories={categories}
                        diningLoading={diningLoading}
                        takeawayOrder={takeawayOrder}
                        reservations={reservations}
                        currentUser={currentUser}
                        getTableDuration={getTableDuration}
                        formatCurrency={formatCurrency}
                        calculateTotal={calculateTotal}
                        calculateItemTotal={calculateItemTotal}
                        calculateBillDetails={calculateBillDetails}
                        offers={offers}
                        handlePrintReceipt={handlePrintReceipt}
                        handleSendToKOT={handleSendToKOT}
                        businessTypeData={businessTypeData}
                        setIsPaymentModalOpen={setIsPaymentModalOpen}
                        setBillingStage={setBillingStage}
                        initiateAddItem={initiateAddItem}
                        updateItemQuantity={updateItemQuantity}
                        updateItemUnit={updateItemUnit}
                        openNoteModal={openNoteModal}
                        takeawayCustName={takeawayCustName}
                        setTakeawayCustName={setTakeawayCustName}
                        takeawayCustPhone={takeawayCustPhone}
                        setTakeawayCustPhone={setTakeawayCustPhone}
                        orderSearch={orderSearch}
                        setOrderSearch={setOrderSearch}
                        setIsTakeaway={setIsTakeaway}
                        setTakeawayOrder={setTakeawayOrder}
                        setView={setView}
                        settings={settings}
                        hasPermission={hasPermission}
                        hasPermissionFor={hasPermissionFor}
                        setActiveTableId={setActiveTableId}
                        setReservations={setReservations}
                        handleCheckInReservation={handleCheckInReservation}
                        onlineOrders={onlineOrders}
                        setOnlineOrders={setOnlineOrders}
                        onlineOrderTab={onlineOrderTab}
                        setOnlineOrderTab={setOnlineOrderTab}
                        pendingOnlineOrdersCount={pendingOnlineOrdersCount}
                        handleAcceptOnlineOrder={handleAcceptOnlineOrder}
                        handleRejectOnlineOrder={handleRejectOnlineOrder}
                        handleCompleteOnlineKOT={handleCompleteOnlineKOT}
                        setPreviewOrder={setPreviewOrder}
                        handleCompleteKOT={handleCompleteKOT}
                        currentTime={currentTime}
                        menu={menu}
                        setMenu={setMenu}
                        inventoryItems={inventoryItems}
                        salesHistory={salesHistory}
                        staffList={staffList}
                        authLogs={authLogs}
                        rolesList={rolesList}
                        setRolesList={setRolesList}
                        setStaffList={setStaffList}
                        setSettings={setSettings}
                        setTables={setTables}
                        organization={organization}
                        setOrganization={setOrganization}
                        branches={branches}
                        setBranches={setBranches}
                        joinTables={joinTables}
                        refreshData={refreshData}
                    />
                </Layout>
            </TextProvider>

            {/* Modals */}
            <CustomizationModal
                isOpen={isCustomizationModalOpen}
                onClose={() => setIsCustomizationModalOpen(false)}
                item={customizingItem}
                onConfirm={handleConfirmCustomization}
                customVariant={customVariant}
                setCustomVariant={setCustomVariant}
                customWeightInput={customWeightInput}
                setCustomWeightInput={setCustomWeightInput}
                customWeightUnit={customWeightUnit}
                setCustomWeightUnit={setCustomWeightUnit}
                customExtras={customExtras}
                setCustomExtras={setCustomExtras}
            />

            <NoteModal
                isOpen={noteModal.isOpen}
                onClose={() => setNoteModal({ isOpen: false, idx: null, text: "" })}
                noteData={noteModal}
                onSave={handleSaveNote}
                onDataChange={(text) => setNoteModal({ ...noteModal, text })}
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                isTakeaway={isTakeaway}
                activeTableId={activeTableId}
                tableName={activeTable ? activeTable.name : ""}
                orderItems={activeOrderItems}
                settings={settings}
                onFinalizePayment={handleFinalizePayment}
                onPrintBill={handlePrintReceipt}
                hasPermission={hasPermission}
                hasPermissionFor={hasPermissionFor}
                custName={takeawayCustName}
                setCustName={setTakeawayCustName}
                custPhone={takeawayCustPhone}
                setCustPhone={setTakeawayCustPhone}
                existingCustomerId={activeOrderCustomerId}
                exchangeCredit={exchangeCredit}
                originalOrderId={originalOrderId}
            />

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSave={(title, amount) => {
                    addExpense({
                        id: Date.now(),
                        title,
                        amount: parseFloat(amount),
                        date: new Date().toISOString().split("T")[0],
                        category: "General",
                    });
                }}
            />

            <FullOrderSummaryModal
                isOpen={isFullOrderSummaryOpen}
                onClose={() => setIsFullOrderSummaryOpen(false)}
                isTakeaway={isTakeaway}
                activeTableId={activeTableId}
                tableName={activeTable ? activeTable.name : ""}
                orderItems={activeOrderItems}
                calculateItemTotal={calculateItemTotal}
                calculateBillDetails={calculateBillDetails}
                settings={settings}
                calculateTotal={calculateTotal}
                onPrint={handlePrintReceipt}
            />

            {SHOW_MULTI_SHOP_MODAL && (
                <MultipleShopsModal 
                    isOpen={isMultipleShopsModalOpen}
                    onClose={handleIgnoreShopsAlert}
                    onSwitch={handleSwitchShopAction}
                    shops={currentUser?.shops || []}
                    currentShopName={organization?.businessName}
                />
            )}

            <SubscriptionNoticeModal
                isOpen={isSubscriptionModalOpen}
                onClose={handleCloseSubscriptionNotice}
                user={currentUser}
                isOwner={currentUser?.isOwner}
                title={organization?.subscriptionMethod === 'trial_run' ? 'Trial run access required' : undefined}
                message={organization?.subscriptionMethod === 'trial_run'
                    ? (
                        organization?.trialRunStatus === 'pending'
                            ? 'Your trial run request is pending super admin approval. You can continue viewing lists, but write actions stay blocked.'
                            : 'Trial run is not approved yet. Request trial run access from Organization.'
                    )
                    : undefined}
                showSubscribeButton={organization?.subscriptionMethod !== 'trial_run'}
                elevateForProfile={showProfileCompletionOverlay}
                onSubscribe={() => {
                    setIsSubscriptionModalOpen(false);
                    setView('organization');
                }}
            />
            <SubscriptionNoticeModal
                isOpen={!!subscriptionRequiredMessage}
                onClose={() => setSubscriptionRequiredMessage(null)}
                user={currentUser}
                isOwner={currentUser?.isOwner}
                title="Subscription required"
                message={subscriptionRequiredMessage}
                elevateForProfile={showProfileCompletionOverlay}
                onSubscribe={() => {
                    setSubscriptionRequiredMessage(null);
                    setView('organization');
                    navigate(ROUTE_KEY_TO_PATH.ORGANIZATION || '/organization');
                }}
            />
            {showProfileCompletionOverlay && (
                <div
                    className="fixed right-4 bottom-4 z-[70] select-none cursor-grab active:cursor-grabbing"
                    style={{
                        transform: `translate(${profileOffset.x}px, ${profileOffset.y}px)`,
                        transition: isDraggingProfile ? 'none' : 'transform 0.1s ease-out'
                    }}
                    onMouseDown={handleMouseDownProfile}
                >
                    <button
                        type="button"
                        onClick={() => setIsProfileHintExpanded((prev) => !prev)}
                        className={`w-14 h-14 rounded-full shadow-2xl border flex items-center justify-center transition-all hover:scale-105 ${theme.cardBg} ${theme.inputBorder}`}
                        title="Profile/Subscription Alert"
                    >
                        <AlertTriangle size={20} className="text-amber-500" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center">
                            !
                        </span>
                    </button>

                    {isProfileHintExpanded && (
                        <div
                            className="absolute right-0 bottom-16 w-[320px] sm:w-[360px]"
                        >
                            <div className={`relative rounded-2xl shadow-2xl border p-4 ${theme.cardBg} ${theme.inputBorder}`}>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold leading-5 ${theme.textPrimary}`}>Profile not completed</p>
                                        <p className={`text-xs mt-1 leading-5 ${theme.textSecondary}`}>
                                            Setup completion is {uiProfileCompletion || 0}%. Finish profile details to unlock full onboarding.
                                        </p>
                                        <button
                                            onClick={handleCompleteSetupNavigation}
                                            className={`mt-3 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${theme.buttonBg} ${theme.buttonText}`}
                                        >
                                            Complete Setup
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsProfileHintExpanded(false)}
                                    className={`absolute top-4 right-4 p-1 rounded-lg ${theme.textMuted} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {globalLoading && (
                <ThemeLoader 
                    fullScreen={true} 
                    message={loadingMessage} 
                />
            )}
        </div>
    );
};

export default AppContent;
