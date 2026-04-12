import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dashboardService } from '../../services/api';
import { TrendingUp, TrendingDown, Banknote, Users, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const ShopDashboard = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const { organization, formatCurrency } = useApp();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Remove local currency variable as context formatCurrency handles it

    useEffect(() => {
        const fetchDashboard = async () => {
            const resolvedShopId = user?.shopId || user?.shop_id;
            try {
                if (resolvedShopId) {
                    console.log("ShopDashboard: Initiating fetch for shop:", resolvedShopId);
                    const result = await dashboardService.getShopDashboard(resolvedShopId);
                    setData(result);
                } else {
                    console.warn("ShopDashboard: No shop identifier found in user context", user);
                }
            } catch (error) {
                console.error("Failed to fetch shop dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600`}></div>
            </div>
        );
    }

    const stats = [
        { label: 'Total Sales', value: formatCurrency(data?.totalSales || 0), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', link: '/dashboard/sales' },
        { label: 'Today Profit', value: formatCurrency(data?.totalProfit || 0), icon: TrendingUp, color: (data?.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600', bg: (data?.totalProfit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50', link: '/dashboard/operating-expenses' },
        { label: 'Pay In (Customers)', value: formatCurrency(data?.payIn || 0), icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', link: '/dashboard/pay-in' },
        { label: 'Pay Out (Suppliers)', value: formatCurrency(data?.payOut || 0), icon: Banknote, color: 'text-red-600', bg: 'bg-red-50', link: '/dashboard/pay-out' },
    ];

    return (
        <div className="p-8 pb-12 space-y-8 w-full animate-in fade-in duration-500">

            <div>
                <h1 className={`text-3xl font-black ${theme.textHeading}`}>Shop Dashboard</h1>
                <p className={`${theme.textMuted} mt-1`}>Consolidated overview across all branches</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        onClick={() => stat.link && navigate(stat.link)}
                        className={`${theme.surfaceBg} p-6 rounded-[32px] shadow-sm border ${theme.borderLight} flex flex-col gap-4 ${stat.link ? `cursor-pointer hover:shadow-md transition-shadow hover:${theme.pageBg}` : ''}`}
                    >
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider`}>{stat.label}</p>
                            <p className={`text-2xl font-black ${theme.textHeading} mt-1`}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Branch Breakdown */}
            <div className={`${theme.surfaceBg} rounded-[40px] shadow-sm border ${theme.borderLight} overflow-hidden`}>
                <div className={`p-8 border-b ${theme.borderLight} flex justify-between items-center`}>
                    <h3 className={`text-xl font-black ${theme.textHeading}`}>Branch Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>
                                <th className="px-8 py-6">Branch Name</th>
                                <th className="px-8 py-6">Total Sales</th>
                                <th className="px-8 py-6">Estimated Profit</th>
                                <th className="px-8 py-6">Pay In</th>
                                <th className="px-8 py-6">Pay Out</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.borderLight}`}>
                            {data?.branchBreakdown?.map((branch, idx) => (
                                <tr key={idx} className={`hover:${theme.pageBg} transition-colors group`}>
                                    <td className="px-8 py-5">
                                        <div className={`font-bold ${theme.textPrimary}`}>{branch.branchName}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`font-black ${theme.textPrimary}`}>{formatCurrency(branch.sales)}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-black text-green-600">{formatCurrency(branch.profit)}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-black text-orange-600">{formatCurrency(branch.payIn)}</div>
                                    </td>
                                    <td className="px-8 py-5 text-red-500 font-black">
                                        {formatCurrency(branch.payOut)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ShopDashboard;
