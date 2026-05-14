import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { shopService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Building2, Plus, TrendingUp, Store } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/format';
import AddShopModal from './AddShopModal';

const OwnerDashboard = () => {
    const { user, login } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
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
            // Assuming the login user id is stored in user.id or user._id
            const userId = user?.id || user?._id;
            if (!userId) return;
            const data = await shopService.getShopsByOwner(userId);
            setShops(data);
        } catch (error) {
            console.error("Failed to fetch owner shops:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, [user]);

    const handleShopAdded = () => {
        setIsAddModalOpen(false);
        fetchShops();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${theme.buttonBg.replace('bg-', 'border-')}`}></div>
            </div>
        );
    }
    const handleStatClick = async (e, shopId, targetPath) => {
        e.stopPropagation(); // Prevent trigger handleShopClick
        try {
            const shop = shops.find((s) => String(s._id) === String(shopId));
            const shopSegment = toShopSegment(shop);
            const scopedTargetPath = `/${shopSegment}${targetPath}`;

            if ((user?.shopId || user?.shop_id) === shopId) {
                navigate(scopedTargetPath);
                return;
            }

            // Perform actual shop switch so tokens match the new shop
            const newAuthData = await shopService.switchShop(shopId);
            const newAccessToken = newAuthData.accessToken;

            localStorage.setItem('accessToken', newAccessToken);

            const storageKey = "restaurant_pos_auth_v1";
            const currentStorageParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
            localStorage.setItem(storageKey, JSON.stringify({
                ...currentStorageParams,
                user: { ...newAuthData.user, accessToken: newAccessToken }
            }));

            login({ ...newAuthData.user, accessToken: newAccessToken });

            // Small timeout to allow context to update before navigation
            setTimeout(() => {
                navigate(scopedTargetPath);
            }, 50);

        } catch (err) {
            console.error("Failed to switch shop context for stat click:", err);
            const shop = shops.find((s) => String(s._id) === String(shopId));
            const shopSegment = toShopSegment(shop);
            const scopedTargetPath = `/${shopSegment}${targetPath}`;
            navigate(scopedTargetPath, { state: { shopId } });
        }
    };

    const handleShopClick = async (shopId) => {
        try {
            const shop = shops.find((s) => String(s._id) === String(shopId));
            const shopSegment = toShopSegment(shop);

            if ((user?.shopId || user?.shop_id) === shopId) {
                navigate(`/${shopSegment}/dashboard`);
                return;
            }

            // Perform actual shop switch so tokens match the new shop
            const newAuthData = await shopService.switchShop(shopId);
            const newAccessToken = newAuthData.accessToken;

            localStorage.setItem('accessToken', newAccessToken);

            const storageKey = "restaurant_pos_auth_v1";
            const currentStorageParams = JSON.parse(localStorage.getItem(storageKey) || '{}');
            localStorage.setItem(storageKey, JSON.stringify({
                ...currentStorageParams,
                user: { ...newAuthData.user, accessToken: newAccessToken }
            }));

            login({ ...newAuthData.user, accessToken: newAccessToken });

            // Small timeout to allow context to update before navigation
            setTimeout(() => {
                navigate(`/${shopSegment}/dashboard`);
            }, 50);

        } catch (err) {
            console.error("Failed to switch shop context from dashboard:", err);
            // Fallback to simple navigation if switch fails
            const shop = shops.find((s) => String(s._id) === String(shopId));
            const shopSegment = toShopSegment(shop);
            navigate(`/${shopSegment}/dashboard`, { state: { shopId } });
        }
    };

    return (
        <div className="p-6 md:p-8 pb-12 space-y-8 w-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-3xl font-black ${theme.textHeading}`}>Owner Dashboard</h1>
                    <p className={`text-sm ${theme.textSecondary} mt-1`}>Manage your business portfolio</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 ${theme.buttonBg} ${theme.buttonText}`}
                >
                    <Plus size={20} />
                    <span>Add New Shop</span>
                </button>
            </div>

            {shops.length === 0 ? (
                <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed ${theme.inputBorder} ${theme.cardBg}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${theme.sidebarLogoBg} ${theme.sidebarLogoText}`}>
                        <Store size={40} />
                    </div>
                    <h3 className={`text-xl font-bold ${theme.textHeading} mb-2`}>No Shops Found</h3>
                    <p className={`${theme.textSecondary} max-w-md`}>You haven't registered any shops yet. Click the button above to add your first shop to the portfolio.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {shops.map(shop => (
                        <div
                            key={shop._id}
                            onClick={() => handleShopClick(shop._id)}
                            className={`rounded-3xl shadow-lg border p-6 flex flex-col transition-all hover:shadow-xl cursor-pointer hover:-translate-y-1 ${theme.cardBg} ${theme.inputBorder}`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${theme.sidebarLogoBg} ${theme.sidebarLogoText}`}>
                                        {shop.logoUrl ? (
                                            <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover rounded-2xl" />
                                        ) : (
                                            shop.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black ${theme.textHeading}`}>{shop.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-1 rounded-lg font-bold bg-indigo-50 text-indigo-600 border border-indigo-100`}>
                                                {shop.businessType?.displayString || 'Business'}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-lg font-bold bg-emerald-50 text-emerald-600 border border-emerald-100`}>
                                                {shop.subType?.displayString || 'Subtype'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${shop.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    <div className={`w-2 h-2 rounded-full ${shop.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    {shop.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className={`p-4 rounded-2xl ${theme.inputBg} border ${theme.inputBorder}`}>
                                    <p className={`text-[10px] font-black ${theme.textSecondary} mb-1 flex items-center gap-2 uppercase tracking-tight`}>
                                        <TrendingUp size={14} className="text-indigo-500" /> Daily Revenue
                                    </p>
                                    <p className={`text-xl font-black ${theme.textHeading}`}>
                                        {formatCurrency(shop.todayRevenue || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-2xl ${theme.inputBg} border ${theme.inputBorder}`}>
                                    <p className={`text-[10px] font-black ${theme.textSecondary} mb-1 flex items-center gap-2 uppercase tracking-tight`}>
                                        <TrendingUp size={14} className="text-emerald-500" /> Daily Profit
                                    </p>
                                    <p className={`text-xl font-black ${shop.todayProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {formatCurrency(shop.todayProfit || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>
                                <div 
                                    onClick={(e) => handleStatClick(e, shop._id, '/dashboard/pay-in')}
                                    className={`p-4 rounded-2xl ${theme.inputBg} border ${theme.inputBorder} cursor-pointer hover:bg-orange-50 transition-colors group`}
                                >
                                    <p className={`text-[10px] font-black ${theme.textSecondary} mb-1 flex items-center gap-2 uppercase tracking-tight group-hover:text-orange-600`}>
                                        <TrendingUp size={14} className="text-orange-500" /> Pay In
                                    </p>
                                    <p className={`text-xl font-black text-orange-600`}>
                                        {formatCurrency(shop.payIn || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>
                                <div 
                                    onClick={(e) => handleStatClick(e, shop._id, '/dashboard/pay-out')}
                                    className={`p-4 rounded-2xl ${theme.inputBg} border ${theme.inputBorder} cursor-pointer hover:bg-red-50 transition-colors group`}
                                >
                                    <p className={`text-[10px] font-black ${theme.textSecondary} mb-1 flex items-center gap-2 uppercase tracking-tight group-hover:text-red-600`}>
                                        <TrendingUp size={14} className="text-red-500" /> Pay Out
                                    </p>
                                    <p className={`text-xl font-black text-red-600`}>
                                        {formatCurrency(shop.payOut || 0, shop.defaultCurrencyCode || 'INR')}
                                    </p>
                                </div>
                            </div>

                            <div className={`flex-1 rounded-2xl p-4 bg-white border shadow-sm ${theme.inputBorder} ${theme.textSecondary}`}>
                                <h4 className={`text-xs font-black uppercase tracking-wider mb-4 pl-2`}>Sales Trend (Last 7 Days)</h4>
                                <div className="h-[200px] w-full">
                                    {shop.recentSalesData && shop.recentSalesData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={shop.recentSalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id={`colorSales-${shop._id}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id={`colorProfit-${shop._id}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="_id" tickFormatter={(tick) => tick.split('-').slice(1).join('/')} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis width={60} tickFormatter={(tick) => formatCurrency(tick, shop.defaultCurrencyCode || 'INR').replace(/[0-9., ]/g, '') + tick} stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    formatter={(value, name) => [formatCurrency(value, shop.defaultCurrencyCode || 'INR'), name === 'totalSales' ? 'Revenue' : 'Profit']}
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                    labelStyle={{ color: '#000', fontWeight: 'bold' }}
                                                />
                                                <Area type="monotone" name="totalSales" dataKey="totalSales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill={`url(#colorSales-${shop._id})`} />
                                                <Area type="monotone" name="totalProfit" dataKey="totalProfit" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill={`url(#colorProfit-${shop._id})`} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm font-medium italic opacity-60">
                                            No sales data yet
                                        </div>
                                    )}
                                </div>
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
