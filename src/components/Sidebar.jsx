import React, { useMemo, useState, useEffect } from "react";
import {
    Utensils,
    Globe,
    MonitorPlay,
    CalendarCheck,
    Package,
    TrendingUp,
    Settings,
    UserCog,
    LogOut,
    X,
    ShoppingBag,
    Building2,
    Truck,
    Wrench,
    ShoppingCart,
    Briefcase,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    Store,
    Tag,
    CreditCard,
    Grid3X3,
    LayoutDashboard,
    Users,
    UserCheck,
    UserPlus,
    Boxes,
    Zap,
    ClipboardList,
    Wallet,
    RotateCcw,
    Receipt,
    Coins,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTE_ACCESS, ROUTE_KEYS_ORDER } from "../constants/routeAccess";
import { getModuleList } from "../config/businessTypes";
import { usePermission } from "../auth/usePermission";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
    computeUserHasActiveSubscription,
    getSubscriptionPlanLabel,
    isSubscriptionPaymentPending,
} from "../utils/subscriptionStatus";
import { useTakeaway } from "../pages/Takeaway/TakeawayContext";

const canAccessRoute = (can, canModule, routeKey) => {
    const r = ROUTE_ACCESS[routeKey];
    if (!r) return true; // No permission required (e.g. SUPPLIERS)
    if (r.action != null && r.action !== undefined) return can(r.module, r.action);
    return canModule(r.module);
};

