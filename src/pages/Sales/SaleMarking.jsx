import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Search, Info, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useText } from '../../context/TextContext';
import { saleMarkingService } from '../../services/api';
import CommonTable from '../../components/CommonTable';
import ThemeLoader from '../../components/ui/ThemeLoader';
import CommonDialog from '../../components/modals/CommonDialog';

const SaleMarking = () => {
    const { activeBranchId, currentShopId } = useApp();
    const { theme } = useTheme();
    const { t } = useText();
    
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMarking, setIsMarking] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [latestMarking, setLatestMarking] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const fetchItems = useCallback(async () => {
        if (!currentShopId || !activeBranchId) return;
        setIsLoading(true);
        try {
            const response = await saleMarkingService.getMarkingItems(currentShopId, activeBranchId);
            if (response.success) {
                setItems(response.data || []);
                setLatestMarking(response.latestMarking);
            }
        } catch (error) {
            console.error("Failed to fetch marking items:", error);
            setMessage({ text: "Failed to load items. Please try again.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [currentShopId, activeBranchId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleMarkSale = async () => {
        setIsMarking(true);
        try {
            const payload = {
                shopId: currentShopId,
                branchId: activeBranchId,
                businessDate: new Date().toISOString().split('T')[0]
            };
            const response = await saleMarkingService.markDailySale(payload);
            if (response.success) {
                setMessage({ text: "Sale marked successfully for today!", type: "success" });
                fetchItems();
            }
        } catch (error) {
            console.error("Failed to mark sale:", error);
            setMessage({ text: "Failed to mark sale. Please try again.", type: "error" });
        } finally {
            setIsMarking(false);
        }
    };

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: "Item Details",
            key: "name",
            render: (value, item) => (
                <div className="flex flex-col">
                    <span className={`font-black text-sm ${theme.textHeading}`}>{value}</span>
                    <span className={`text-[10px] font-bold ${theme.textSecondary}`}>Code: {item.itemCode}</span>
                </div>
            )
        },
        {
            header: "Type",
            key: "itemType",
            render: (value) => (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight 
                    ${value === 'STOCK' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 
                      value === 'MANUFACTURED' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 
                      'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {value}
                </span>
            )
        },
        {
            header: "Category",
            key: "category",
            render: (value) => (
                <span className={`text-[11px] font-bold ${theme.textSecondary}`}>{value}</span>
            )
        },
        {
            header: "Current Stock",
            key: "quantityOnHand",
            headerClassName: "text-center",
            className: "text-center",
            render: (value, item) => (
                <div className="flex flex-col items-center">
                    <span className={`font-black text-sm ${theme.textHeading}`}>{value}</span>
                    <span className={`text-[9px] font-bold ${theme.textMuted}`}>{item.unit}</span>
                </div>
            )
        },
        {
            header: "Marking Status",
            key: "isMarkedToday",
            headerClassName: "text-center",
            className: "text-center",
            render: (value) => (
                <div className="flex justify-center">
                    {value ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <CheckCircle2 size={12} /> Marked
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-400 border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                             Pending
                        </div>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className={`overflow-y-auto h-full ${theme.pageBg}`}>
            <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20`}>
                                <CalendarCheck size={28} />
                            </div>
                            <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${theme.textHeading}`}>
                                Sale Marking
                            </h2>
                        </div>
                        <p className={`font-bold ml-1 ${theme.textMuted}`}>
                            Mark available stock and close the current sales session
                        </p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={isMarking || isLoading}
                            className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black shadow-xl text-white transition-all flex items-center justify-center gap-2
                                ${isMarking ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}
                            `}
                        >
                            {isMarking ? <ThemeLoader size="xs" color="white" /> : <Clock size={20} />}
                            {isMarking ? "Processing..." : "Mark Today's Sale"}
                        </button>
                    </div>
                </div>

                {/* Dashboard Status Card */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-6`}>
                    <div className={`p-5 rounded-[32px] border ${theme.cardBg} ${theme.borderLight} shadow-sm flex items-center gap-4`}>
                        <div className={`w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center`}>
                            <Info size={24} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>Current Status</p>
                            <h4 className={`text-lg font-black ${theme.textHeading}`}>
                                {latestMarking ? "Session Active" : "No Session Today"}
                            </h4>
                        </div>
                    </div>

                    <div className={`p-5 rounded-[32px] border ${theme.cardBg} ${theme.borderLight} shadow-sm flex items-center gap-4`}>
                        <div className={`w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center`}>
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>Marked Items</p>
                            <h4 className={`text-lg font-black ${theme.textHeading}`}>
                                {items.filter(i => i.isMarkedToday).length} / {items.length}
                            </h4>
                        </div>
                    </div>

                    <div className={`p-5 rounded-[32px] border ${theme.cardBg} ${theme.borderLight} shadow-sm flex items-center gap-4`}>
                        <div className={`w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center`}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-1`}>Last Marking</p>
                            <h4 className={`text-sm font-black ${theme.textHeading}`}>
                                {latestMarking ? new Date(latestMarking.markedAt).toLocaleTimeString() : "Never"}
                            </h4>
                        </div>
                    </div>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
                        message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span className="font-black text-sm">{message.text}</span>
                        <button onClick={() => setMessage({ text: "", type: "" })} className="ml-auto opacity-50 hover:opacity-100 font-bold text-xs uppercase tracking-widest">Dismiss</button>
                    </div>
                )}

                <div className="relative mb-6">
                    <Search className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search items to mark..."
                        className={`w-full pl-12 pr-4 py-4 border-2 border-transparent rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium ${theme.surfaceBg} ${theme.textPrimary}`}
                    />
                </div>
            <div className="px-0 pb-6">
                <CommonTable
                    columns={columns}
                    data={filteredItems}
                    isLoading={isLoading}
                    className="pt-0"
                />
            </div>

            </div>{/* end scroll wrapper */}

            <CommonDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleMarkSale}
                title="Mark Today's Sale"
                message="Are you sure you want to mark the sale now? This will capture the current stock levels, and any subsequent sales will be counted as part of the next session."
                type="confirm"
                confirmText="Mark Sale"
                cancelText="Cancel"
            />
        </div>
    );
};

export default SaleMarking;
