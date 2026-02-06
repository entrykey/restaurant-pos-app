import React, { useMemo } from "react";
import {
    Utensils,
    Globe,
    MonitorPlay,
    CalendarCheck,
    Package,
    TrendingUp,
    FileText,
    Settings,
    UserCog,
    LogOut,
    X,
    ShoppingBag,
    Building2,
    LayoutDashboard,
    Truck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTE_ACCESS } from "../config/permissionStructure";
import { getModuleList } from "../config/businessTypes";

const canAccess = (hasPermissionFor, routeKey) => {
    if (!hasPermissionFor) return false;
    const r = ROUTE_ACCESS[routeKey];
    return r ? hasPermissionFor(r.module, r.resource, r.action) : false;
};

const Sidebar = ({
    view,
    setView,
    hasPermission,
    hasPermissionFor,
    handleLogout,
    isTakeaway,
    setIsTakeaway,
    setTakeawayOrder,
    setOrderSearch,
    pendingOnlineOrdersCount,
    mobileOpen = false,
    onMobileClose = () => { },
    enabledModules = {},
    businessType,
    businessSubtype,
}) => {
    const navigate = useNavigate();
    const closeMobile = () => onMobileClose?.();

    // Get the explicit list of modules for this type
    const moduleList = useMemo(() => {
        // Fallback to enabledModules keys if type not provided (legacy/safety)
        if (!businessType) {
            return Object.keys(enabledModules).filter(k => enabledModules[k] === true);
        }
        return getModuleList(businessType, businessSubtype);
    }, [businessType, businessSubtype, enabledModules]);

    // Definition of all possible sidebar buttons
    // This map allows us to render buttons dynamically by key
    const MODULE_BUTTONS = {
        DINING: (
            <button
                key="DINING"
                onClick={() => {
                    setView("tables");
                    setIsTakeaway(false);
                    navigate("/dininghall");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "tables" || (view === "order" && !isTakeaway)
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Dining Hall"
            >
                <Utensils className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        TAKEAWAY: (
            <button
                key="TAKEAWAY"
                onClick={() => {
                    setView("order");
                    setIsTakeaway(true);
                    setTakeawayOrder({ items: [], isSentToKOT: false });
                    setOrderSearch("");
                    navigate("/takeaway");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "order" && isTakeaway
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Takeaway"
            >
                <ShoppingBag className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        ONLINE_ORDERS: (
            <div key="ONLINE_ORDERS" className="relative">
                <button
                    onClick={() => {
                        setView("online-orders");
                        navigate("/online-orders");
                        closeMobile();
                    }}
                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "online-orders"
                        ? "bg-indigo-600 shadow-xl scale-110"
                        : "hover:bg-indigo-800"
                        }`}
                    title="Online Orders"
                >
                    <Globe className="w-6 h-6 md:w-7 md:h-7" />
                </button>
                {pendingOnlineOrdersCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center border-2 border-indigo-900">
                        {pendingOnlineOrdersCount}
                    </span>
                )}
            </div>
        ),
        KDS: (
            <button
                key="KDS"
                onClick={() => {
                    setView("kds");
                    navigate("/kds");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "kds"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Kitchen Display (KDS)"
            >
                <MonitorPlay className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        RESERVATIONS: (
            <button
                key="RESERVATIONS"
                onClick={() => {
                    setView("reservations");
                    navigate("/reservations");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "reservations"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Reservations"
            >
                <CalendarCheck className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        INVENTORY: (
            <button
                key="INVENTORY"
                onClick={() => {
                    setView("inventory");
                    navigate("/inventory");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "inventory"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Inventory"
            >
                <Package className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        REPORTS: (
            <button
                key="REPORTS"
                onClick={() => {
                    setView("reports");
                    navigate("/reports");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "reports"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Reports"
            >
                <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        SETTINGS: (
            <button
                key="SETTINGS"
                onClick={() => {
                    setView("settings");
                    navigate("/settings");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "settings"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Settings"
            >
                <Settings className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        STAFF: (
            <button
                key="STAFF"
                onClick={() => {
                    setView("staff");
                    navigate("/staff");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "staff"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Staff"
            >
                <UserCog className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        ORGANIZATION: (
            <button
                key="ORGANIZATION"
                onClick={() => {
                    setView("organization");
                    navigate("/organization");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "organization"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Organization"
            >
                <Building2 className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
        SUPPLIERS: (
            <button
                key="SUPPLIERS"
                onClick={() => {
                    setView("suppliers");
                    navigate("/suppliers");
                    closeMobile();
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "suppliers"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                    }`}
                title="Suppliers"
            >
                <Truck className="w-6 h-6 md:w-7 md:h-7" />
            </button>
        ),
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
                    w-64 md:w-24
                    bg-indigo-900 text-white
                    flex flex-col
                    items-center
                    py-4
                    shadow-2xl
                    z-50
                    transition-transform
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0
                    md:w-24
                `}
            >
                {/* Mobile header (close + logo) */}
                <div className="md:hidden w-full px-4 flex items-center justify-between mb-6">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-indigo-900 font-black text-2xl">
                        D
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-indigo-800 active:bg-indigo-700"
                        onClick={closeMobile}
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Desktop logo */}
                <div className="hidden md:flex w-12 h-12 bg-white rounded-2xl items-center justify-center text-indigo-900 font-black text-2xl mb-8">
                    D
                </div>

                {/* Sidebar Buttons - Dynamically Rendered */}
                {moduleList.map(moduleKey => {
                    // Check permissions (User Role Access)
                    if (!canAccess(hasPermissionFor, moduleKey)) return null;

                    // Render component from map
                    return MODULE_BUTTONS[moduleKey] || null;
                })}

                <button
                    onClick={() => {
                        handleLogout();
                        closeMobile();
                    }}
                    className="mt-0 md:mt-auto p-3 md:p-4 text-red-300 hover:bg-red-900/30 rounded-xl md:rounded-2xl"
                    title="Logout"
                >
                    <LogOut className="w-6 h-6 md:w-7 md:h-7" />
                </button>
            </div>
        </>
    );
};

export default Sidebar;
