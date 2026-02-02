import React from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Sidebar = ({
    view,
    setView,
    hasPermission,
    handleLogout,
    isTakeaway,
    setIsTakeaway,
    setTakeawayOrder,
    setOrderSearch,
    pendingOnlineOrdersCount,
    mobileOpen = false,
    onMobileClose = () => { },
}) => {
    const navigate = useNavigate();
    const closeMobile = () => onMobileClose?.();

    const setViewAndClose = (nextView) => {
        setView(nextView);
        closeMobile();
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
                {/* Sidebar Buttons */}
                {hasPermission("POS_ACCESS") && (
                    <button
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
                    >
                        <Utensils className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                {hasPermission("POS_ACCESS") && (
                    <button
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
                    >
                        <ShoppingBag className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                {hasPermission("MANAGE_ONLINE_ORDERS") && (
                    <div className="relative">
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
                        >
                            <Globe className="w-6 h-6 md:w-7 md:h-7" />
                        </button>
                        {pendingOnlineOrdersCount > 0 && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center border-2 border-indigo-900">
                                {pendingOnlineOrdersCount}
                            </span>
                        )}
                    </div>
                )}

                {hasPermission("VIEW_KDS") && (
                    <button
                        onClick={() => {
                            setView("kds");
                            navigate("/kds");
                            closeMobile();
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "kds"
                            ? "bg-indigo-600 shadow-xl scale-110"
                            : "hover:bg-indigo-800"
                            }`}
                    >
                        <MonitorPlay className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                {hasPermission("MANAGE_RESERVATIONS") && (
                    <button
                        onClick={() => {
                            setView("reservations");
                            navigate("/reservations");
                            closeMobile();
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "reservations"
                            ? "bg-indigo-600 shadow-xl scale-110"
                            : "hover:bg-indigo-800"
                            }`}
                    >
                        <CalendarCheck className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                <button
                    onClick={() => {
                        setView("inventory");
                        navigate("/inventory");
                        closeMobile();
                    }}
                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "inventory"
                        ? "bg-indigo-600 shadow-xl scale-110"
                        : "hover:bg-indigo-800"
                        }`}
                >
                    <Package className="w-6 h-6 md:w-7 md:h-7" />
                </button>

                {hasPermission("VIEW_REPORTS") && (
                    <button
                        onClick={() => {
                            setView("reports");
                            navigate("/reports");
                            closeMobile();
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "reports"
                            ? "bg-indigo-600 shadow-xl scale-110"
                            : "hover:bg-indigo-800"
                            }`}
                    >
                        <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                {hasPermission("VIEW_REPORTS") && (
                    <button
                        onClick={() => {
                            setView("reports");
                            navigate("/reports");
                            closeMobile();
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "reports"
                            ? "bg-indigo-600 shadow-xl scale-110"
                            : "hover:bg-indigo-800"
                            }`}
                        title="Advanced Reports"
                    >
                        <FileText className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                {hasPermission("ACCESS_SETTINGS") && (
                    <button
                        onClick={() => {
                            setView("settings");
                            navigate("/settings");
                            closeMobile();
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "settings"
                            ? "bg-indigo-600 shadow-xl scale-110"
                            : "hover:bg-indigo-800"
                            }`}
                    >
                        <Settings className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                {hasPermission("MANAGE_STAFF") && (
                    <button
                        onClick={() => {
                            setView("staff");
                            navigate("/staff");
                            closeMobile();
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${view === "staff"
                            ? "bg-indigo-600 shadow-xl scale-110"
                            : "hover:bg-indigo-800"
                            }`}
                    >
                        <UserCog className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                )}

                <button
                    onClick={() => {
                        handleLogout();
                        closeMobile();
                    }}
                    className="mt-0 md:mt-auto p-3 md:p-4 text-red-300 hover:bg-red-900/30 rounded-xl md:rounded-2xl"
                >
                    <LogOut className="w-6 h-6 md:w-7 md:h-7" />
                </button>
            </div>
        </>
    );
};

export default Sidebar;
