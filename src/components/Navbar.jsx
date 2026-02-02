import React from "react";
import { UserCheck, Clock, Wifi, WifiOff, Menu } from "lucide-react";

const Navbar = ({
    currentUser,
    sessionInfo,
    isOnlineOrderingEnabled,
    setIsOnlineOrderingEnabled,
    shopName,
    onMobileSidebarOpen,
}) => {
    return (
        <div className="h-16 bg-white border-b px-4 md:px-8 flex items-center justify-between shrink-0 w-full">
            <div className="flex items-center gap-4 md:gap-6">
                {/* Mobile sidebar toggle */}
                <button
                    type="button"
                    className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 active:bg-gray-200 text-indigo-900"
                    onClick={onMobileSidebarOpen}
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
                <div className="flex items-center gap-2 md:ml-20">
                    <UserCheck size={18} className="text-indigo-600" />
                    <span className="text-xs md:text-sm font-bold text-gray-700">
                        {currentUser?.role}: {currentUser?.phone}
                    </span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-gray-400">
                    <Clock size={16} />
                    <span className="text-xs font-medium uppercase tracking-wider">
                        Login: {sessionInfo.loginTime}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {(currentUser.role === "Admin" || currentUser.role === "Manager") && (
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all ${isOnlineOrderingEnabled
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                            }`}
                        onClick={() => setIsOnlineOrderingEnabled(!isOnlineOrderingEnabled)}
                        title="Toggle Online Orders"
                    >
                        {isOnlineOrderingEnabled ? (
                            <Wifi size={16} />
                        ) : (
                            <WifiOff size={16} />
                        )}
                        <span className="text-xs font-bold hidden sm:inline">
                            {isOnlineOrderingEnabled ? "Online ON" : "Online OFF"}
                        </span>
                    </div>
                )}
                <div className="text-indigo-900 font-black tracking-tighter text-lg md:text-xl">
                    {shopName}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
