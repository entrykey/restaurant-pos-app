import React, { useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import PosTabBar from "./PosTabBar";
import { useTheme } from "../context/ThemeContext";
import { useLocation } from "react-router-dom";

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
    onSwitchShop,
}) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const { theme } = useTheme();
    const location = useLocation();

    const hideChrome = useMemo(() => {
        // Owner selection page should be full-width with no Navbar/Sidebar.
        return location.pathname === "/owner-dashboard" && Boolean(currentUser?.isOwner);
    }, [location.pathname, currentUser?.isOwner]);

    if (hideChrome) {
        return (
            <div className={`h-screen w-screen overflow-hidden ${theme.pageBg} font-sans`}>
                <div className="h-full w-full overflow-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen w-screen flex flex-col overflow-hidden ${theme.pageBg} font-sans`}>

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
                <div className={`flex-1 min-h-0 ml-0 transition-all duration-300 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-24'} overflow-hidden relative flex flex-col bg-gray-50/30 dark:bg-transparent`}>
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
                        onSwitchShop={onSwitchShop}
                    />
                    <div className="absolute top-16 left-0 right-0 z-30 pointer-events-none">
                        <PosTabBar view={view} />
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
