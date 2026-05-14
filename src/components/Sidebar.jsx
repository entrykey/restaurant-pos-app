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
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
    const location = useLocation();
    const { can, canModule } = usePermission();
    const { theme } = useTheme();
    const { user } = useAuth();
    const [isSelfServiceExpanded, setIsSelfServiceExpanded] = useState(true);
    const [isSalesExpanded, setIsSalesExpanded] = useState(true);
    const closeMobile = () => onMobileClose?.();

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

        // Always ensure employee modules (DASHBOARD, MYATTENDANCE, MYLEAVES, MYSALARY) are included if user has permission
        ['DASHBOARD', 'MYATTENDANCE', 'MYLEAVES', 'MYSALARY'].forEach(mod => {
            if (allowedByPermission.includes(mod) && !result.includes(mod)) {
                // Keep Dashboard first, others follow
                if (mod === 'DASHBOARD') {
                    result = ['DASHBOARD', ...result];
                } else {
                    // Find correct insertion point: after Dashboard/existing employee modules
                    result.splice(result.includes('DASHBOARD') ? 1 : 0, 0, mod);
                }
            }
        });

        // Ensure proper order for employee modules if they came in different order
        const order = ['DASHBOARD', 'MYATTENDANCE', 'MYLEAVES', 'MYSALARY'];
        const others = result.filter(m => !order.includes(m));
        const foundOrder = order.filter(m => result.includes(m));
        result = [...foundOrder, ...others];

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
        const salesKeys = ['SALE_MARKING', 'SALES_HISTORY'];
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

        return result;
    }, [businessType, businessSubtype, enabledModules, can, canModule, user]);

    const MODULE_CONFIG = {
        DASHBOARD: {
            icon: LayoutDashboard, label: "Dashboard",
            onClick: () => { setView("dashboard"); goDashboard(); },
            isActive: view === "dashboard" || view === "owner-dashboard"
        },
        DINING: {
            icon: Utensils, label: "Dining Hall",
            onClick: () => { setView("tables"); setIsTakeaway(false); navigate("/dininghall"); closeMobile(); },
            isActive: view === "DINING" || view === "tables" || (view === "order" && !isTakeaway)
        },
        TAKEAWAY: {
            icon: ShoppingBag, label: "Takeaway",
            onClick: () => { setView("order"); setIsTakeaway(true); setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'TAKEAWAY' }); setOrderSearch(""); navigate("/takeaway"); closeMobile(); },
            isActive: (view === "TAKEAWAY" || view === "order") && isTakeaway && takeawayOrder?.orderType === 'TAKEAWAY'
        },
        DIRECT_SALE: {
            icon: ShoppingCart, label: "Direct Sale",
            onClick: () => { setView("order"); setIsTakeaway(true); setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'DIRECT_SALE' }); setOrderSearch(""); navigate("/takeaway"); closeMobile(); },
            isActive: (view === "DIRECT_SALE" || view === "TAKEAWAY" || view === "order") && isTakeaway && takeawayOrder?.orderType === 'DIRECT_SALE'
        },
        WHOLESALE: {
            icon: Store, label: "Wholesale",
            onClick: () => { setView("order"); setIsTakeaway(true); setTakeawayOrder({ items: [], isSentToKOT: false, orderType: 'WHOLESALE' }); setOrderSearch(""); navigate("/wholesale"); closeMobile(); },
            isActive: (view === "WHOLESALE" || view === "order") && isTakeaway && takeawayOrder?.orderType === 'WHOLESALE'
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
        SALE_MARKING: {
            icon: CalendarCheck, label: "Sale Marking",
            onClick: () => { setView("sale-marking"); navigate("/sale-marking"); closeMobile(); },
            isActive: view === "sale-marking"
        },
        SALES_HISTORY: {
            icon: ShoppingBag, label: "Sales History",
            onClick: () => { setView("sales-history"); navigate("/sales-history"); closeMobile(); },
            isActive: view === "sales-history"
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
        MYATTENDANCE: {
            icon: CalendarCheck, label: "My Attendance",
            onClick: () => { setView("my-attendance"); navigate("/my-attendance"); closeMobile(); },
            isActive: view === "my-attendance"
        },
        MYLEAVES: {
            icon: ClipboardList, label: "My Leaves",
            onClick: () => { setView("my-leaves"); navigate("/my-leaves"); closeMobile(); },
            isActive: view === "my-leaves"
        },
        MYSALARY: {
            icon: Wallet, label: "My Salary",
            onClick: () => { setView("my-salary"); navigate("/my-salary"); closeMobile(); },
            isActive: view === "my-salary"
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
            icon: Zap, label: "Plan Management",
            onClick: () => { setView("plan-management"); navigate("/plan-management"); closeMobile(); },
            isActive: view === "plan-management"
        },
        CLIENT_MANAGEMENT: {
            icon: UserPlus, label: "Client Management",
            onClick: () => { setView("client-management"); navigate("/client-management"); closeMobile(); },
            isActive: view === "client-management"
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
        SELF_SERVICE: {
            icon: Briefcase, label: "Self Service",
            isGroup: true,
            children: ['MYATTENDANCE', 'MYLEAVES', 'MYSALARY'].filter(k => canAccessRoute(can, canModule, k))
        },
        SALES: {
            icon: ShoppingBag, label: "Sales",
            isGroup: true,
            children: ['SALE_MARKING', 'SALES_HISTORY'].filter(k => canAccessRoute(can, canModule, k))
        }
    };

    const renderNavButton = (config, key) => {
        if (!config) return null;
        if (config.isGroup) {
            const isAnyChildActive = config.children.some(childKey => MODULE_CONFIG[childKey]?.isActive);
            const isSelfService = key === 'SELF_SERVICE';
            const isSales = key === 'SALES';
            const isOpen = isSelfService ? isSelfServiceExpanded : (isSales ? isSalesExpanded : false);
            const toggle = () => isSelfService ? setIsSelfServiceExpanded(!isSelfServiceExpanded) : (isSales ? setIsSalesExpanded(!isSalesExpanded) : null);

            return (
                <div key={key} className="w-full flex flex-col mb-2">
                    <div className={`relative flex w-full ${isExpanded ? 'px-4' : 'px-4 md:px-0 md:justify-center'}`}>
                        <button
                            onClick={toggle}
                            className={`p-3 md:p-4 transition-all flex items-center w-full ${isExpanded
                                ? 'gap-4 justify-start rounded-xl md:rounded-2xl'
                                : 'justify-start md:justify-center gap-4 md:gap-0 rounded-2xl md:rounded-[24px]'
                                } ${isAnyChildActive ? theme.sidebarItemActiveBg : theme.sidebarItemHoverBg}`}
                        >
                            <config.icon className="w-6 h-6 md:w-7 md:h-7 shrink-0" />
                            <div className={`flex-1 flex items-center justify-between overflow-hidden transition-all duration-300 ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-[150px] opacity-100 md:max-w-0 md:opacity-0 md:hidden'}`}>
                                <span className="font-bold text-sm whitespace-nowrap">{config.label}</span>
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        </button>
                    </div>
                    {isOpen && (isExpanded || mobileOpen) && (
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
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-2xl ${theme.sidebarLogoBg} ${theme.sidebarLogoText}`}>
                        F
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
                    <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl ${theme.sidebarLogoBg} ${theme.sidebarLogoText} shadow-lg shadow-indigo-600/10`}>
                        F
                    </div>
                    <span className={`font-black tracking-tight text-xl overflow-hidden transition-all duration-300 whitespace-nowrap ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                        FilePe
                    </span>
                </div>

                {/* Sidebar Buttons container */}
                <div className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center">
                    {moduleList.map(moduleKey => renderNavButton(MODULE_CONFIG[moduleKey], moduleKey))}
                </div>

                {/* Subscription Status Block */}
                {!user?.isSuperAdmin && (user?.shopId || user?.shop_id) && (
                    <div className={`mt-4 w-full px-4 mb-4 transition-all duration-300 ${isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>

                        <div className={`p-4 rounded-3xl border ${user?.subscription?.active ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard size={14} className={user?.subscription?.active ? 'text-emerald-500' : 'text-red-500'} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${user?.subscription?.active ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {user?.subscription?.active ? `${user?.subscription?.plan} PLAN` : 'NO ACTIVE PLAN'}
                                </span>
                            </div>

                            {/* Subscription Actions */}
                            {!user?.subscription?.active ? (
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
                            ) : (
                                <div className="text-[9px] font-bold text-emerald-600/70">
                                    Ends: {new Date(user?.subscription?.endDate).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                )}


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
