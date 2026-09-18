import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { shopService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
    Building2,
    Plus,
    TrendingUp,
    Store,
    ShoppingCart,
    Package,
    Settings,
    ArrowUpRight,
    CheckCircle2,
    BarChart3,
    Sparkles,
    Wallet
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/format';
import AddShopModal from './AddShopModal';

const OwnerDashboard = () => {
    const { user, login } = useAuth();
    const { theme } = useTheme();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const toShopSegment = (shop) => {
        const raw = String(shop?.slug || shop?.name || "").trim().toLowerCase();
        if (!raw) return "shop";
        return raw
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "shop";
    };

    const fetchShops = async () => {
        try {
            setLoading(true);
            const userId = user?.id || user?._id;
            if (!userId) return;
            const data = await shopService.getShopsByOwner(userId);
            const rawShops = Array.isArray(data) ? data : (data?.data || []);

            const currentUserId = String(userId || '');
            const currentUserEmail = String(user?.email || '').trim().toLowerCase();

            // Strict owner validation filter to prevent other owners' shops from showing up
            const myShopsOnly = rawShops.filter(s => {
                if (!s) return false;
                const shopOwnerId = String(
                    s.user_id?._id || s.user_id?.id || s.user_id ||
                    s.ownerId?._id || s.ownerId?.id || s.ownerId ||
                    s.owner?._id || s.owner?.id || s.owner || ''
                );
                const shopOwnerEmail = String(
                    s.ownerEmail || s.user_id?.email || s.ownerId?.email || s.owner?.email || ''
                ).trim().toLowerCase();

                if (currentUserId && shopOwnerId && currentUserId === shopOwnerId) return true;
                if (currentUserEmail && shopOwnerEmail && currentUserEmail === shopOwnerEmail) return true;
                // Reject if owner ID or owner email is explicitly present on shop but does not match logged-in owner
                if (shopOwnerId || shopOwnerEmail) return false;
                return true;
            });

            setShops(myShopsOnly);
        } catch (error) {
            console.error("Failed to fetch owner shops:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, [user?.id, user?._id, user?.email]);

    const handleShopAdded = () => {
        setIsAddModalOpen(false);
        fetchShops();
    };

    // Calculate Portfolio Summaries
    const portfolioSummary = useMemo(() => {
        if (!shops || shops.length === 0) return { totalRevenue: 0, totalProfit: 0, totalPayIn: 0, totalPayOut: 0, activeCount: 0 };
        return shops.reduce((acc, s) => {
            acc.totalRevenue += Number(s.todayRevenue || 0);
            acc.totalProfit += Number(s.todayProfit || 0);
            acc.totalPayIn += Number(s.payIn || 0);
            acc.totalPayOut += Number(s.payOut || 0);
            if (s.status === 'ACTIVE') acc.activeCount += 1;
            return acc;
        }, { totalRevenue: 0, totalProfit: 0, totalPayIn: 0, totalPayOut: 0, activeCount: 0 });
    }, [shops]);

    const switchAndNavigate = async (shopId, targetPath) => {
        try {
            setLoading(true);
            const shop = shops.find((s) => String(s._id) === String(shopId));
            const shopSegment = toShopSegment(shop);
            const scopedPath = `/${shopSegment}${targetPath}`;

            // Clear previous shop-scoped storage items to prevent permission / module bleed
            localStorage.removeItem("pos_activeBranchId");
            localStorage.removeItem("permissions");
            localStorage.removeItem("pos_enabledModules");
            localStorage.removeItem("pos_businessType");
            localStorage.removeItem("pos_businessSubtype");
            localStorage.removeItem("pos_active_tabs");
            localStorage.removeItem("pos_active_tab_id");
            localStorage.removeItem("pos_active_tabs_shop");
            localStorage.removeItem("subscription_notified");

            // Always call switchShop API to get fresh permissions, roles, modules & token for target shop
            const newAuthData = await shopService.switchShop(shopId);
            const newAccessToken = newAuthData.accessToken;

            if (newAccessToken) {
                localStorage.setItem('accessToken', newAccessToken);
            }

            const storageKey = "restaurant_pos_auth_v1";
            const currentStorageParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
            localStorage.setItem(storageKey, JSON.stringify({
                ...currentStorageParams,
                user: { ...newAuthData.user, accessToken: newAccessToken }
            }));

            login({ ...newAuthData.user, accessToken: newAccessToken });

            // Hard redirect to target shop URL so all React contexts & permission hooks re-mount cleanly
            window.location.href = scopedPath;
        } catch (err) {
            console.error("Failed to switch shop context:", err);
            const shop = shops.find((s) => String(s._id) === String(shopId));
            const shopSegment = toShopSegment(shop);
            window.location.href = `/${shopSegment}${targetPath}`;
        }
    };

    const handleShopClick = (shopId) => {
        switchAndNavigate(shopId, '/dashboard');
    };

    const handleStatClick = (e, shopId, targetPath) => {
        e.stopPropagation();
        switchAndNavigate(shopId, targetPath);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50/50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">Loading Owner Portfolio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-4 sm:p-6 md:p-8 pb-16 space-y-8 min-h-screen ${theme.pageBg} font-sans`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                    <Building2 size={240} />
                </div>
                <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={12} className="text-amber-300" /> Executive Business Command
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mt-2">
                        Welcome back, {user?.name || user?.username || 'Owner'}
                    </h1>
                    <p className="text-xs sm:text-sm text-indigo-200/90 font-medium">
                        Managing {shops.length} business {shops.length === 1 ? 'outlet' : 'outlets'} • {portfolioSummary.activeCount} active & operational
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span>Add New Shop</span>
                    </button>
                </div>
            </div>

            {/* Portfolio Summary Widgets */}
            {shops.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                    <div className={`${theme.surfaceBg} border ${theme.borderLight} p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Portfolio Revenue</span>
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                        <p className={`text-lg sm:text-2xl font-black ${theme.textHeading}`}>
                            {formatCurrency(portfolioSummary.totalRevenue)}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Today's total sales
                        </p>
                    </div>

                    <div className={`${theme.surfaceBg} border ${theme.borderLight} p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Portfolio Profit</span>
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                <BarChart3 size={16} />
                            </div>
                        </div>
                        <p className={`text-lg sm:text-2xl font-black ${portfolioSummary.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(portfolioSummary.totalProfit)}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Est. Net Profit
                        </p>
                    </div>

                    <div className={`${theme.surfaceBg} border ${theme.borderLight} p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Total Outlets</span>
                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                <Store size={16} />
                            </div>
                        </div>
                        <p className={`text-lg sm:text-2xl font-black ${theme.textHeading}`}>
                            {shops.length} <span className="text-xs font-bold text-indigo-500">Shops</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                            {portfolioSummary.activeCount} Active Outlets
                        </p>
                    </div>

                    <div className={`${theme.surfaceBg} border ${theme.borderLight} p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Net Cashflow</span>
                            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                                <Wallet size={16} />
                            </div>
                        </div>
                        <p className={`text-lg sm:text-2xl font-black ${theme.textHeading}`}>
                            {formatCurrency(portfolioSummary.totalPayIn - portfolioSummary.totalPayOut)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                            PayIn: {formatCurrency(portfolioSummary.totalPayIn)}
                        </p>
                    </div>
                </div>
            )}

            {/* Shop Grid */}
            {shops.length === 0 ? (
                <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed ${theme.inputBorder} ${theme.surfaceBg}`}>
                    <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-inner">
                        <Store size={40} />
                    </div>
                    <h3 className={`text-xl font-black ${theme.textHeading} mb-2`}>No Shops in Portfolio</h3>
                    <p className={`${theme.textMuted} max-w-md text-xs sm:text-sm mb-6`}>
                        You haven't registered any shops under your owner account yet. Add your first outlet to start tracking live POS sales and inventory.
                    </p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Add First Shop
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {shops.map(shop => (
                        <div
                            key={shop._id}
                            onClick={() => handleShopClick(shop._id)}
                            className={`${theme.surfaceBg} rounded-3xl border ${theme.borderLight} shadow-sm hover:shadow-xl transition-all duration-300 p-5 sm:p-6 flex flex-col group cursor-pointer hover:-translate-y-1 relative overflow-hidden`}
                        >
                            {/* Card Top Row */}
                            <div className="flex justify-between items-start mb-5 gap-3">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden border border-white/20">
                                        {shop.logoUrl ? (
                                            <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" />
                                        ) : (
                                            shop.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-xl font-black ${theme.textHeading} truncate group-hover:text-indigo-600 transition-colors`}>
                                                {shop.name}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 uppercase tracking-tight">
                                                {shop.businessType?.displayString || shop.businessType || 'Business'}
                                            </span>
                                            {shop.subType?.displayString && (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-tight">
                                                    {shop.subType.displayString}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border uppercase tracking-wider ${
                                        shop.status === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                                            : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/60 dark:text-red-400'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${shop.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                        {shop.status}
                                    </span>
                                </div>
                            </div>

                            {/* Stat Chips */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                                <div className={`p-3 rounded-2xl ${theme.sectionBg} border ${theme.borderLight}`}>
                                    <p className={`text-[9px] font-black ${theme.textMuted} mb-0.5 flex items-center gap-1 uppercase tracking-tight`}>
                                        <TrendingUp size={12} className="text-indigo-500" /> Revenue
                                    </p>
                                    <p className={`text-base font-black ${theme.textHeading} truncate`}>
                                        {formatCurrency(shop.todayRevenue || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>

                                <div className={`p-3 rounded-2xl ${theme.sectionBg} border ${theme.borderLight}`}>
                                    <p className={`text-[9px] font-black ${theme.textMuted} mb-0.5 flex items-center gap-1 uppercase tracking-tight`}>
                                        <BarChart3 size={12} className="text-emerald-500" /> Profit
                                    </p>
                                    <p className={`text-base font-black ${shop.todayProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'} truncate`}>
                                        {formatCurrency(shop.todayProfit || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>

                                <div
                                    onClick={(e) => handleStatClick(e, shop._id, '/dashboard/pay-in')}
                                    className={`p-3 rounded-2xl ${theme.sectionBg} border ${theme.borderLight} hover:border-orange-300 dark:hover:border-orange-700 transition-colors group/stat`}
                                >
                                    <p className="text-[9px] font-black text-orange-500 mb-0.5 flex items-center justify-between uppercase tracking-tight">
                                        <span>Pay In</span>
                                        <ArrowUpRight size={10} className="group-hover/stat:translate-x-0.5 transition-transform" />
                                    </p>
                                    <p className="text-base font-black text-orange-600 dark:text-orange-400 truncate">
                                        {formatCurrency(shop.payIn || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>

                                <div
                                    onClick={(e) => handleStatClick(e, shop._id, '/dashboard/pay-out')}
                                    className={`p-3 rounded-2xl ${theme.sectionBg} border ${theme.borderLight} hover:border-red-300 dark:hover:border-red-700 transition-colors group/stat`}
                                >
                                    <p className="text-[9px] font-black text-red-500 mb-0.5 flex items-center justify-between uppercase tracking-tight">
                                        <span>Pay Out</span>
                                        <ArrowUpRight size={10} className="group-hover/stat:translate-x-0.5 transition-transform" />
                                    </p>
                                    <p className="text-base font-black text-red-600 dark:text-red-400 truncate">
                                        {formatCurrency(shop.payOut || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div className={`rounded-2xl p-3 sm:p-4 border ${theme.borderLight} ${theme.sectionBg} mb-4 flex-1`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} flex items-center gap-1.5`}>
                                        <BarChart3 size={13} className="text-indigo-500" /> Sales Trend (7 Days)
                                    </h4>
                                </div>
                                <div className="h-[140px] sm:h-[160px] w-full">
                                    {shop.recentSalesData && shop.recentSalesData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={shop.recentSalesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id={`colorSales-${shop._id}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id={`colorProfit-${shop._id}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="_id" tickFormatter={(tick) => tick.split('-').slice(1).join('/')} stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis width={45} tickFormatter={(tick) => `${tick}`} stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    formatter={(value, name) => [formatCurrency(value, shop.defaultCurrencyCode || 'INR'), name === 'totalSales' ? 'Revenue' : 'Profit']}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '11px' }}
                                                />
                                                <Area type="monotone" name="totalSales" dataKey="totalSales" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill={`url(#colorSales-${shop._id})`} />
                                                <Area type="monotone" name="totalProfit" dataKey="totalProfit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill={`url(#colorProfit-${shop._id})`} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
                                            No sales data yet for this period
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Action Navigation Bar */}
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                <button
                                    type="button"
                                    onClick={(e) => handleStatClick(e, shop._id, '/takeaway')}
                                    className="py-2 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-indigo-100 dark:border-indigo-900/40 truncate"
                                    title="Open Direct Sale / POS"
                                >
                                    <ShoppingCart size={12} /> <span className="hidden sm:inline">Direct POS</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleStatClick(e, shop._id, '/inventory')}
                                    className="py-2 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-emerald-100 dark:border-emerald-900/40 truncate"
                                    title="Manage Stock & Menu"
                                >
                                    <Package size={12} /> <span className="hidden sm:inline">Stock</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleStatClick(e, shop._id, '/sales')}
                                    className="py-2 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-blue-100 dark:border-blue-900/40 truncate"
                                    title="View Sales History"
                                >
                                    <TrendingUp size={12} /> <span className="hidden sm:inline">Sales</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleStatClick(e, shop._id, '/settings')}
                                    className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 truncate"
                                    title="Shop Settings"
                                >
                                    <Settings size={12} /> <span className="hidden sm:inline">Settings</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-transparent w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl no-scrollbar">
                        <AddShopModal
                            onClose={() => setIsAddModalOpen(false)}
                            onSuccess={handleShopAdded}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;
