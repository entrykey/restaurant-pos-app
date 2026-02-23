import React, { useState, useEffect } from "react";
import { UserCheck, Clock, Wifi, WifiOff, Menu, Building2, MapPin } from "lucide-react";
import BusinessTypeModal from "./BusinessTypeModal";
import { branchService } from "../services/api";
import { useApp } from "../context/AppContext";

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
    const [isBusinessTypeModalOpen, setIsBusinessTypeModalOpen] = useState(false);
    const [userBranches, setUserBranches] = useState([]);

    // Initialize Active Branch and Fetch Branches
    useEffect(() => {
        const fetchBranches = async () => {
            if (currentUser?.shop_id && currentUser?.branchIds?.length > 1) {
                try {
                    const branches = await branchService.getBranchesByShopId(currentUser.shop_id);
                    // Filter to only branches the user has access to
                    const accessibleBranches = branches.filter(b => currentUser.branchIds.includes(b._id));
                    setUserBranches(accessibleBranches);

                    // Set default active branch if not set or invalid
                    if (!activeBranchId || !accessibleBranches.find(b => b._id === activeBranchId)) {
                        setActiveBranchId(currentUser.branchIds[0]);
                    }
                } catch (error) {
                    console.error("Failed to fetch branches for navbar", error);
                }
            } else if (currentUser?.branchIds?.length === 1) {
                // Only one branch, ensure it's set
                if (activeBranchId !== currentUser.branchIds[0]) {
                    setActiveBranchId(currentUser.branchIds[0]);
                }
            }
        };
        fetchBranches();
    }, [currentUser, activeBranchId, setActiveBranchId]);
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

                {/* Branch Selector (Only if multiple branches) */}
                {userBranches.length > 1 && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                        <MapPin size={16} className="text-gray-500" />
                        <select
                            value={activeBranchId || ""}
                            onChange={(e) => setActiveBranchId(e.target.value)}
                            className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                        >
                            {userBranches.map(branch => (
                                <option key={branch._id} value={branch._id}>
                                    {branch.branchName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="hidden md:flex items-center gap-2 text-gray-400">
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all"
                            title="Change Business Type"
                        >
                            <Building2 size={16} />
                            <span className="text-xs font-bold hidden sm:inline capitalize">
                                {businessType}
                            </span>
                        </button>
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
                    </>
                )}
                <div className="text-indigo-900 font-black tracking-tighter text-lg md:text-xl">
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
