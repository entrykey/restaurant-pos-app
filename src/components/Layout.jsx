import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({
    children,
    view,
    setView,
    currentUser,
    hasPermission,
    handleLogout,
    isTakeaway,
    setIsTakeaway,
    setTakeawayOrder,
    setOrderSearch,
    pendingOnlineOrdersCount,
    sessionInfo,
    isOnlineOrderingEnabled,
    setIsOnlineOrderingEnabled,
    shopName,
}) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-50 font-sans">
            {/* ✅ Full width navbar */}
            <div className=" w-full">
                <Navbar
                    currentUser={currentUser}
                    sessionInfo={sessionInfo}
                    isOnlineOrderingEnabled={isOnlineOrderingEnabled}
                    setIsOnlineOrderingEnabled={setIsOnlineOrderingEnabled}
                    shopName={shopName}
                    onMobileSidebarOpen={() => setIsMobileSidebarOpen(true)}
                />
            </div>

            {/* Sidebar + Content */}
            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Sidebar */}
                <Sidebar
                    view={view}
                    setView={setView}
                    hasPermission={hasPermission}
                    handleLogout={handleLogout}
                    isTakeaway={isTakeaway}
                    setIsTakeaway={setIsTakeaway}
                    setTakeawayOrder={setTakeawayOrder}
                    setOrderSearch={setOrderSearch}
                    pendingOnlineOrdersCount={pendingOnlineOrdersCount}
                    mobileOpen={isMobileSidebarOpen}
                    onMobileClose={() => setIsMobileSidebarOpen(false)}
                />

                {/* Main Content */}
                <div className="flex-1 ml-0 md:ml-20 h-[calc(100vh-64px)] overflow-auto relative">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
