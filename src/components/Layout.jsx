import React, { useMemo, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
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

    // Responsive sidebar: auto-expand on desktop (>= 1024px) so labels are shown,
    // collapse on smaller/tablet screens (< 1024px) to preserve screen space
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
        if (typeof window === "undefined") return false;
        try {
            const saved = localStorage.getItem("pos_sidebar_expanded");
            if (saved !== null && window.innerWidth >= 1024) {
                return saved === "true";
            }
        } catch (e) { }
        return window.innerWidth >= 1024;
    });

    const handleSetIsExpanded = (val) => {
        setIsSidebarExpanded((prev) => {
            const next = typeof val === "function" ? val(prev) : val;
            try {
                localStorage.setItem("pos_sidebar_expanded", String(next));
            } catch (e) { }
            return next;
        });
    };

    // Listen for screen resize to adjust sidebar automatically as per screen size
    useEffect(() => {
        const handleResize = () => {
            if (typeof window === "undefined") return;
            const isDesktop = window.innerWidth >= 1024;
            if (!isDesktop) {
                setIsSidebarExpanded(false);
            } else {
                try {
                    const saved = localStorage.getItem("pos_sidebar_expanded");
                    if (saved !== null) {
                        setIsSidebarExpanded(saved === "true");
                        return;
                    }
                } catch (e) { }
                setIsSidebarExpanded(true);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    const { theme } = useTheme();
    const location = useLocation();

    // Auto-collapse sidebar when navigating to billing / purchase / sales pages to maximize table width
    React.useEffect(() => {
        const collapsePaths = ["/purchases", "/sales", "/pos", "/takeaway", "/dininghall"];
        const currentPath = (location.pathname || "").toLowerCase();
        if (collapsePaths.some((p) => currentPath.startsWith(p)) || view === "purchases" || view === "sales") {
            setIsSidebarExpanded(false);
        }
    }, [location.pathname, view]);

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
        <div className={`h-full w-full flex flex-col overflow-hidden ${theme.pageBg} font-sans`}>

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
                    setIsExpanded={handleSetIsExpanded}
                />

                {/* Main Content */}
                <div className={`flex-1 min-h-0 min-w-0 pl-0 transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-24'} overflow-hidden relative flex flex-col bg-gray-50/30 dark:bg-transparent`}>
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
                    <div className="flex-1 min-h-0 overflow-auto custom-scrollbar flex flex-col">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
