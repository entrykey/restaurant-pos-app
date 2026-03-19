import React, { useMemo, useState } from "react";
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
    Store,
    Tag,
    CreditCard,
    Grid3X3,
    LayoutDashboard,
    Users,
    Boxes
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTE_ACCESS, ROUTE_KEYS_ORDER } from "../constants/routeAccess";
import { getModuleList } from "../config/businessTypes";
import { usePermission } from "../auth/usePermission";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

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
    const { can, canModule } = usePermission();
    const { theme } = useTheme();
    const { user } = useAuth();
    const closeMobile = () => onMobileClose?.();


    // Modules to show: from business type intersected with user permissions; if no business list, use allowed-by-permission only
    const moduleList = useMemo(() => {
        const allowedByPermission = ROUTE_KEYS_ORDER.filter((key) => canAccessRoute(can, canModule, key));
        let base = [];
        if (!businessType) {
            base = Object.keys(enabledModules).filter((k) => enabledModules[k] === true);
        } else {
            base = getModuleList(businessType, businessSubtype);
        }
        // If business type gives no list (e.g. not loaded), or user is superadmin, show whatever user has permission for
        let result = (user?.isSuperAdmin || base.length === 0) ? allowedByPermission : base.filter((moduleKey) => allowedByPermission.includes(moduleKey));

        // Consolidate TAKEAWAY and DIRECT_SALE: if both allowed, only show TAKEAWAY
        if (result.includes('TAKEAWAY') && result.includes('DIRECT_SALE')) {
            result = result.filter(k => k !== 'DIRECT_SALE');
        }

        // Prefer Parties over Suppliers when user has PARTIES permission
        if (result.includes('SUPPLIERS') && allowedByPermission.includes('PARTIES')) {
            result = result.filter(k => k !== 'SUPPLIERS');
            if (!result.includes('PARTIES')) result.push('PARTIES');
        }

        // Always ensure DASHBOARD is first if user has permission
        if (allowedByPermission.includes('DASHBOARD') && !result.includes('DASHBOARD')) {
            result = ['DASHBOARD', ...result];
        }

        return result;
    }, [businessType, businessSubtype, enabledModules, can, canModule]);

    const MODULE_CONFIG = {
        DASHBOARD: {
            icon: LayoutDashboard, label: "Dashboard",
            onClick: () => { setView("dashboard"); navigate("/dashboard"); closeMobile(); },
            isActive: view === "dashboard" || view === "owner-dashboard"
        },
        DINING: {
            icon: Utensils, label: "Dining Hall",
            onClick: () => { setView("tables"); setIsTakeaway(false); navigate("/dininghall"); closeMobile(); },
            isActive: view === "tables" || (view === "order" && !isTakeaway)
        },
        TAKEAWAY: {
            icon: ShoppingBag, label: "Takeaway",
            onClick: () => { setView("order"); setIsTakeaway(true); setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'TAKEAWAY' }); setOrderSearch(""); navigate("/takeaway"); closeMobile(); },
            isActive: view === "order" && isTakeaway && takeawayOrder?.orderType === 'TAKEAWAY'
        },
        DIRECT_SALE: {
            icon: ShoppingCart, label: "Direct Sale",
            onClick: () => { setView("order"); setIsTakeaway(true); setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'DIRECT_SALE' }); setOrderSearch(""); navigate("/takeaway"); closeMobile(); },
            isActive: view === "order" && isTakeaway && takeawayOrder?.orderType === 'DIRECT_SALE'
        },
        WHOLESALE: {
            icon: Store, label: "Wholesale",
            onClick: () => { setView("order"); setIsTakeaway(true); setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'WHOLESALE' }); setOrderSearch(""); navigate("/wholesale"); closeMobile(); },
            isActive: view === "order" && isTakeaway && takeawayOrder?.orderType === 'WHOLESALE'
        },
        ONLINE_ORDERS: {
            icon: Globe, label: "Online Orders",
            onClick: () => { setView("online-orders"); navigate("/online-orders"); closeMobile(); },
            isActive: view === "online-orders",
            badge: pendingOnlineOrdersCount
        },
        KDS: {
            icon: MonitorPlay, label: "Kitchen Display (KDS)",
            onClick: () => { setView("kds"); navigate("/kds"); closeMobile(); },
            isActive: view === "kds"
        },
        RESERVATIONS: {
            icon: CalendarCheck, label: "Reservations",
            onClick: () => { setView("reservations"); navigate("/reservations"); closeMobile(); },
            isActive: view === "reservations"
        },
        INVENTORY: {
            icon: Boxes, label: "Stock Items",
            onClick: () => { setView("inventory"); navigate("/inventory"); closeMobile(); },
            isActive: view === "inventory"
        },
        REPORTS: {
            icon: TrendingUp, label: "Reports",
            onClick: () => { setView("reports"); navigate("/reports"); closeMobile(); },
            isActive: view === "reports"
        },
        OFFERS: {
            icon: Tag, label: "Offers",
            onClick: () => { setView("offers"); navigate("/offers"); closeMobile(); },
            isActive: view === "offers"
        },
        SETTINGS: {
            icon: Settings, label: "Settings",
            onClick: () => { setView("settings"); navigate("/settings"); closeMobile(); },
            isActive: view === "settings"
        },
        STAFF: {
            icon: UserCog, label: "Staff",
            onClick: () => { setView("staff"); navigate("/staff"); closeMobile(); },
            isActive: view === "staff"
        },
        STAFF_DASHBOARD: {
            icon: Users, label: "Staff Dashboard",
            onClick: () => { setView("staff-dashboard"); navigate("/staff-dashboard"); closeMobile(); },
            isActive: view === "staff-dashboard"
        },
        ORGANIZATION: {
            icon: Building2, label: "Organization",
            onClick: () => { setView("organization"); navigate("/organization"); closeMobile(); },
            isActive: view === "organization"
        },
        SUPPLIERS: {
            icon: Truck, label: "Suppliers",
            onClick: () => { setView("suppliers"); navigate("/suppliers"); closeMobile(); },
            isActive: view === "suppliers"
        },
        PARTIES: {
            icon: Users, label: "Parties",
            onClick: () => { setView("parties"); navigate("/parties"); closeMobile(); },
            isActive: view === "parties"
        },
        SERVICE: {
            icon: Wrench, label: "Service & Repairs",
            onClick: () => { setView("service"); navigate("/service"); closeMobile(); },
            isActive: view === "service"
        },
        PURCHASES: {
            icon: ShoppingCart, label: "Purchases",
            onClick: () => { setView("purchases"); navigate("/purchases"); closeMobile(); },
            isActive: view === "purchases"
        },
        BUSINESS_TYPES: {
            icon: Briefcase, label: "Business Types",
            onClick: () => { setView("business-types"); navigate("/business-types"); closeMobile(); },
            isActive: view === "business-types"
        },
        SHOP_MANAGEMENT: {
            icon: Store, label: "Shop Management",
            onClick: () => { setView("shop-management"); navigate("/shop-management"); closeMobile(); },
            isActive: view === "shop-management"
        },
        PLAN_MANAGEMENT: {
            icon: Briefcase, label: "Plan Management",
            onClick: () => { setView("plan-management"); navigate("/plan-management"); closeMobile(); },
            isActive: view === "plan-management"
        },
        SUBSCRIPTION_MANAGEMENT: {
            icon: CreditCard, label: "Subscriptions",
            onClick: () => { setView("subscription-management"); navigate("/subscription-management"); closeMobile(); },
            isActive: view === "subscription-management"
        },
        TABLE_MANAGEMENT: {
            icon: Grid3X3, label: "Table Management",
            onClick: () => { setView("table-management"); navigate("/table-management"); closeMobile(); },
            isActive: view === "table-management"
        },
    };

    const renderNavButton = (config, key) => {
        if (!config) return null;
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
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-2xl ${theme.sidebarLogoBg} ${theme.sidebarLogoText}`}>
                        D
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
                <div className={`hidden md:flex items-center ${isExpanded ? 'justify-start px-8 gap-4' : 'justify-center'} w-full mb-8`}>
                    <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl ${theme.sidebarLogoBg} ${theme.sidebarLogoText}`}>
                        D
                    </div>
                    <span className={`font-black tracking-tight text-xl overflow-hidden transition-all duration-300 whitespace-nowrap ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                        Dine POS
                    </span>
                </div>

                {/* Sidebar Buttons container */}
                <div className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center">
                    {moduleList.map(moduleKey => renderNavButton(MODULE_CONFIG[moduleKey], moduleKey))}
                </div>

                {/* Footer (Logout) */}
                <div className={`mt-auto w-full flex flex-col pt-4 ${isExpanded ? 'px-4' : 'px-4 md:px-0 md:items-center'}`}>
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
        </>
    );
};

export default Sidebar;
