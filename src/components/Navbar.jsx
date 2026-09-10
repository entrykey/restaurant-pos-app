import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, Clock, Wifi, WifiOff, Menu, Building2, MapPin, Bell, Info, AlertTriangle, ChevronRight, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import BusinessTypeModal from "./BusinessTypeModal";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../auth/usePermission";
import { MODULES } from "../constants/modules";
import { ACTIONS } from "../constants/actions";
import { notificationService } from "../services/notificationService";
import { computeUserHasActiveSubscription, isSubscriptionPaymentPending } from "../utils/subscriptionStatus";

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
    const subscriptionOk = computeUserHasActiveSubscription(currentUser, organization);
    const paymentPendingNav = isSubscriptionPaymentPending(organization);
    const showSubscriptionBadge =
        !currentUser?.isSuperAdmin && !subscriptionOk;
    const [isBusinessTypeModalOpen, setIsBusinessTypeModalOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isTrialPopoverOpen, setIsTrialPopoverOpen] = useState(false);
    const [isSubNavOpen, setIsSubNavOpen] = useState(false);
    const navigate = useNavigate();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.branch-dropdown-container') && !e.target.closest('.notification-dropdown-container')) {
                setIsBranchDropdownOpen(false);
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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
    const hasFullAccess = isOwner || currentUser?.allBranches;

    const showBranchSelector =
        !currentUser?.isSuperAdmin &&
        branches &&
        branches.length > 0 &&
        (hasFullAccess || branches.length > 1 || (currentUser?.branchIds && currentUser.branchIds.length > 0));

    const selectedBranchObj = branches.find((b) => String(b._id || b.id) === String(activeBranchId));
    const branchSelectorTitle = selectedBranchObj?.name || branches[0]?.name || "Select Branch";

    const isTrial = !currentUser?.isSuperAdmin && organization?.subscriptionStatus === 'trial';
    const trialDaysLeft = isTrial
        ? Math.max(0, Math.ceil((new Date(organization.subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0;

    return (
        <div className={`w-full ${theme.sidebarBg} border-b ${theme.borderLight} shrink-0 z-40 relative flex flex-col`}>
            {/* Top Bar Row */}
            <div className="h-16 px-3 md:px-6 flex items-center justify-between gap-2 sm:gap-3 w-full">
                {/* Left side: mobile menu toggle + Shop Name */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Mobile sidebar toggle */}
                    <button
                        type="button"
                        className={`md:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl hover:${theme.inputBg.replace('bg-', '')} active:opacity-70 ${theme.textHeading} shrink-0`}
                        onClick={onMobileSidebarOpen}
                        aria-label="Open menu"
                    >
                        <Menu size={20} />
                    </button>

                    {/* Shop Name / Logo */}
                    <div 
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                    >
                        {typeof shopName === 'string' && (shopName.includes('Modern POS') || shopName.includes('FilePe') || shopName === 'Shop') ? (
                            <img
                                src="/assets/FILEPE_WHITE.svg"
                                alt="FilePe POS"
                                className="h-6 sm:h-7.5 w-auto object-contain"
                            />
                        ) : (
                            <div className={`${theme.textHeading} font-black tracking-tighter text-sm sm:text-lg truncate max-w-[100px] sm:max-w-[180px]`}>
                                {shopName}
                            </div>
                        )}
                    </div>

                    {/* Owner Back to Portfolio Button (Desktop md+) */}
                    {isOwner && (
                        <button
                            onClick={() => navigate("/owner-dashboard")}
                            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} hover:shadow-md transition-all active:scale-95 group shrink-0`}
                            title="Back to Shop Portfolio"
                        >
                            <Building2 size={15} className={theme.primaryIconText} />
                            <span className={`text-xs font-bold ${theme.textPrimary} uppercase tracking-tight`}>
                                My Shops
                            </span>
                        </button>
                    )}
                </div>

                {/* Middle Section: Desktop Free Trial Card (Visible lg+) */}
                {isTrial && (
                    <div 
                        onClick={() => {
                            if (can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW)) {
                                navigate('/organization');
                            }
                        }}
                        className={`hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl border-2 border-dashed shadow-sm transition-all shrink-0
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
                                Ends in {trialDaysLeft} days
                            </div>
                        </div>
                        {can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW) && (
                            <div className={`ml-1 p-1 rounded-full ${theme.mode === 'light' ? 'bg-amber-200/50' : 'bg-amber-800/30'}`}>
                                <ChevronRight size={12} />
                            </div>
                        )}
                    </div>
                )}

                {/* Right Section */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    {/* Branch Selector (Icon-only button on screens < md, Full pill on md+) */}
                    {showBranchSelector && (
                        <div className="relative shrink-0 branch-dropdown-container">
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBranchDropdownOpen(prev => !prev);
                                    setIsNotificationsOpen(false);
                                }}
                                className={`flex items-center justify-center gap-1.5 ${theme.inputBg} w-9 h-9 md:w-auto md:h-auto md:px-3 md:py-2 rounded-xl border ${theme.inputBorder} cursor-pointer hover:opacity-80 active:scale-95 transition-all`}
                                title={`Switch Branch: ${branchSelectorTitle}`}
                                aria-label={`Switch Branch (${branchSelectorTitle})`}
                            >
                                <MapPin size={18} className={theme.primaryIconText} />
                                <span className={`hidden md:inline text-xs font-black ${theme.textPrimary} uppercase tracking-tight truncate max-w-[130px] lg:max-w-[170px]`}>
                                    {branchSelectorTitle}
                                </span>
                                <ChevronDown size={14} className={`hidden md:inline ${theme.textMuted} transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Branch Dropdown Menu */}
                            {(isBranchDropdownOpen) && (
                                <div className={`absolute top-full right-0 mt-2 w-56 sm:w-64 ${theme.surfaceBg} rounded-2xl shadow-2xl border ${theme.borderLight} py-2 z-[150] animate-in fade-in-50 zoom-in-95 duration-150`}>
                                    <div className={`px-4 py-2 border-b ${theme.borderLight} mb-1 flex items-center justify-between`}>
                                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Switch Branch</h5>
                                        {hasFullAccess && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">Full Access</span>}
                                    </div>
                                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                                        {branches.map(branch => (
                                            <button
                                                key={branch._id || branch.id}
                                                onClick={() => {
                                                    setActiveBranchId(branch._id || branch.id);
                                                    setIsBranchDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between
                                                    ${String(activeBranchId) === String(branch._id || branch.id) 
                                                        ? `${theme.primaryIconBg} ${theme.primaryIconText}` 
                                                        : `${theme.textPrimary} ${theme.tableRowHover}`}`}
                                            >
                                                <span className="truncate pr-2">{branch.name}</span>
                                                {String(activeBranchId) === String(branch._id || branch.id) && (
                                                    <span className={`w-2 h-2 ${theme.mode === 'light' ? 'bg-indigo-600' : 'bg-indigo-400'} rounded-full shrink-0`}></span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Inline Business Type & Online Toggle (Desktop lg+) */}
                    <div className="hidden lg:flex items-center gap-3">
                        {(currentUser.role === "Admin" || currentUser.role === "Manager") && (
                            <>
                                <button
                                    onClick={() => setIsBusinessTypeModalOpen(true)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${theme.primaryIconBg} ${theme.primaryIconText} hover:opacity-80 transition-all`}
                                    title="Change Business Type"
                                >
                                    <Building2 size={16} />
                                    <span className="text-xs font-bold capitalize">
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
                                    {isOnlineOrderingEnabled ? <Wifi size={16} /> : <WifiOff size={16} />}
                                    <span className="text-xs font-bold">
                                        {isOnlineOrderingEnabled ? "Online ON" : "Online OFF"}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Notification Bell */}
                    <div className="relative notification-dropdown-container shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                requestNotificationPermission();
                                setIsNotificationsOpen(prev => !prev);
                                setIsBranchDropdownOpen(false);
                            }}
                            className={`flex items-center justify-center w-9 h-9 rounded-xl ${theme.sidebarItemHoverBg} border ${theme.borderLight} transition-all cursor-pointer relative active:scale-95`}
                            aria-label="Notifications"
                        >
                            <Bell size={18} className={theme.textSecondary} />
                            {(notifications.filter(n => !n.isRead).length > 0 || showSubscriptionBadge) && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                            )}
                        </button>
                        
                        {/* Dropdown Menu */}
                        {isNotificationsOpen && (
                            <div className={`absolute top-full right-0 mt-2 w-72 sm:w-80 ${theme.surfaceBg} rounded-2xl shadow-2xl border ${theme.borderLight} p-4 z-[150] animate-in fade-in-50 zoom-in-95 duration-150`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className={`text-sm font-black ${theme.textHeading} uppercase tracking-tight`}>Notifications</h4>
                                    {notifications.some(n => !n.isRead) ? (
                                        <button onClick={handleMarkAllRead} className={`text-[10px] font-black uppercase tracking-widest ${theme.linkText} hover:${theme.linkHover}`}>Mark All Read</button>
                                    ) : (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.primaryIconBg} ${theme.primaryIconText}`}>Clear</span>
                                    )}
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar">
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

                                    {paymentPendingNav ? (
                                        <div className="flex gap-3 items-start p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:scale-[1.02] transition-all">
                                            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600">
                                                <AlertTriangle size={14} />
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-[11px] font-bold ${theme.textPrimary} leading-relaxed`}>
                                                    Payment submitted. Waiting for super admin confirmation.
                                                </p>
                                                <span className="text-[9px] font-medium text-amber-500 mt-1 block font-black uppercase tracking-tighter">Pending</span>
                                            </div>
                                        </div>
                                    ) : null}

                                    {!subscriptionOk && !paymentPendingNav && currentUser && !currentUser?.isSuperAdmin ? (
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
                                    ) : null}
                                </div>
                                
                                <div className={`mt-4 pt-3 border-t ${theme.borderLight} flex justify-center`}>
                                    <button className={`w-full py-2 text-[10px] font-black uppercase tracking-widest ${theme.textMuted} hover:${theme.textPrimary} transition-colors`}>
                                        View Activity History
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Accordion Sub-Navbar Toggle Button (Visible below lg) */}
                    <button
                        type="button"
                        onClick={() => setIsSubNavOpen(!isSubNavOpen)}
                        className={`lg:hidden flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-bold transition-all relative ${
                            isSubNavOpen
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : `${theme.inputBg} ${theme.inputBorder} ${theme.textPrimary} hover:opacity-80`
                        }`}
                        title="Toggle Controls Sub-Navbar"
                    >
                        <SlidersHorizontal size={14} />
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isSubNavOpen ? 'rotate-180' : ''}`} />
                        {isTrial && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900"></span>
                        )}
                    </button>
                </div>
            </div>

            {/* Sub-Navbar Accordion Drawer (Visible below lg when toggled) */}
            {isSubNavOpen && (
                <div className={`lg:hidden border-t ${theme.borderLight} px-4 py-3 bg-black/5 dark:bg-white/5 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200`}>
                    {/* Trial Alert Banner */}
                    {isTrial && (
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 shadow-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Clock size={16} className="animate-pulse shrink-0 text-amber-600" />
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-wider opacity-75">Free Trial</p>
                                    <p className="text-xs font-black truncate">Ends in {trialDaysLeft} days</p>
                                </div>
                            </div>
                            {can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW) && (
                                <button
                                    onClick={() => navigate('/organization')}
                                    className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0 flex items-center gap-1 shadow"
                                >
                                    Subscribe <ChevronRight size={12} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Quick Tools Grid */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* My Shops button (Mobile/Tablet) */}
                            {isOwner && (
                                <button
                                    onClick={() => navigate("/owner-dashboard")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} text-xs font-bold ${theme.textPrimary}`}
                                >
                                    <Building2 size={14} className={theme.primaryIconText} />
                                    <span>My Shops</span>
                                </button>
                            )}

                            {/* Full Branch Selector inside Sub-Navbar */}
                            {showBranchSelector && (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} text-xs font-black ${theme.textPrimary}`}
                                    >
                                        <MapPin size={14} className={theme.primaryIconText} />
                                        <span>{branchSelectorTitle}</span>
                                        <ChevronDown size={12} className={theme.textMuted} />
                                    </button>
                                    {/* Branch options menu */}
                                    <div className={`absolute left-0 top-full mt-1 w-56 ${theme.surfaceBg} rounded-2xl shadow-2xl border ${theme.borderLight} py-2 z-[150] hidden group-hover:block group-focus-within:block`}>
                                        <div className={`px-3 py-1.5 border-b ${theme.borderLight} text-[10px] font-black uppercase text-gray-400`}>Select Branch</div>
                                        {branches.map(b => (
                                            <button
                                                key={b._id || b.id}
                                                onClick={() => setActiveBranchId(b._id || b.id)}
                                                className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between ${String(activeBranchId) === String(b._id || b.id) ? 'text-indigo-600 font-black' : theme.textPrimary}`}
                                            >
                                                <span>{b.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Business Type */}
                            {(currentUser.role === "Admin" || currentUser.role === "Manager") && (
                                <>
                                    <button
                                        onClick={() => setIsBusinessTypeModalOpen(true)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${theme.primaryIconBg} ${theme.primaryIconText} text-xs font-bold`}
                                    >
                                        <Building2 size={14} />
                                        <span className="capitalize">{typeof businessType === 'object' ? businessType?.displayString : businessType}</span>
                                    </button>

                                    {/* Online Orders */}
                                    <button
                                        onClick={() => setIsOnlineOrderingEnabled(!isOnlineOrderingEnabled)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${isOnlineOrderingEnabled ? `${theme.successBg} ${theme.successText}` : 'bg-red-100 text-red-700'}`}
                                    >
                                        {isOnlineOrderingEnabled ? <Wifi size={14} /> : <WifiOff size={14} />}
                                        <span>{isOnlineOrderingEnabled ? "Online ON" : "Online OFF"}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