const Sidebar = ({
    view,
    setView,
    handleLogout,
    isTakeaway,
    takeawayOrder,
    setIsTakeaway,
    setTakeawayOrder,
    setOrderSearch,
    pendingOnlineOrdersCount,
    mobileOpen = false,
    onMobileClose = () => { },
    enabledModules = {},
    businessType,
    businessSubtype,
    isExpanded,
    setIsExpanded,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { can, canModule } = usePermission();
    const { theme } = useTheme();
    const { user } = useAuth();
    const { organization } = useApp();
    const { setTableId, activateSaleTab } = useTakeaway();
    const [isSelfServiceExpanded, setIsSelfServiceExpanded] = useState(true);
    const [isSalesExpanded, setIsSalesExpanded] = useState(true);
    const [isPurchasesExpanded, setIsPurchasesExpanded] = useState(true);
    const closeMobile = () => onMobileClose?.();

    // Close all subitems when sidebar is collapsed
    useEffect(() => {
        if (!isExpanded) {
            setIsSelfServiceExpanded(false);
            setIsSalesExpanded(false);
            setIsPurchasesExpanded(false);
        }
    }, [isExpanded]);

    const getLogoSrc = () => {
        if (!organization?.logoUrl) return null;
        if (organization.logoUrl.startsWith("http")) return organization.logoUrl;
        try {
            const baseURL = api.defaults.baseURL || "";
            const host = baseURL.replace(/\/api\/?$/, "");
            return `${host}${organization.logoUrl}`;
        } catch (e) {
            return organization.logoUrl;
        }
    };

    const shopInitial = organization?.businessName ? organization.businessName.charAt(0).toUpperCase() : "S";

    const hasActiveSubscription = computeUserHasActiveSubscription(user, organization);
    const paymentPending = isSubscriptionPaymentPending(organization);
    const planBadgeLabel = getSubscriptionPlanLabel(user, organization);
    const subscriptionEndRaw = user?.subscription?.endDate || organization?.subscriptionEndDate;

    const getShopPrefix = () => {
        const segs = String(location.pathname || "/").split("/").filter(Boolean);
        const first = segs[0];
        if (!first) return "";
        const ROOTS = new Set([
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
        ]);
        return ROOTS.has(first) ? "" : `/${first}`;
    };

    const goDashboard = () => {
        const prefix = getShopPrefix();
        navigate(`${prefix}/dashboard`);
        closeMobile();
    };


    // Modules to show: from business type intersected with user permissions; if no business list, use allowed-by-permission only
    const moduleList = useMemo(() => {
        // 1. Determine baseline allowed modules
        let result = ROUTE_KEYS_ORDER.filter((key) => canAccessRoute(can, canModule, key));

        // 2. Consolidate TAKEAWAY and DIRECT_SALE: if both allowed, only show TAKEAWAY
        if (result.includes('TAKEAWAY') && result.includes('DIRECT_SALE')) {
            result = result.filter(k => k !== 'DIRECT_SALE');
        }

        // 3. Prefer Parties over Suppliers when user has PARTIES permission
        if (result.includes('SUPPLIERS') && result.includes('PARTIES')) {
            result = result.filter(k => k !== 'SUPPLIERS');
        }

        // --- NEW: Grouping Logic ---
        const selfServiceKeys = ['MYATTENDANCE', 'MYLEAVES', 'MYSALARY'];
        const activeSelfService = result.filter(k => selfServiceKeys.includes(k));

        if (result.length > 5 && activeSelfService.length > 1) {
            // Replace the first occurrence of any self-service item with 'SELF_SERVICE'
            // and remove the others.
            let grouped = false;
            const newResult = [];
            for (const key of result) {
                if (selfServiceKeys.includes(key)) {
                    if (!grouped) {
                        newResult.push('SELF_SERVICE');
                        grouped = true;
                    }
                } else {
                    newResult.push(key);
                }
            }
            result = newResult;
        }

        // --- NEW: Sales Grouping Logic ---
        const salesKeys = ['SALE_MARKING', 'SALES_HISTORY', 'PAY_IN'];
        const activeSalesArr = result.filter(k => salesKeys.includes(k));

        if (result.length > 5 && activeSalesArr.length > 1) {
            let grouped = false;
            const newResult = [];
            for (const key of result) {
                if (salesKeys.includes(key)) {
                    if (!grouped) {
                        newResult.push('SALES');
                        grouped = true;
                    }
                } else {
                    newResult.push(key);
                }
            }
            result = newResult;
        }

        // --- NEW: Purchases Grouping Logic ---
        const purchasesKeys = ['PURCHASES', 'PAY_OUT'];
        const activePurchasesArr = result.filter(k => purchasesKeys.includes(k));

        if (activePurchasesArr.length > 1) {
            let grouped = false;
            const newResult = [];
            for (const key of result) {
                if (purchasesKeys.includes(key)) {
                    if (!grouped) {
                        newResult.push('PURCHASES_GROUP');
                        grouped = true;
                    }
                } else {
                    newResult.push(key);
                }
            }
            result = newResult;
        }

        return result;
    }, [businessType, businessSubtype, enabledModules, can, canModule, user]);

    const checkActive = (v, ...matches) => matches.some(m => String(v).toLowerCase() === String(m).toLowerCase());

    const MODULE_CONFIG = {
        DASHBOARD: {
            icon: LayoutDashboard, label: "Dashboard",
            onClick: () => { setView("dashboard"); goDashboard(); },
            isActive: checkActive(view, "dashboard", "owner-dashboard")
        },
        DINING: {
            icon: Utensils, label: "Dining Hall",
            onClick: () => { setView("tables"); setIsTakeaway(false); navigate("/dininghall"); closeMobile(); },
            isActive: checkActive(view, "DINING", "tables") || (checkActive(view, "order") && !isTakeaway)
        },
        TAKEAWAY: {
            icon: ShoppingBag, label: "Takeaway",
            onClick: () => {
                setTableId(null);
                activateSaleTab("TAKEAWAY");
                setView("order");
                setOrderSearch("");
                navigate("/takeaway");
                closeMobile();
            },
            isActive: checkActive(view, "TAKEAWAY", "order") && isTakeaway && takeawayOrder?.orderType === 'TAKEAWAY'
        },
        DIRECT_SALE: {
            icon: ShoppingCart, label: "Direct Sale",
            onClick: () => {
                setTableId(null);
                activateSaleTab("DIRECT_SALE");
                setView("order");
                setOrderSearch("");
                navigate("/takeaway");
                closeMobile();
            },
            isActive: checkActive(view, "DIRECT_SALE", "TAKEAWAY", "order") && isTakeaway && takeawayOrder?.orderType === 'DIRECT_SALE'
        },
        WHOLESALE: {
            icon: Store, label: "Wholesale",
            onClick: () => {
                setTableId(null);
                setView("order");
                setIsTakeaway(true);
                setTakeawayOrder((prev) => ({ ...prev, orderType: "WHOLESALE", items: prev?.items || [] }));
                setOrderSearch("");
                navigate("/wholesale");
                closeMobile();
            },
            isActive: checkActive(view, "WHOLESALE", "order") && isTakeaway && takeawayOrder?.orderType === 'WHOLESALE'
        },
        ONLINE_ORDERS: {
            icon: Globe, label: "Online Orders",
            onClick: () => { setView("online-orders"); navigate("/online-orders"); closeMobile(); },
            isActive: checkActive(view, "online-orders", "ONLINE_ORDERS"),
            badge: pendingOnlineOrdersCount
        },
        KDS: {
            icon: MonitorPlay, label: "Kitchen Display (KDS)",
            onClick: () => { setView("kds"); navigate("/kds"); closeMobile(); },
            isActive: checkActive(view, "kds", "KDS")
        },
        RESERVATIONS: {
            icon: CalendarCheck, label: "Reservations",
            onClick: () => { setView("reservations"); navigate("/reservations"); closeMobile(); },
            isActive: checkActive(view, "reservations", "RESERVATIONS")
        },
        INVENTORY: {
            icon: Boxes, label: "Stock Items",
            onClick: () => { setView("inventory"); navigate("/inventory"); closeMobile(); },
            isActive: checkActive(view, "inventory", "INVENTORY")
        },
        SALE_MARKING: {
            icon: CalendarCheck, label: "Sale Marking",
            onClick: () => { setView("sale-marking"); navigate("/sale-marking"); closeMobile(); },
            isActive: checkActive(view, "sale-marking", "SALE_MARKING")
        },
        SALES_HISTORY: {
            icon: ShoppingBag, label: "Sales Invoice",
            onClick: () => { setView("sales-history"); navigate("/sales-history"); closeMobile(); },
            isActive: checkActive(view, "sales-history", "SALES_HISTORY")
        },
        SALES_RETURN: {
            icon: RotateCcw, label: "Sales Returns",
            onClick: () => { setView("salesreturn"); navigate("/salesreturn"); closeMobile(); },
            isActive: checkActive(view, "salesreturn", "SALES_RETURN") || location.pathname.includes("/salesreturn")
        },
        PAY_IN: {
            icon: Wallet, label: "Pay In",
            onClick: () => { setView("pay-in"); navigate("/dashboard/pay-in"); closeMobile(); },
            isActive: checkActive(view, "pay-in", "PAY_IN") || location.pathname.includes("/dashboard/pay-in")
        },
        PAY_OUT: {
            icon: Truck, label: "Pay Out",
            onClick: () => { setView("pay-out"); navigate("/dashboard/pay-out"); closeMobile(); },
            isActive: checkActive(view, "pay-out", "PAY_OUT") || location.pathname.includes("/dashboard/pay-out")
        },
        REPORTS: {
            icon: TrendingUp, label: "Reports",
            onClick: () => { setView("reports"); navigate("/reports"); closeMobile(); },
            isActive: checkActive(view, "reports", "REPORTS")
        },
        OFFERS: {
            icon: Tag, label: "Offers",
            onClick: () => { setView("offers"); navigate("/offers"); closeMobile(); },
            isActive: checkActive(view, "offers", "OFFERS")
        },
        SETTINGS: {
            icon: Settings, label: "Settings",
            onClick: () => { setView("settings"); navigate("/settings"); closeMobile(); },
            isActive: checkActive(view, "settings", "SETTINGS")
        },
        STAFF: {
            icon: UserCog, label: "Staff",
            onClick: () => { setView("staff"); navigate("/staff"); closeMobile(); },
            isActive: checkActive(view, "staff", "STAFF")
        },
        MYATTENDANCE: {
            icon: CalendarCheck, label: "My Attendance",
            onClick: () => { setView("my-attendance"); navigate("/my-attendance"); closeMobile(); },
            isActive: checkActive(view, "my-attendance", "MYATTENDANCE")
        },
        MYLEAVES: {
            icon: ClipboardList, label: "My Leaves",
            onClick: () => { setView("my-leaves"); navigate("/my-leaves"); closeMobile(); },
            isActive: checkActive(view, "my-leaves", "MYLEAVES")
        },
        MYSALARY: {
            icon: Wallet, label: "My Salary",
            onClick: () => { setView("my-salary"); navigate("/my-salary"); closeMobile(); },
            isActive: checkActive(view, "my-salary", "MYSALARY")
        },
        ORGANIZATION: {
            icon: Building2, label: "Organization",
            onClick: () => { setView("organization"); navigate("/organization"); closeMobile(); },
            isActive: checkActive(view, "organization", "ORGANIZATION")
        },
        SUPPLIERS: {
            icon: Truck, label: "Suppliers",
            onClick: () => { setView("suppliers"); navigate("/suppliers"); closeMobile(); },
            isActive: checkActive(view, "suppliers", "SUPPLIERS")
        },
        PARTIES: {
            icon: Users, label: "Parties",
            onClick: () => { setView("parties"); navigate("/parties"); closeMobile(); },
            isActive: checkActive(view, "parties", "PARTIES")
        },
        SERVICE: {
            icon: Wrench, label: "Service & Repairs",
            onClick: () => { setView("service"); navigate("/service"); closeMobile(); },
            isActive: checkActive(view, "service", "SERVICE")
        },
        PURCHASES: {
            icon: ShoppingCart, label: "Purchase Invoice",
            onClick: () => { setView("purchases"); navigate("/purchases"); closeMobile(); },
            isActive: checkActive(view, "purchases", "PURCHASES")
        },
        PURCHASE_RETURN: {
            icon: RotateCcw, label: "Purchase Returns",
            onClick: () => { setView("purchasereturn"); navigate("/purchasereturn"); closeMobile(); },
            isActive: checkActive(view, "purchasereturn", "PURCHASE_RETURN") || location.pathname.includes("/purchasereturn")
        },
        BUSINESS_TYPES: {
            icon: Briefcase, label: "Business Types",
            onClick: () => { setView("business-types"); navigate("/business-types"); closeMobile(); },
            isActive: checkActive(view, "business-types", "BUSINESS_TYPES")
        },
        SHOP_MANAGEMENT: {
            icon: Store, label: "Shop Management",
            onClick: () => { setView("shop-management"); navigate("/shop-management"); closeMobile(); },
            isActive: checkActive(view, "shop-management", "SHOP_MANAGEMENT")
        },
        PLAN_MANAGEMENT: {
            icon: Zap, label: "Plan Management",
            onClick: () => { setView("plan-management"); navigate("/plan-management"); closeMobile(); },
            isActive: checkActive(view, "plan-management", "PLAN_MANAGEMENT")
        },
        CLIENT_MANAGEMENT: {
            icon: UserPlus, label: "Client Management",
            onClick: () => { setView("client-management"); navigate("/client-management"); closeMobile(); },
            isActive: checkActive(view, "client-management", "CLIENT_MANAGEMENT")
        },
        SUBSCRIPTION_MANAGEMENT: {
            icon: CreditCard, label: "Subscriptions",
            onClick: () => { setView("subscription-management"); navigate("/subscription-management"); closeMobile(); },
            isActive: checkActive(view, "subscription-management", "SUBSCRIPTION_MANAGEMENT")
        },
        TABLE_MANAGEMENT: {
            icon: Grid3X3, label: "Table Management",
            onClick: () => { setView("table-management"); navigate("/table-management"); closeMobile(); },
            isActive: checkActive(view, "table-management", "TABLE_MANAGEMENT")
        },
        SELF_SERVICE: {
            icon: Briefcase, label: "Self Service",
            isGroup: true,
            children: ['MYATTENDANCE', 'MYLEAVES', 'MYSALARY'].filter(k => canAccessRoute(can, canModule, k))
        },
        SALES: {
            icon: Coins, label: "Sales",
            isGroup: true,
            children: ['SALE_MARKING', 'SALES_HISTORY', 'SALES_RETURN', 'PAY_IN'].filter(k => canAccessRoute(can, canModule, k))
        },
        PURCHASES_GROUP: {
            icon: ShoppingCart, label: "Purchases",
            isGroup: true,
            children: ['PURCHASES', 'PURCHASE_RETURN', 'PAY_OUT'].filter(k => canAccessRoute(can, canModule, k))
        }
    };

    const renderNavButton = (config, key) => {
        if (!config) return null;
        if (config.isGroup) {
            const isAnyChildActive = config.children.some(childKey => MODULE_CONFIG[childKey]?.isActive);
            const isSelfService = key === 'SELF_SERVICE';
            const isSales = key === 'SALES';
            const isPurchases = key === 'PURCHASES_GROUP';
            const isOpen = isSelfService ? isSelfServiceExpanded : (isSales ? isSalesExpanded : (isPurchases ? isPurchasesExpanded : false));
            const toggle = () => {
                if (!isExpanded) {
                    setIsExpanded(true);
                }
                if (isSelfService) {
                    setIsSelfServiceExpanded(!isSelfServiceExpanded);
                } else if (isSales) {
                    setIsSalesExpanded(!isSalesExpanded);
                } else if (isPurchases) {
                    setIsPurchasesExpanded(!isPurchasesExpanded);
                }
            };

            return (
                <div key={key} className="w-full flex flex-col mb-2">
                    <div className={`relative flex w-full ${isExpanded ? 'px-4' : 'px-4 md:px-0 md:justify-center'}`}>
                        <button
                            onClick={config.isGroup ? toggle : config.onClick}
                            className={`p-3 md:p-4 transition-all flex items-center w-full ${isExpanded
                                ? 'gap-4 justify-start rounded-xl md:rounded-2xl'
                                : 'flex-col justify-center gap-1 rounded-2xl md:rounded-[24px]'
                                } ${isAnyChildActive ? theme.sidebarItemActiveBg : theme.sidebarItemHoverBg}`}
                        >
                            <config.icon className="w-6 h-6 md:w-7 md:h-7 shrink-0" />
                            {isExpanded ? (
                                <div className={`flex-1 flex items-center justify-between overflow-hidden transition-all duration-300 max-w-[150px] opacity-100`}>
                                    <span className="font-bold text-sm whitespace-nowrap">{config.label}</span>
                                    {config.isGroup && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                                </div>
                            ) : (
                                <span className="font-bold text-[10px] whitespace-nowrap mt-1">{config.label}</span>
                            )}
                        </button>
                    </div>
                    {isOpen && (
                        <div className="mt-1 flex flex-col items-stretch space-y-1">
                            {config.children.map(childKey => {
                                const childConfig = MODULE_CONFIG[childKey];
                                if (!childConfig) return null;
                                const { icon: ChildIcon, label, onClick, isActive } = childConfig;
                                return (
                                    <button
                                        key={childKey}
                                        onClick={onClick}
                                        className={`mx-6 md:mx-10 p-3 rounded-xl transition-all flex items-center gap-3 ${isActive ? `${theme.sidebarItemActiveBg} shadow-sm` : `hover:bg-black/5 dark:hover:bg-white/5`}`}
                                    >
                                        <ChildIcon size={16} />
                                        <span className="font-bold text-xs">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        const { icon: Icon, label, onClick, isActive, badge } = config;
        return (
            <div key={key} className={`relative flex w-full mb-2 ${isExpanded ? 'px-4' : 'px-4 md:px-0 md:justify-center'}`}>
                <button
                    onClick={onClick}
                    className={`p-3 md:p-4 transition-all flex items-center w-full ${isExpanded
                        ? 'gap-4 justify-start rounded-xl md:rounded-2xl'
                        : 'justify-start md:justify-center gap-4 md:gap-0 rounded-2xl md:rounded-[24px]'
                        } ${isActive
                            ? `${theme.sidebarItemActiveBg} shadow-xl md:scale-105`
                            : `${theme.sidebarItemHoverBg} hover:scale-105`
                        }`}
                    title={!isExpanded ? label : undefined}
                >
                    <Icon className="w-6 h-6 md:w-7 md:h-7 shrink-0" />
                    <span className={`font-bold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-[150px] opacity-100 md:max-w-0 md:opacity-0'}`}>
                        {label}
                    </span>
                </button>
                {badge > 0 && (
                    <span className={`absolute ${isExpanded ? 'top-3 right-6' : 'top-2 right-6 md:top-1 md:right-1 md:-translate-x-1 md:-translate-y-1'} w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow-md border-2 ${theme.sidebarBg.replace('bg-', 'border-')}`}>
                        {badge}
                    </span>
                )}
            </div>
        );
    };


    return (
        <>
            {/* Mobile backdrop */}
            <div
                className={`md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                onClick={closeMobile}
            />

            <div
                className={`
                    fixed top-0 left-0
                    h-screen
                    w-64
                    ${theme.sidebarBg} ${theme.sidebarText}
                    flex flex-col
                    py-4
                    shadow-2xl
                    z-50
                    transition-all duration-300
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0
                    ${isExpanded ? 'md:w-64 md:items-stretch' : 'md:w-24 md:items-center'}
                `}
            >
                {/* Desktop Toggle Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`hidden md:flex absolute -right-3 top-8 ${theme.sidebarLogoBg} ${theme.sidebarLogoText} rounded-full p-1 shadow-md z-50 hover:opacity-80 transition-colors border-2 border-white dark:border-gray-900`}
                >
                    {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                {/* Mobile header (close + logo) */}
                <div className="md:hidden w-full px-4 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {getLogoSrc() ? (
                            <img
                                src={getLogoSrc()}
                                alt={organization?.businessName || "Logo"}
                                className="w-10 h-10 rounded-2xl object-cover shadow-md"
                            />
                        ) : (
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-2xl ${theme.sidebarLogoBg} ${theme.sidebarLogoText}`}>
                                {shopInitial}
                            </div>
                        )}
                        <span className={`font-black tracking-tight text-lg ${theme.sidebarText} truncate max-w-[140px]`}>
                            {organization?.businessName || "Shop"}
                        </span>
                    </div>
                    <button
                        type="button"
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${theme.sidebarItemHoverBg}`}
                        onClick={closeMobile}
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Desktop logo */}
                <div
                    onClick={() => { setView("dashboard"); goDashboard(); }}
                    className={`hidden md:flex items-center cursor-pointer hover:opacity-80 transition-all active:scale-95 ${isExpanded ? 'justify-start px-8 gap-4' : 'justify-center'} w-full mb-8`}
                >
                    {getLogoSrc() ? (
                        <img
                            src={getLogoSrc()}
                            alt={organization?.businessName || "Logo"}
                            className="shrink-0 w-12 h-12 rounded-2xl object-cover shadow-lg shadow-indigo-600/10"
                        />
                    ) : (
                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl ${theme.sidebarLogoBg} ${theme.sidebarLogoText} shadow-lg shadow-indigo-600/10`}>
                            {shopInitial}
                        </div>
                    )}
                    <span className={`font-black tracking-tight text-xl overflow-hidden transition-all duration-300 whitespace-nowrap ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                        {organization?.businessName || "Shop"}
                    </span>
                </div>

                {/* Scrollable Container for Buttons, Subscription, and Logout */}
                <div className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center pb-4">
                    <div className="w-full flex flex-col items-center flex-1">
                        {moduleList.map(moduleKey => renderNavButton(MODULE_CONFIG[moduleKey], moduleKey))}
                    </div>

                    {/* Subscription Status Block */}
                    {!user?.isSuperAdmin && (user?.shopId || user?.shop_id) && (
                        <div className={`mt-4 w-full px-4 mb-4 transition-all duration-300 ${isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>

                            <div className={`p-4 rounded-3xl border ${
                                paymentPending
                                    ? 'border-amber-500/30 bg-amber-500/5'
                                    : hasActiveSubscription
                                        ? 'border-emerald-500/30 bg-emerald-500/5'
                                        : 'border-red-500/30 bg-red-500/5'
                            }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <CreditCard size={14} className={
                                        paymentPending
                                            ? 'text-amber-500'
                                            : hasActiveSubscription
                                                ? 'text-emerald-500'
                                                : 'text-red-500'
                                    } />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                        paymentPending
                                            ? 'text-amber-600'
                                            : hasActiveSubscription
                                                ? 'text-emerald-600'
                                                : 'text-red-600'
                                    }`}>
                                        {paymentPending
                                            ? 'PAYMENT PENDING'
                                            : hasActiveSubscription
                                                ? `${planBadgeLabel} PLAN`
                                                : 'NO ACTIVE PLAN'}
                                    </span>
                                </div>

                                {/* Subscription Actions */}
                                {!hasActiveSubscription && !paymentPending ? (
                                    user?.isOwner ? (
                                        <button
                                            onClick={() => navigate('/organization')}
                                            className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black transition-all shadow-lg shadow-red-500/20"
                                        >
                                            SUBSCRIBE NOW
                                        </button>
                                    ) : (
                                        <div className="text-[9px] font-bold text-red-500/70 leading-tight">
                                            Please contact owner to renew the plan.
                                        </div>
                                    )
                                ) : paymentPending ? (
                                    <div className="text-[9px] font-bold text-amber-600/80 leading-tight">
                                        Waiting for super admin to confirm payment.
                                    </div>
                                ) : (
                                    <div className="text-[9px] font-bold text-emerald-600/70">
                                        Ends: {subscriptionEndRaw ? new Date(subscriptionEndRaw).toLocaleDateString() : '—'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer (Logout) */}
                    <div className={`mt-auto w-full flex flex-col pt-4 shrink-0 ${isExpanded ? 'px-4' : 'px-4 md:px-0 md:items-center'}`}>
                        <button
                            onClick={() => {
                                handleLogout();
                                closeMobile();
                            }}
                            className={`w-full p-3 md:p-4 rounded-xl md:rounded-2xl transition-all flex items-center ${isExpanded ? 'gap-4 justify-start' : 'justify-start md:justify-center gap-4 md:gap-0'
                                } ${theme.sidebarLogoutText} ${theme.sidebarLogoutHoverBg} hover:scale-105 md:hover:scale-110`}
                            title={!isExpanded ? "Logout" : undefined}
                        >
                            <LogOut className="w-6 h-6 md:w-7 md:h-7 shrink-0" />
                            <span className={`font-bold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-[150px] opacity-100 md:max-w-0 md:opacity-0'}`}>
                                Logout
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
