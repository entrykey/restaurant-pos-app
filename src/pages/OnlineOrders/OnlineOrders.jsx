import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Globe, RefreshCw, ShoppingBag, X, Phone, MapPin, Calendar, Clock, CreditCard, MessageSquare, Check, Trash2 } from 'lucide-react';
import OnlineOrderCard from '../../components/OnlineOrderCard';
import { usePermission } from "../../auth/usePermission";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useOnlineOrders } from "./OnlineOrderContext";
import { api } from "../../services/api";
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const OnlineOrders = () => {
    const [onlineOrders, setOnlineOrders] = useState([]);
    const [onlineOrderTab, setOnlineOrderTab] = useState('pending');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { can } = usePermission();
    const { user } = useAuth();
    const { currentShopId, organization } = useApp();
    const onlineOrderContext = useOnlineOrders();

    // Dynamically resolve auth token and shopId from Context & Storage
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('auth_token');

    const shopId = useMemo(() => {
        if (currentShopId) return currentShopId;
        if (organization?._id || organization?.id) return String(organization._id || organization.id);
        
        const rawShop = user?.shop_id || user?.shopId || user?.shop;
        if (rawShop) {
            return typeof rawShop === 'object' ? String(rawShop._id || rawShop.id) : String(rawShop);
        }

        try {
            const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const sId = savedUser?.shopId || savedUser?.shop_id || savedUser?.shop;
            if (sId) return typeof sId === 'object' ? String(sId._id || sId.id) : String(sId);
        } catch {}

        return localStorage.getItem('selectedShopId') || null;
    }, [currentShopId, organization, user]);

    // Format currency
    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toFixed(2)}`;
    };

    // Extract context updater reference safely
    const setContextOnlineOrders = onlineOrderContext?.setOnlineOrders;

    // Fetch online orders from API
    const fetchOnlineOrders = useCallback(async (showFullLoader = false) => {
        if (!shopId) {
            console.error('No shop ID found for online orders');
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        try {
            if (showFullLoader) {
                setIsLoading(true);
            }
            setIsRefreshing(true);
            
            console.log('Fetching online orders with shopId:', shopId);
            
            // Use configured API instance with fallback headers
            const response = await api.get('/orders/online-orders', {
                params: { 
                    shopId,
                    limit: 100
                },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 10000
            }).catch(async (err) => {
                // Fallback to absolute URL if proxy base is different
                return await axios.get(`${API_URL}/orders/online-orders`, {
                    params: { shopId, limit: 100 },
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    timeout: 10000
                });
            });

            if (response.data?.success) {
                const fetchedOrders = response.data.orders || [];
                setOnlineOrders(fetchedOrders);

                // Update global OnlineOrderContext so sidebar badge updates accurately
                if (setContextOnlineOrders) {
                    setContextOnlineOrders(fetchedOrders);
                }
                console.log(`Found ${fetchedOrders.length} orders`);
            }
        } catch (error) {
            console.error('Error fetching online orders:', error);
            
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.error('Authentication failed when loading online orders');
                setIsLoading(false);
                setIsRefreshing(false);
                return;
            }
        } finally {
            setIsRefreshing(false);
            setIsLoading(false);
        }
    }, [shopId, token, setContextOnlineOrders]);

    // Initial load and periodic silent background refresh
    useEffect(() => {
        if (!shopId) {
            setIsLoading(false);
            return;
        }

        // Show full loader only on initial mount
        fetchOnlineOrders(true);

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                // Silent refresh in background without full-screen loading spinner
                fetchOnlineOrders(false);
            }
        }, 20000); // 20 seconds background refresh interval

        return () => {
            clearInterval(interval);
        };
    }, [shopId, fetchOnlineOrders]);

    // Start packing order
    const handleStartPacking = async (order) => {
        try {
            const response = await axios.post(
                `${API_URL}/orders/online-orders/${order._id}/start-packing`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                fetchOnlineOrders();
                alert('Order packing started!');
            }
        } catch (error) {
            console.error('Error starting packing:', error);
            alert('Failed to start packing. Please try again.');
        }
    };

    // Mark order as packed
    const handleMarkPacked = async (order) => {
        try {
            const response = await axios.post(
                `${API_URL}/orders/online-orders/${order._id}/mark-packed`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                fetchOnlineOrders();
                alert('Order marked as packed! Stock has been reduced.');
            }
        } catch (error) {
            console.error('Error marking as packed:', error);
            alert('Failed to mark as packed. Please try again.');
        }
    };

    // Mark order as delivered
    const handleMarkDelivered = async (order) => {
        try {
            const response = await axios.post(
                `${API_URL}/orders/online-orders/${order._id}/mark-delivered`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                fetchOnlineOrders();
                alert('Order marked as delivered!');
            }
        } catch (error) {
            console.error('Error marking as delivered:', error);
            alert('Failed to mark as delivered. Please try again.');
        }
    };

    const handleOpenPreview = (order) => {
        setSelectedOrder(order);
    };

    const handleClosePreview = () => {
        setSelectedOrder(null);
    };

    const filteredOrders = onlineOrders.filter((o) => {
        if (onlineOrderTab === "pending") return o.status === "pending";
        if (onlineOrderTab === "packing") return o.status === "preparing";
        if (onlineOrderTab === "packed") return o.status === "ready";
        return ["delivered", "cancelled", "rejected"].includes(o.status);
    });

    const pendingOnlineOrdersCount = onlineOrders.filter(o => o.status === 'pending').length;

    // Check permission - using ONLINE.ORDERS module
    const canView = can('ONLINE.ORDERS', 'MANAGE.ONLINE.ORDERS');
    
    if (!canView) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-12 bg-white rounded-[40px] shadow-xl border max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Globe size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 font-medium">You don't have permission to view online orders. Contact your administrator for access.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <RefreshCw size={48} className="text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-bold">Loading online orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <Globe size={28} />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">
                            Online Orders
                        </h2>
                    </div>
                    <p className="text-gray-500 font-bold flex items-center gap-2">
                        Manage orders from Zomato, Swiggy, and your Website
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="bg-white p-1 rounded-2xl shadow-md border flex">
                        {['pending', 'packing', 'packed', 'delivered'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setOnlineOrderTab(tab)}
                                className={`px-6 py-3 rounded-xl font-black text-sm transition-all relative flex items-center gap-2 ${onlineOrderTab === tab
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <span className="capitalize">{tab}</span>
                                {tab === 'pending' && pendingOnlineOrdersCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${onlineOrderTab === 'pending' ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
                                        }`}>
                                        {pendingOnlineOrdersCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => fetchOnlineOrders()} 
                        disabled={isRefreshing}
                        className="bg-white p-4 rounded-2xl border shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {filteredOrders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                        {filteredOrders.map((order) => (
                            <OnlineOrderCard
                                key={order.id}
                                order={order}
                                tab={onlineOrderTab}
                                onPreview={handleOpenPreview}
                                onStartPacking={handleStartPacking}
                                onMarkPacked={handleMarkPacked}
                                onMarkDelivered={handleMarkDelivered}
                                formatCurrency={formatCurrency}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-gray-50">
                            <ShoppingBag size={48} className="text-gray-200" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">No {onlineOrderTab} orders</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">
                            When you receive new orders from online platforms, they will appear here.
                        </p>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className={`p-8 flex justify-between items-center border-b ${selectedOrder.platform === 'Zomato' ? 'bg-red-50' :
                                selectedOrder.platform === 'Swiggy' ? 'bg-orange-50' : 'bg-indigo-50'
                            }`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg text-2xl font-black text-indigo-900">
                                    {selectedOrder.platform?.[0] || 'O'}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">Order Details</h3>
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                                        <span className="uppercase tracking-widest">{selectedOrder.platform}</span>
                                        <span>•</span>
                                        <span className="font-mono">{selectedOrder.id}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleClosePreview}
                                className="p-3 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Customer Info</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Check size={20} />
                                            </div>
                                            <span className="font-black text-lg text-gray-800">{selectedOrder.customer}</span>
                                        </div>
                                        <div className="flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Phone size={20} />
                                            </div>
                                            <span className="font-bold text-gray-600">{selectedOrder.phone}</span>
                                        </div>
                                        <div className="flex items-start gap-4 group">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                                                <MapPin size={20} />
                                            </div>
                                            <span className="font-bold text-gray-500 leading-relaxed">{selectedOrder.address}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Order Status</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <span className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                                <Calendar size={16} /> Date
                                            </span>
                                            <span className="font-black text-gray-700">{new Date(selectedOrder.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <span className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                                <Clock size={16} /> Time
                                            </span>
                                            <span className="font-black text-gray-700">{new Date(selectedOrder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <span className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                                <CreditCard size={16} /> Payment
                                            </span>
                                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {selectedOrder.paymentStatus || 'Paid'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Ordered Items</h4>
                                <div className="bg-gray-50 rounded-[32px] overflow-hidden border border-gray-100 text-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-white border-b border-gray-200">
                                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                <th className="px-6 py-4">Item</th>
                                                <th className="px-6 py-4 text-center">Qty</th>
                                                <th className="px-6 py-4 text-right">Price</th>
                                                <th className="px-6 py-4 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedOrder.items.map((item, i) => (
                                                <tr key={i} className="text-gray-700">
                                                    <td className="px-6 py-4 font-black">
                                                        {item.name}
                                                        {item.selectedExtras?.length > 0 && (
                                                            <p className="text-[10px] text-indigo-400 font-bold mt-1">
                                                                + {item.selectedExtras.map(e => e.name).join(', ')}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-3 py-1 bg-white rounded-lg border font-black text-gray-500 shadow-sm text-sm">
                                                            {item.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-gray-500">{formatCurrency(item.price)}</td>
                                                    <td className="px-6 py-4 text-right font-black text-gray-800">{formatCurrency(item.price * item.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-indigo-50/50 border-t-2 border-indigo-100">
                                            <tr>
                                                <td colSpan="3" className="px-6 py-6 text-right">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Grand Total</p>
                                                        <p className="text-gray-400 font-bold text-xs italic">Inclusive of taxes & platform fees</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-3xl font-black text-indigo-900">{formatCurrency(selectedOrder.total)}</span>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedOrder.note && (
                                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex gap-4">
                                    <MessageSquare className="text-orange-400 shrink-0" size={24} />
                                    <div>
                                        <h5 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Customer Note</h5>
                                        <p className="text-orange-900 font-bold italic">"{selectedOrder.note}"</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-gray-50 border-t flex gap-4">
                            {selectedOrder.status === 'pending' && (
                                <button
                                    onClick={() => {
                                        handleStartPacking(selectedOrder);
                                        handleClosePreview();
                                    }}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={20} /> Start Packing
                                </button>
                            )}
                            {selectedOrder.status === 'preparing' && (
                                <button
                                    onClick={() => {
                                        handleMarkPacked(selectedOrder);
                                        handleClosePreview();
                                    }}
                                    className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={20} /> Mark as Packed
                                </button>
                            )}
                            {selectedOrder.status === 'ready' && (
                                <button
                                    onClick={() => {
                                        handleMarkDelivered(selectedOrder);
                                        handleClosePreview();
                                    }}
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={20} /> Mark as Delivered
                                </button>
                            )}
                            {selectedOrder.status === 'delivered' && (
                                <div className="flex-1 text-center py-4">
                                    <span className="text-green-600 font-bold">✓ Order Delivered</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnlineOrders;
