import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useTheme } from "../context/ThemeContext";

const Layout = ({
    children,
    view,
    setView,
    currentUser,
    handleLogout,
    isTakeaway,
    setIsTakeaway,
    takeawayOrder,
    setTakeawayOrder,
    setOrderSearch,
    pendingOnlineOrdersCount,
    sessionInfo,
    isOnlineOrderingEnabled,
    setIsOnlineOrderingEnabled,
    shopName,
    businessType,
    businessSubtype,
    enabledModules,
    onBusinessTypeChange,
}) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const { theme } = useTheme();

    return (
        <div className={`h-screen w-screen flex flex-col overflow-hidden ${theme.pageBg} font-sans`}>

            {/* ✅ Full width navbar */}
            <div className=" w-full">
                <Navbar
                    currentUser={currentUser}
                    sessionInfo={sessionInfo}
                    isOnlineOrderingEnabled={isOnlineOrderingEnabled}
                    setIsOnlineOrderingEnabled={setIsOnlineOrderingEnabled}
                    shopName={shopName}
                    onMobileSidebarOpen={() => setIsMobileSidebarOpen(true)}
                    businessType={businessType}
                    businessSubtype={businessSubtype}
                    enabledModules={enabledModules}
                    onBusinessTypeChange={onBusinessTypeChange}
                />
            </div>

            {/* Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar */}
                <Sidebar
                    key={JSON.stringify(enabledModules)} // Force re-render when enabledModules changes
                    view={view}
                    setView={setView}
                    handleLogout={handleLogout}
                    isTakeaway={isTakeaway}
                    takeawayOrder={takeawayOrder}
                    setIsTakeaway={setIsTakeaway}
                    setTakeawayOrder={setTakeawayOrder}
                    setOrderSearch={setOrderSearch}
                    pendingOnlineOrdersCount={pendingOnlineOrdersCount}
                    mobileOpen={isMobileSidebarOpen}
                    onMobileClose={() => setIsMobileSidebarOpen(false)}
                    enabledModules={enabledModules}
                    businessType={businessType}
                    businessSubtype={businessSubtype}
                    isExpanded={isSidebarExpanded}
                    setIsExpanded={setIsSidebarExpanded}
                />

                {/* Main Content */}
                <div className={`flex-1 min-h-0 ml-0 transition-all duration-300 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-24'} overflow-hidden flex flex-col custom-scrollbar relative bg-gray-50/30 dark:bg-transparent`}>



                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
