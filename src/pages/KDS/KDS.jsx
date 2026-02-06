import React, { useState, useEffect } from 'react';
import { MonitorPlay, ChefHat, RefreshCw, Search, Filter } from 'lucide-react';
import KDSCard from '../../components/KDSCard';

import { ROUTE_ACCESS } from "../../config/permissionStructure";

const KDS = ({
    tables,
    onlineOrders,
    handleCompleteKOT,
    handleCompleteOnlineKOT,
    currentTime,
    hasPermissionFor,
}) => {
    const kdsAccess = ROUTE_ACCESS.KDS;
    const canView = hasPermissionFor?.(kdsAccess.module, kdsAccess.resource, kdsAccess.action);
    if (!canView) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-12 bg-white rounded-[40px] shadow-xl border max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MonitorPlay size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 font-medium">You don't have permission to view the Kitchen Display System.</p>
                </div>
            </div>
        );
    }

    const tableKOTs = tables.filter(
        (t) => t.order && t.order.isSentToKOT && t.order.kotStatus !== "ready"
    );

    const onlineKOTs = onlineOrders.filter(
        (o) => o.status === "accepted" && o.kotStatus !== "ready"
    );

    const totalOrders = tableKOTs.length + onlineKOTs.length;

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-100/50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <MonitorPlay size={28} />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">
                            Kitchen Display
                        </h2>
                    </div>
                    <p className="text-gray-500 font-bold flex items-center gap-2">
                        Live orders and preparation tracking
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-black text-indigo-600">{totalOrders}</div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active KOTs</div>
                        </div>
                    </div>
                    <button className="bg-white p-4 rounded-2xl border shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {totalOrders > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                        {/* Table Orders First */}
                        {tableKOTs.map((t) => (
                            <KDSCard
                                key={`table-${t.id}`}
                                order={t}
                                type="table"
                                onMarkReady={handleCompleteKOT}
                                currentTime={currentTime}
                            />
                        ))}
                        {/* Online Orders Next */}
                        {onlineKOTs.map((o) => (
                            <KDSCard
                                key={`online-${o.id}`}
                                order={o}
                                type="online"
                                onMarkReady={handleCompleteOnlineKOT}
                                currentTime={currentTime}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-gray-50">
                            <ChefHat size={48} className="text-gray-200" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">Everything's Ready!</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">
                            No pending orders in the kitchen. Enjoy the quiet moment!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KDS;
