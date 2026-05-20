import React, { useState, useEffect, useCallback } from 'react';
import { MonitorPlay, ChefHat, RefreshCw } from 'lucide-react';
import KDSCard from '../../components/KDSCard';
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { kdsService } from './KDSService';
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import EstimatedTimeModal from '../../components/modals/EstimatedTimeModal';
import { useTheme } from "../../context/ThemeContext";

const KDS = ({
    tables,
    onlineOrders,
    handleCompleteKOT,
    handleCompleteOnlineKOT,
    currentTime,
    hasPermissionFor,
}) => {
    const { theme, themeName } = useTheme();
    const kdsAccess = ROUTE_ACCESS.KDS;
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const [liveKOTs, setLiveKOTs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [selectedKotId, setSelectedKotId] = useState(null);

    const fetchKOTs = useCallback(async (isPolling = false) => {
        const branchId = activeBranchId || user?.branch_id || user?.branchId || (user?.branchIds && user.branchIds[0]);
        // Remove: if (!branchId) return; - Allow null for superadmin/all-branches

        if (!isPolling) setIsLoading(true);
        try {
            const kots = await kdsService.getKOTs(branchId);
            setLiveKOTs(kots);
        } catch (error) {
            console.error("Failed to fetch KOTs:", error);
        } finally {
            if (!isPolling) setIsLoading(false);
        }
    }, [user, activeBranchId]);

    useEffect(() => {
        fetchKOTs();
        const interval = setInterval(() => fetchKOTs(true), 10000);
        return () => clearInterval(interval);
    }, [fetchKOTs]);

    const canView = hasPermissionFor?.(kdsAccess.module, kdsAccess.resource, kdsAccess.action);

    if (!canView) {
        return (
            <div className={`h-full flex items-center justify-center ${theme.pageBg}`}>
                <div className={`${theme.surfaceBg} text-center p-12 rounded-[40px] shadow-xl border ${theme.borderLight} max-w-md`}>
                    <div className={`w-20 h-20 ${themeName === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        <MonitorPlay size={40} />
                    </div>
                    <h2 className={`text-2xl font-black ${theme.textHeading} mb-2`}>Access Restricted</h2>
                    <p className={`${theme.textMuted} font-medium`}>You don't have permission to view the Kitchen Display System.</p>
                </div>
            </div>
        );
    }

    const tableKOTs = liveKOTs.filter(k => k.tableId);
    const onlineKOTs = liveKOTs.filter(k => !k.tableId);
    const totalOrders = liveKOTs.length;
    const canManage = hasPermissionFor?.(kdsAccess.module, kdsAccess.resource, "manage");
    const canServe = hasPermissionFor?.(kdsAccess.module, kdsAccess.resource, "serve");

    const handleStartPrep = (kotId) => {
        setSelectedKotId(kotId);
        setIsTimeModalOpen(true);
    };

    const handleUpdateStatus = async (kotId, status, estimatedTime = 0) => {
        try {
            await kdsService.updateKOTStatus(kotId, status, estimatedTime);
            fetchKOTs(true);
        } catch (error) {
            console.error("Failed to update KOT status:", error);
            alert("Failed to update status. Please try again.");
        }
    };

    return (
        <div className={`p-4 md:p-8 h-full flex flex-col ${theme.pageBg}`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200`}>
                            <MonitorPlay size={28} />
                        </div>
                        <h2 className={`text-2xl md:text-4xl font-black ${theme.textHeading} tracking-tight`}>
                            Kitchen Display
                        </h2>
                    </div>
                    <p className={`${theme.textMuted} font-bold flex items-center gap-2`}>
                        Live orders and preparation tracking
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`${theme.surfaceBg} px-6 py-4 rounded-2xl shadow-sm border ${theme.borderLight} flex items-center gap-4`}>
                        <div className="text-center">
                            <div className="text-2xl font-black text-indigo-600">{totalOrders}</div>
                            <div className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>Active KOTs</div>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchKOTs(true)}
                        className={`${theme.surfaceBg} p-4 rounded-2xl border ${theme.borderLight} ${theme.textSecondary} hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95`}
                    >
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {totalOrders > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                        {/* Table Orders First */}
                        {tableKOTs.map((k, index) => {
                            const tableIdStr = k.tableId?._id || k.tableId;
                            const orderIdStr = k.orderId?._id || k.orderId;
                            const isAdditional = tableKOTs.findIndex(t => 
                                (t.tableId?._id || t.tableId) === tableIdStr && 
                                (t.orderId?._id || t.orderId) === orderIdStr
                            ) < index;
                            
                            return (
                                <KDSCard
                                    key={k._id}
                                    order={k}
                                    type="table"
                                    isAdditional={isAdditional}
                                    onUpdateStatus={handleUpdateStatus}
                                    onStartPrep={handleStartPrep}
                                    currentTime={currentTime}
                                    canManage={canManage}
                                    canServe={canServe}
                                />
                            );
                        })}
                        {/* Online Orders Next */}
                        {onlineKOTs.map((o, index) => {
                            const orderIdStr = o.orderId?._id || o.orderId;
                            const isAdditional = onlineKOTs.findIndex(t => 
                                (t.orderId?._id || t.orderId) === orderIdStr
                            ) < index;
                            
                            return (
                                <KDSCard
                                    key={o._id}
                                    order={o}
                                    type="online"
                                    isAdditional={isAdditional}
                                    onUpdateStatus={handleUpdateStatus}
                                    onStartPrep={handleStartPrep}
                                    currentTime={currentTime}
                                    canManage={canManage}
                                    canServe={canServe}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                        <div className={`w-32 h-32 ${theme.surfaceBg} rounded-full flex items-center justify-center mb-6 shadow-xl border-4 ${theme.borderLight}`}>
                            <ChefHat size={48} className={theme.textMuted} />
                        </div>
                        <h3 className={`text-2xl font-black ${theme.textHeading} mb-2`}>Everything's Ready!</h3>
                        <p className={`${theme.textMuted} font-medium max-w-xs mx-auto`}>
                            No pending orders in the kitchen. Enjoy the quiet moment!
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <EstimatedTimeModal
                isOpen={isTimeModalOpen}
                onClose={() => setIsTimeModalOpen(false)}
                onConfirm={(time) => handleUpdateStatus(selectedKotId, 'PREPARING', time)}
            />
        </div>
    );
};

export default KDS;
