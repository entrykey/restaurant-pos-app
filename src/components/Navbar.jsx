import React, { useState, useEffect } from "react";
import { UserCheck, Clock, Wifi, WifiOff, Menu, Building2, MapPin } from "lucide-react";
import BusinessTypeModal from "./BusinessTypeModal";
import { branchService } from "../services/api";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";

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
}) => {
    const { activeBranchId, setActiveBranchId } = useApp();
    const { theme } = useTheme();
    const [isBusinessTypeModalOpen, setIsBusinessTypeModalOpen] = useState(false);
    const [userBranches, setUserBranches] = useState([]);

    // Initialize Active Branch and Fetch Branches
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const branches = await branchService.getAllowedBranches();
                setUserBranches(branches || []);

                // If only one branch, ensure it's selected
                if (branches.length === 1) {
                    if (activeBranchId !== branches[0]._id) {
                        setActiveBranchId(branches[0]._id);
                    }
                } else if (branches.length > 1) {
                    // Check if current activeBranchId is still valid in the new list
                    const isValid = branches.find(b => b._id === activeBranchId);
                    if (!activeBranchId || !isValid) {
                        setActiveBranchId(branches[0]._id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch branches for navbar", error);
            }
        };
        fetchBranches();
    }, [currentUser, activeBranchId, setActiveBranchId]);
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
                <div className="flex items-center gap-2 md:ml-20">
                    <UserCheck size={18} className={theme.primaryIconText} />
                    <span className={`text-xs md:text-sm font-bold ${theme.textPrimary}`}>
                        {currentUser?.role}: {currentUser?.phone}
                    </span>
                </div>

                {/* Branch Selector (Only if multiple branches or is owner, and NOT superadmin/system role) */}
                {userBranches.length > 0 && !currentUser?.isSuperAdmin && !currentUser?.roles?.some(r => r.isSystemRole) && (
                    <div className={`flex items-center gap-2 ${theme.inputBg} px-3 py-1.5 rounded-xl border ${theme.inputBorder}`}>
                        <MapPin size={16} className={theme.textSecondary} />
                        <select
                            value={activeBranchId || ""}
                            onChange={(e) => setActiveBranchId(e.target.value)}
                            className={`bg-transparent text-xs font-bold ${theme.textPrimary} outline-none cursor-pointer`}
                        >
                            {userBranches.map(branch => (
                                <option key={branch._id} value={branch._id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className={`hidden md:flex items-center gap-2 ${theme.textSecondary}`}>
                    <Clock size={16} />
                    <span className="text-xs font-medium uppercase tracking-wider">
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
                                {businessType}
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
