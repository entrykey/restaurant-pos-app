import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserCheck, Clock, Wifi, WifiOff, Menu, Building2, MapPin, Bell, Info, AlertTriangle, ChevronRight } from "lucide-react";
import BusinessTypeModal from "./BusinessTypeModal";
import { branchService } from "../services/api";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { notificationService } from "../services/notificationService";

const Navbar = ({
    currentUser,
    sessionInfo,
    isOnlineOrderingEnabled,
    setIsOnlineOrderingEnabled,
    shopName,
    onMobileSidebarOpen,
    businessType,
    businessSubtype,
    enabledModules,
    onBusinessTypeChange,
    onSwitchShop
}) => {
    const { activeBranchId, setActiveBranchId, branches, currentShopId, ownerShops } = useApp();
    const { theme } = useTheme();
    const [isBusinessTypeModalOpen, setIsBusinessTypeModalOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSwitchingShop, setIsSwitchingShop] = useState(false);

    // Initial fetch of notifications
    useEffect(() => {
        if (currentShopId) {
            refreshNotifications();
            // Polling for new notifications every 5 minutes (or use websockets later)
            const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [currentShopId, activeBranchId]);

    const refreshNotifications = async () => {
        const data = await notificationService.fetchNotifications(currentShopId, activeBranchId);
        setNotifications(data || []);
    };

    const handleMarkAllRead = async () => {
        const success = await notificationService.markAllRead(currentShopId, activeBranchId);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    };

    // Handle Browser Notifications Permission
    const requestNotificationPermission = async () => {
        const granted = await notificationService.requestPermission();
        if (granted) {
            notificationService.notify("Notifications Enabled!", {
                body: "FilePe will now show you live order alerts and reminders."
            });
        }
    };

    const handleShopSwitch = async (shopId) => {
        if (String(shopId) === String(currentShopId)) return;
        setIsSwitchingShop(true);
        try {
            if (onSwitchShop) {
                await onSwitchShop(shopId);
            }
        } catch (error) {
            console.error("Failed to switch shop in navbar:", error);
        } finally {
            setIsSwitchingShop(false);
        }
    };

    const isOwner = currentUser?.isOwner || currentUser?.isSuperAdmin;

    return (
        <div className={`h-16 ${theme.cardBg} border-b ${theme.borderLight} px-4 md:px-8 flex items-center justify-between shrink-0 w-full`}>
            <div className="flex items-center gap-4 md:gap-6">
                {/* Mobile sidebar toggle */}
                <button
                    type="button"
                    className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl hover:${theme.inputBg.replace('bg-', '')} active:opacity-70 ${theme.textHeading}`}
                    onClick={onMobileSidebarOpen}
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
                <div className="flex items-center gap-2 md:ml-10">
                    <UserCheck size={18} className={theme.primaryIconText} />
                    <span className={`text-[10px] md:text-sm font-black ${theme.textPrimary} tracking-tight`}>
                        {currentUser?.role}: {currentUser?.phone}
                    </span>
                </div>

                {/* Shop Selector - Only for Owners with multiple shops */}
                {isOwner && ownerShops.length > 1 && (
                    <div className="relative group">
                        <div className={`flex items-center gap-2 ${theme.inputBg} px-3 py-2 rounded-xl border ${theme.inputBorder} cursor-pointer hover:opacity-80 transition-all`}>
                            <Building2 size={16} className={theme.primaryIconText} />
                            <span className={`text-[10px] md:text-xs font-black ${theme.textPrimary} uppercase tracking-tight truncate max-w-[100px] md:max-w-[150px]`}>
                                {ownerShops.find(s => String(s._id || s.id) === String(currentShopId))?.name || "Select Shop"}
                            </span>
                            <ChevronRight size={14} className={`${theme.textMuted} group-hover:rotate-90 transition-transform`} />
                            {isSwitchingShop && <div className="ml-1 animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full"></div>}
                        </div>
                        
                        {/* Dropdown Menu */}
                        <div className={`absolute top-full left-0 mt-2 w-64 ${theme.surfaceBg} rounded-2xl shadow-2xl border ${theme.borderLight} py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] translate-y-2 group-hover:translate-y-0`}>
                            <div className={`px-4 py-2 border-b ${theme.borderLight} mb-1`}>
                                <h5 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Switch Shop Context</h5>
                            </div>
                            <div className="max-h-60 overflow-y-auto no-scrollbar">
                                {ownerShops.map(shop => (
                                    <button
                                        key={shop._id || shop.id}
                                        onClick={() => handleShopSwitch(shop._id || shop.id)}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between
                                            ${String(currentShopId) === String(shop._id || shop.id) 
                                                ? `${theme.primaryIconBg} ${theme.primaryIconText}` 
                                                : `${theme.textPrimary} ${theme.tableRowHover}`}`}
                                    >
                                        <div className="flex flex-col">
                                            <span>{shop.name}</span>
                                            <span className={`text-[8px] opacity-70`}>
                                                {typeof shop.businessType === 'object' ? shop.businessType?.displayString : shop.businessType}
                                            </span>
                                        </div>
                                        {String(currentShopId) === String(shop._id || shop.id) && (
                                            <span className={`w-1.5 h-1.5 ${theme.mode === 'light' ? 'bg-indigo-600' : 'bg-current'} rounded-full shadow-[0_0_8px_rgba(79,70,229,0.5)]`}></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Branch Selector - Visible for everyone if they have 1+ branches, 
                    OR specifically for owners to manage branch context */}
                {(branches.length > 1 || isOwner) && !currentUser?.roles?.some(r => r.isSystemRole) && (
                    <div className="relative group">
                        <div className={`flex items-center gap-2 ${theme.inputBg} px-3 py-2 rounded-xl border ${theme.inputBorder} cursor-pointer hover:opacity-80 transition-all`}>
                            <MapPin size={16} className={theme.primaryIconText} />
                            <span className={`text-[10px] md:text-xs font-black ${theme.textPrimary} uppercase tracking-tight truncate max-w-[100px] md:max-w-[150px]`}>
                                {branches.find(b => String(b._id || b.id) === String(activeBranchId))?.name || "Select Branch"}
                            </span>
                            <ChevronRight size={14} className={`${theme.textMuted} group-hover:rotate-90 transition-transform`} />
                        </div>
                        
                        {/* Dropdown Menu */}
                        <div className={`absolute top-full left-0 mt-2 w-56 ${theme.surfaceBg} rounded-2xl shadow-2xl border ${theme.borderLight} py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] translate-y-2 group-hover:translate-y-0`}>
                            <div className={`px-4 py-2 border-b ${theme.borderLight} mb-1`}>
                                <h5 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Switch Branch</h5>
                            </div>
                            <div className="max-h-60 overflow-y-auto no-scrollbar">
                                {branches.map(branch => (
                                    <button
                                        key={branch._id || branch.id}
                                        onClick={() => setActiveBranchId(branch._id || branch.id)}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between
                                            ${String(activeBranchId) === String(branch._id || branch.id) 
                                                ? `${theme.primaryIconBg} ${theme.primaryIconText}` 
                                                : `${theme.textPrimary} ${theme.tableRowHover}`}`}
                                    >
                                        {branch.name}
                                        {String(activeBranchId) === String(branch._id || branch.id) && (
                                            <span className={`w-1.5 h-1.5 ${theme.mode === 'light' ? 'bg-indigo-600' : 'bg-current'} rounded-full`}></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className={`hidden lg:flex items-center gap-2 ${theme.textSecondary}`}>
                    <Clock size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        Login: {sessionInfo.loginTime}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {(currentUser.role === "Admin" || currentUser.role === "Manager") && (
                    <>
                        <button
                            onClick={() => setIsBusinessTypeModalOpen(true)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${theme.primaryIconBg} ${theme.primaryIconText} hover:opacity-80 transition-all`}
                            title="Change Business Type"
                        >
                            <Building2 size={16} />
                                <span className="text-xs font-bold hidden sm:inline capitalize">
                                    {typeof businessType === 'object' ? businessType?.displayString : businessType}
                                </span>
                        </button>
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all ${isOnlineOrderingEnabled
                                ? `${theme.successBg} ${theme.successText}`
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
                    </>
                )}

                {/* Notification Bell */}
                <div className="relative group p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer">
                    <Bell size={20} className={theme.textSecondary} onClick={() => {
                        requestNotificationPermission();
                        setIsNotificationsOpen(!isNotificationsOpen);
                    }} />
                    {(notifications.filter(n => !n.isRead).length > 0 || (currentUser?.subscription && !currentUser?.subscription?.active)) && (
                         <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 group-hover:scale-110 transition-transform"></span>
                    )}
                    
                    {/* Dropdown */}
                    <div className={`absolute top-full right-0 mt-2 w-80 ${theme.surfaceBg} rounded-2xl shadow-2xl border ${theme.borderLight} p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] scale-95 group-hover:scale-100`}>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className={`text-sm font-black ${theme.textHeading} uppercase tracking-tight`}>Notifications</h4>
                            {notifications.some(n => !n.isRead) ? (
                                <button onClick={handleMarkAllRead} className={`text-[10px] font-black uppercase tracking-widest ${theme.linkText} hover:${theme.linkHover}`}>Mark All Read</button>
                            ) : (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.primaryIconBg} ${theme.primaryIconText}`}>Clear</span>
                            )}
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar">
                            {/* Standard Welcome Notification */}
                            {notifications.length === 0 && (
                                <div className={`group/item flex gap-3 items-start p-3 rounded-2xl ${theme.infoBg} border ${theme.infoBorder} hover:scale-[1.02] transition-all cursor-default`}>
                                    <div className={`p-1.5 rounded-lg ${theme.infoBg} text-blue-500`}>
                                        <Info size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-[11px] font-bold ${theme.textPrimary} leading-relaxed`}>
                                            Welcome to FilePe! Enable browser notifications for live alerts.
                                        </p>
                                        <span className={`text-[9px] font-medium ${theme.textMuted} mt-1 block`}>System</span>
                                    </div>
                                </div>
                            )}

                            {/* Server fetched notifications */}
                            {notifications.map((n, idx) => (
                                <Link 
                                    to={n.actionUrl || "#"} 
                                    key={n._id || idx} 
                                    onClick={() => !n.isRead && notificationService.markAsRead(n._id)}
                                    className={`group/item flex gap-3 items-start p-3 rounded-2xl ${n.isRead ? theme.cardBg : theme.infoBg} border ${n.isRead ? theme.borderLight : theme.infoBorder} hover:scale-[1.02] transition-all cursor-pointer block no-underline`}
                                >
                                    <div className={`p-1.5 rounded-lg ${n.type === 'LOW_STOCK' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {n.type === 'LOW_STOCK' ? <AlertTriangle size={14} /> : <Info size={14} />}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h5 className={`text-[11px] font-black ${theme.textHeading} mb-0.5`}>{n.title}</h5>
                                        <p className={`text-[10px] font-bold ${theme.textSecondary} leading-relaxed`}>{n.message}</p>
                                        <span className={`text-[9px] font-medium ${theme.textMuted} mt-1 block flex items-center gap-2`}>
                                           {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                           {!n.isRead && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>}
                                        </span>
                                    </div>
                                </Link>
                            ))}

                            {/* Subscription Warning */}
                            {currentUser?.subscription && !currentUser?.subscription?.active && (
                                <div className="flex gap-3 items-start p-3 rounded-2xl bg-red-500/10 border border-red-500/20 hover:scale-[1.02] transition-all">
                                    <div className="p-1.5 rounded-lg bg-red-500/20 text-red-500">
                                        <AlertTriangle size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-[11px] font-bold ${theme.textPrimary} leading-relaxed`}>
                                            {currentUser?.isOwner ? "Action Required: Your shop plan is inactive. Please subscribe." : "Shop plan inactive. Some features may be restricted."}
                                        </p>
                                        <span className="text-[9px] font-medium text-red-400 mt-1 block font-black uppercase tracking-tighter">Urgent</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className={`mt-4 pt-3 border-t ${theme.borderLight} flex justify-center`}>
                            <button className={`w-full py-2 text-[10px] font-black uppercase tracking-widest ${theme.textMuted} hover:${theme.textPrimary} transition-colors`}>
                                View Activity History
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`${theme.textHeading} font-black tracking-tighter text-lg md:text-xl`}>
                    {shopName}
                </div>
            </div>

            {/* Business Type Modal */}
            <BusinessTypeModal
                isOpen={isBusinessTypeModalOpen}
                onClose={() => setIsBusinessTypeModalOpen(false)}
                businessType={businessType}
                businessSubtype={businessSubtype}
                enabledModules={enabledModules}
                onSave={onBusinessTypeChange}
            />
        </div>
    );
};

export default Navbar;
