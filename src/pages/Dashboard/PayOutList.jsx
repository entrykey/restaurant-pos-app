import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dashboardService } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { ArrowLeft, Truck, ChevronDown, Calendar, Package, Receipt, ArrowRightCircle, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PayOutSheet from '../../components/modals/PayOutSheet';
import HistoryTimeline from '../../components/HistoryTimeline';

const PayOutList = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('pending');
    const [data, setData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [expandedSuppliers, setExpandedSuppliers] = useState({});
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            if (user?.shop_id) {
                setLoading(true);
                if (activeTab === 'pending') {
                    const result = await dashboardService.getPayOutList(user.shop_id);
                    setData(result);
                } else {
                    const result = await dashboardService.getPayOutHistory(user.shop_id);
                    setHistoryData(result);
                }
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.shop_id, activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Group data by Supplier
    const supplierList = useMemo(() => {
        if (!data || data.length === 0) return [];

        const grouped = data.reduce((acc, purchase) => {
            const key = purchase.supplierPhone !== 'N/A' && purchase.supplierPhone ? purchase.supplierPhone : (purchase.supplierName || 'General Supplier');

            if (!acc[key]) {
                acc[key] = {
                    id: key,
                    supplierName: purchase.supplierName || 'General Supplier',
                    supplierPhone: purchase.supplierPhone || 'N/A',
                    purchases: [],
                    totalAmount: 0,
                    totalPaid: 0,
                    totalBalance: 0
                };
            }
            acc[key].purchases.push(purchase);
            acc[key].totalAmount += purchase.grandTotal;
            acc[key].totalPaid += purchase.totalPaid;
            acc[key].totalBalance += purchase.balanceAmount;
            return acc;
        }, {});

        // Convert grouped object to array and sort by total balance desc
        return Object.values(grouped).sort((a, b) => b.totalBalance - a.totalBalance);
    }, [data]);

    const toggleSupplier = (supplierId) => {
        setExpandedSuppliers(prev => ({
            ...prev,
            [supplierId]: !prev[supplierId]
        }));
    };

    return (
        <div className={`p-4 md:p-8 pb-32 space-y-8 w-full h-full overflow-y-auto animate-in fade-in duration-500 ${theme.pageBg}`}>
            <div className={`flex items-center gap-4 ${theme.textHeading}`}>
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`p-2 hover:opacity-80 rounded-full transition-colors ${theme.surfaceBg} border ${theme.borderLight}`}
                >
                    <ArrowLeft size={24} className={theme.textPrimary} />
                </button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Pay Out (Suppliers)</h1>
                    <p className={`${theme.textMuted} mt-1 font-medium`}>List of supplier payments and balances</p>
                </div>
            </div>

            {/* Tabs section */}
            <div className={`flex flex-wrap gap-4 p-2 rounded-2xl shadow-sm w-fit ${theme.surfaceBg}`}>
                <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "pending"
                        ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                        : `${theme.textSecondary} hover:opacity-80`
                        }`}
                >
                    <Truck size={18} /> Pending Payments
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "history"
                        ? `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300`
                        : `${theme.textSecondary} hover:opacity-80`
                        }`}
                >
                    <Calendar size={18} /> Payment History
                </button>
            </div>

            <div className={`overflow-hidden rounded-[32px] border ${theme.borderLight} ${theme.surfaceBg}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${theme.pageBg} ${theme.textMuted} text-[10px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                <th className="p-6">Supplier</th>
                                {activeTab === 'pending' ? (
                                    <>
                                        <th className="p-6 text-right">Total Limit</th>
                                        <th className="p-6 text-right">Total Paid</th>
                                        <th className="p-6 text-right">Total Balance Due</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-6 text-right">Invoice Date</th>
                                        <th className="p-6 text-right">Paid Date</th>
                                        <th className="p-6 text-right">Amount Paid</th>
                                    </>
                                )}
                                <th className="p-6 text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.borderLight}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`w-12 h-12 border-4 rounded-full animate-spin mx-auto ${theme.mode === 'dark' ? 'border-red-500/20 border-t-red-500' : 'border-red-100 border-t-red-600'}`} />
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textMuted}`}>Loading pay-outs...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (activeTab === 'pending' ? supplierList : historyData).length > 0 ? (
                                (activeTab === 'pending' ? supplierList : historyData).map((group) => {
                                    const key = group.id;
                                    const isExpanded = expandedSuppliers[key];

                                    return (
                                        <React.Fragment key={key}>
                                            <tr
                                                onClick={() => toggleSupplier(key)}
                                                className={`group hover:${theme.pageBg} transition-all cursor-pointer ${isExpanded ? theme.pageBg : ''}`}
                                            >
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? (activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600') + ' text-white' : `${theme.pageBg} ${theme.textMuted} group-hover:${activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600'} group-hover:text-white`}`}>
                                                            <Truck size={24} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-lg font-black tracking-tight transition-colors capitalize ${theme.textHeading}`}>
                                                                {group.supplierName}
                                                            </p>
                                                            <p className={`text-sm font-bold ${theme.textMuted}`}>
                                                                {group.supplierPhone !== 'N/A' ? group.supplierPhone : 'No Contact Info'}
                                                                {activeTab === 'history' && group.purchaseNumber && ` • #${group.purchaseNumber}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {activeTab === 'pending' ? (
                                                    <>
                                                        <td className="p-6 text-right">
                                                            <p className={`text-lg font-black tracking-tight ${theme.textHeading}`}>{formatCurrency(group.totalAmount)}</p>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <p className="text-lg font-black text-green-600 tracking-tight">{formatCurrency(group.totalPaid)}</p>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <p className={`text-lg font-black tracking-tight ${group.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {formatCurrency(group.totalBalance)}
                                                            </p>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-6 text-right">
                                                            <p className={`text-sm font-black ${theme.textHeading}`}>{formatDate(group.date)}</p>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <p className={`text-sm font-black text-emerald-600`}>{formatDate(group.paidDate)}</p>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <p className={`text-lg font-black text-emerald-600 tracking-tight`}>{formatCurrency(group.totalPaid)}</p>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="p-6 text-center">
                                                    <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? (activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600') + ' text-white rotate-180' : `${theme.pageBg} ${theme.textMuted} hover:${activeTab === 'pending' ? 'bg-red-600' : 'bg-emerald-600'} hover:text-white`}`}>
                                                        <ChevronDown size={20} />
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expandable Accordion Row */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} className="p-0 border-none bg-transparent">
                                                        <div className={`${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50/50'} border-t ${theme.borderLight} p-8 animate-in slide-in-from-top-2 duration-300 overflow-hidden`}>
                                                            <HistoryTimeline
                                                                onAction={(purchase) => {
                                                                    setSelectedPurchase(purchase);
                                                                    setIsSheetOpen(true);
                                                                }}
                                                                events={(() => {
                                                                    const events = [];
                                                                    const purchasesToProcess = activeTab === 'pending' ? group.purchases : [group];
                                                                    purchasesToProcess.forEach(purchase => {
                                                                        events.push({
                                                                            id: `purchase-${purchase.id}`,
                                                                            type: 'PURCHASE',
                                                                            date: purchase.date,
                                                                            orderNumber: purchase.purchaseNumber,
                                                                            amount: purchase.grandTotal,
                                                                            balance: purchase.balanceAmount || 0,
                                                                            order: purchase // Reusing 'order' prop name for HistoryTimeline
                                                                        });

                                                                        (purchase.payments || []).forEach(p => {
                                                                            events.push({
                                                                                id: `payment-${p.id}`,
                                                                                type: 'PAYMENT',
                                                                                date: p.date,
                                                                                orderNumber: purchase.purchaseNumber,
                                                                                amount: p.amount,
                                                                                method: p.method
                                                                            });
                                                                        });
                                                                    });
                                                                    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
                                                                })()}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="max-w-md mx-auto space-y-4">
                                            <div className={`w-20 h-20 ${theme.pageBg} rounded-full flex items-center justify-center mx-auto ${theme.textMuted}`}>
                                                {activeTab === 'pending' ? <Truck size={40} /> : <Receipt size={40} />}
                                            </div>
                                            <h3 className={`text-xl font-black ${theme.textHeading}`}>
                                                {activeTab === 'pending' ? 'All Clear' : 'No History Found'}
                                            </h3>
                                            <p className={`${theme.textMuted} font-medium`}>
                                                {activeTab === 'pending' 
                                                    ? 'There are no outstanding payouts to suppliers currently pending.' 
                                                    : 'No historical payout transactions were found.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PayOutSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                purchase={selectedPurchase}
                onSuccess={() => {
                    fetchData();
                }}
            />
        </div>
    );
};

export default PayOutList;
