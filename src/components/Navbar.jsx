import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, Clock, Wifi, WifiOff, Menu, Building2, MapPin, Bell, Info, AlertTriangle, ChevronRight } from "lucide-react";
import BusinessTypeModal from "./BusinessTypeModal";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../auth/usePermission";
import { MODULES } from "../constants/modules";
import { ACTIONS } from "../constants/actions";
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
    const { activeBranchId, setActiveBranchId, branches, currentShopId, organization } = useApp();
    const { theme } = useTheme();
    const { can } = usePermission();
    const [isBusinessTypeModalOpen, setIsBusinessTypeModalOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const navigate = useNavigate();

    // Initial fetch of notifications
    useEffect(() => {
        if (currentShopId) {
            refreshNotifications();
            // Polling for new notifications every 5 minutes (or use websockets later)
            const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [currentShopId]); // Removed activeBranchId to keep polling for whole shop/organization

    // Monitor for NEW notifications to trigger browser alerts
    useEffect(() => {
        if (notifications.length > 0) {
            // Find unread notifications created in the last 10 minutes to avoid spamming old ones on login
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const newUnread = notifications.filter(n => 
                !n.isRead && 
                new Date(n.createdAt) > tenMinutesAgo
            );

            if (newUnread.length > 0) {
                // Show notification for the most recent one
                const latest = newUnread[0];
                notificationService.notify(latest.title, {
                    body: latest.message,
                    tag: latest._id // Prevent duplicate alerts for the same ID
                });
            }
        }
    }, [notifications]);

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

    const handleNotificationClick = async (n) => {
        if (!n.isRead) {
            await notificationService.markAsRead(n._id);
            setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
        }

        // Context switching if needed
        if (n.shopId && String(n.shopId) !== String(currentShopId)) {
            if (onSwitchShop) {
                await onSwitchShop(n.shopId);
                if (n.branchId) {
                    setActiveBranchId(n.branchId);
                }
                setTimeout(() => {
                    if (n.actionUrl) navigate(n.actionUrl);
                }, 100);
                return;
            }
        }
        
        if (n.branchId && String(n.branchId) !== String(activeBranchId)) {
            setActiveBranchId(n.branchId);
        }

        if (n.actionUrl) {
            navigate(n.actionUrl);
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

                {/* Branch Selector - Visible for everyone if they have 1+ branches, 
                    OR specifically for owners to manage branch context */}
                {(branches.length > 1 || isOwner) && !currentUser?.roles?.some(r => r.isSystemRole) && !currentUser?.isSuperAdmin && (
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
            </div>

            {/* Middle Section: Trial Countdown */}
            {!currentUser?.isSuperAdmin && organization?.subscriptionStatus === 'trial' && (
                <div 
                    onClick={() => {
                        if (can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW)) {
                            navigate('/organization');
                        }
                    }}
                    className={`flex items-center gap-3 px-5 py-2 rounded-2xl border-2 border-dashed shadow-sm transition-all
                        ${can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW) ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
                        ${theme.mode === 'light' 
                            ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-100/50' 
                            : 'bg-amber-900/10 border-amber-800/50 text-amber-400'}
                    `}
                >
                    <div className={`p-1.5 rounded-lg ${theme.mode === 'light' ? 'bg-amber-100' : 'bg-amber-900/30'}`}>
                        <Clock size={16} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Free Trial</div>
                        <div className="text-xs font-black tracking-tight">
                            Ends in {Math.max(0, Math.ceil((new Date(organization.subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                        </div>
                    </div>
                    {can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW) && (
                        <div className={`ml-2 p-1 rounded-full ${theme.mode === 'light' ? 'bg-amber-200/50' : 'bg-amber-800/30'}`}>
                            <ChevronRight size={12} />
                        </div>
                    )}
                </div>
            )}

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
                                <div 
                                    key={n._id || idx} 
                                    onClick={() => handleNotificationClick(n)}
                                    className={`group/item flex gap-3 items-start p-3 rounded-2xl ${n.isRead ? theme.cardBg : theme.infoBg} border ${n.isRead ? theme.borderLight : theme.infoBorder} hover:scale-[1.02] transition-all cursor-pointer block text-left`}
                                >
                                    <div className={`p-1.5 rounded-lg ${n.type === 'LOW_STOCK' || n.priority === 'HIGH' || n.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {n.type === 'LOW_STOCK' ? <AlertTriangle size={14} /> : <Info size={14} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h5 className={`text-[11px] font-black ${theme.textHeading}`}>{n.title}</h5>
                                            {n.shopId && String(n.shopId) !== String(currentShopId) && (
                                                <span className="text-[7px] font-black uppercase bg-indigo-500/10 text-indigo-500 px-1 py-0.5 rounded italic">Cross-Shop</span>
                                            )}
                                        </div>
                                        <p className={`text-[10px] font-bold ${theme.textSecondary} leading-relaxed`}>{n.message}</p>
                                        <span className={`text-[9px] font-medium ${theme.textMuted} mt-1 block flex items-center gap-2`}>
                                           {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                           {!n.isRead && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>}
                                        </span>
                                    </div>
                                </div>
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
