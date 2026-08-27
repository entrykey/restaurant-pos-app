import React, { useState, useEffect, useCallback, useRef } from "react";
import { Truck, Navigation, CheckCircle, Clock, Volume2, VolumeX, MapPin, Phone, User, Package, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const DeliveryManagement = () => {
    const { currentShopId } = useApp();
    const { user } = useAuth();
    const { theme } = useTheme();
    const shopId = currentShopId || user?.shopId || user?.shop_id;
    const currentUserId = user?._id || user?.id || user?.userId;

    const [activeTab, setActiveTab] = useState("requests"); // "requests", "active", "completed"
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSoundPlaying, setIsSoundPlaying] = useState(false);
    const [actionLoading, setActionLoading] = useState({});

    const audioContextRef = useRef(null);
    const soundIntervalRef = useRef(null);
    const soundTimeoutRef = useRef(null);
    const geoWatchIdRef = useRef(null);

    // Audio alarm generator using Web Audio API (Plays continuous chime tone)
    const startAlarmSound = useCallback(() => {
        try {
            if (isSoundPlaying) return;
            setIsSoundPlaying(true);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") {
                ctx.resume();
            }

            const playBeep = () => {
                if (!audioContextRef.current) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            };

            playBeep();
            soundIntervalRef.current = setInterval(playBeep, 1000);

            // Auto stop alarm after 1 minute (60 seconds)
            soundTimeoutRef.current = setTimeout(() => {
                stopAlarmSound();
            }, 60000);
        } catch (e) {
            console.error("Error starting alarm sound:", e);
        }
    }, [isSoundPlaying]);

    const stopAlarmSound = useCallback(() => {
        if (soundIntervalRef.current) {
            clearInterval(soundIntervalRef.current);
            soundIntervalRef.current = null;
        }
        if (soundTimeoutRef.current) {
            clearTimeout(soundTimeoutRef.current);
            soundTimeoutRef.current = null;
        }
        setIsSoundPlaying(false);
    }, []);

    // Cleanup audio & geo watch on unmount
    useEffect(() => {
        return () => {
            stopAlarmSound();
            if (geoWatchIdRef.current) {
                navigator.geolocation?.clearWatch(geoWatchIdRef.current);
            }
        };
    }, [stopAlarmSound]);

    // Fetch delivery requests
    const fetchDeliveryRequests = useCallback(async () => {
        if (!shopId) return;
        try {
            const res = await api.get("/delivery/requests", { params: { shopId } });
            if (res.data?.success) {
                const fetchedOrders = res.data.orders || [];
                setOrders(fetchedOrders);

                // Check if there are any unassigned REQUESTED delivery requests
                const hasPendingRequests = fetchedOrders.some(
                    o => o.deliveryRequestStatus === "REQUESTED" && (!o.deliveryBoyId || o.deliveryBoyId._id === currentUserId || o.deliveryBoyId === currentUserId)
                );

                if (hasPendingRequests) {
                    startAlarmSound();
                } else {
                    stopAlarmSound();
                }
            }
        } catch (err) {
            console.error("Error fetching delivery requests:", err);
        }
    }, [shopId, currentUserId, startAlarmSound, stopAlarmSound]);

    // Initial load & poll every 10 seconds
    useEffect(() => {
        if (!shopId) return;
        setLoading(true);
        fetchDeliveryRequests().finally(() => setLoading(false));

        const interval = setInterval(() => {
            fetchDeliveryRequests();
        }, 10000);

        return () => clearInterval(interval);
    }, [shopId, fetchDeliveryRequests]);

    // Live Geolocation Tracking for Delivery Boy
    useEffect(() => {
        if (!navigator.geolocation) return;

        const activeAssignedOrder = orders.find(
            o => (o.deliveryBoyId?._id === currentUserId || o.deliveryBoyId === currentUserId) &&
                 (o.deliveryRequestStatus === "ACCEPTED" || o.deliveryRequestStatus === "PICKED_UP")
        );

        if (activeAssignedOrder) {
            geoWatchIdRef.current = navigator.geolocation.watchPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    try {
                        await api.post("/delivery/location", {
                            orderId: activeAssignedOrder._id,
                            latitude,
                            longitude
                        });
                    } catch (err) {
                        console.log("Error updating location:", err);
                    }
                },
                (err) => console.log("Geolocation error:", err),
                { enableHighAccuracy: true, distanceFilter: 10 }
            );
        } else if (geoWatchIdRef.current) {
            navigator.geolocation.clearWatch(geoWatchIdRef.current);
            geoWatchIdRef.current = null;
        }
    }, [orders, currentUserId]);

    // Accept Delivery Request
    const handleAcceptRequest = async (orderId) => {
        if (!currentUserId) {
            alert("User session not found. Please log in again.");
            return;
        }
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        try {
            const res = await api.post(`/delivery/accept/${orderId}`, { userId: currentUserId });
            if (res.data?.success) {
                stopAlarmSound();
                await fetchDeliveryRequests();
                setActiveTab("active");
            } else {
                alert(res.data?.message || "Failed to accept request");
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error accepting request");
        } finally {
            setActionLoading(prev => ({ ...prev, [orderId]: false }));
        }
    };

    // Mark as Picked Up
    const handleMarkPickedUp = async (orderId) => {
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        try {
            const res = await api.post(`/delivery/pickup/${orderId}`);
            if (res.data?.success) {
                await fetchDeliveryRequests();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error marking picked up");
        } finally {
            setActionLoading(prev => ({ ...prev, [orderId]: false }));
        }
    };

    // Mark as Delivered
    const handleMarkDelivered = async (orderId) => {
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        try {
            const res = await api.post(`/delivery/deliver/${orderId}`);
            if (res.data?.success) {
                alert("Order marked as delivered! Please collect payment.");
                await fetchDeliveryRequests();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error marking delivered");
        } finally {
            setActionLoading(prev => ({ ...prev, [orderId]: false }));
        }
    };

    // Google Maps Navigation Helper
    const openGoogleMapsNav = (lat, lng, label) => {
        if (!lat || !lng) {
            alert(`Location coordinates not available for ${label}`);
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, "_blank");
    };

    // Filter orders by tab
    const requestOrders = orders.filter(o => o.deliveryRequestStatus === "REQUESTED");
    const activeOrders = orders.filter(o => o.deliveryRequestStatus === "ACCEPTED" || o.deliveryRequestStatus === "PICKED_UP");
    const completedOrders = orders.filter(o => o.deliveryRequestStatus === "DELIVERED");

    return (
        <div className={`p-4 md:p-8 h-full flex flex-col ${theme.pageBg} space-y-6`}>
            
            {/* Header Banner */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm`}>
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
                        <Truck className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-black ${theme.textHeading}`}>Delivery Management</h1>
                        <p className={`text-sm font-medium ${theme.textSecondary}`}>
                            Accept delivery requests, navigate to shop & customer, and track active deliveries.
                        </p>
                    </div>
                </div>

                {/* Alarm Sound Toggle */}
                {isSoundPlaying ? (
                    <button
                        onClick={stopAlarmSound}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-bold shadow-lg animate-bounce"
                    >
                        <VolumeX className="w-5 h-5" />
                        <span>Mute Alarm Alert</span>
                    </button>
                ) : (
                    <div className={`flex items-center space-x-2 px-3 py-1.5 ${theme.inputBg} border ${theme.inputBorder} ${theme.textSecondary} rounded-xl text-xs font-semibold`}>
                        <Volume2 className="w-4 h-4 text-emerald-500" />
                        <span>Sound Notifications Ready</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className={`flex space-x-2 ${theme.inputBg} p-1.5 rounded-xl w-fit border ${theme.inputBorder}`}>
                <button
                    onClick={() => setActiveTab("requests")}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center space-x-2 ${
                        activeTab === "requests" ? `${theme.surfaceBg} ${theme.textHeading} shadow` : theme.textSecondary
                    }`}
                >
                    <span>Delivery Requests</span>
                    {requestOrders.length > 0 && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs font-black">
                            {requestOrders.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("active")}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center space-x-2 ${
                        activeTab === "active" ? `${theme.surfaceBg} ${theme.textHeading} shadow` : theme.textSecondary
                    }`}
                >
                    <span>Assigned Deliveries</span>
                    {activeOrders.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-black">
                            {activeOrders.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("completed")}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition ${
                        activeTab === "completed" ? `${theme.surfaceBg} ${theme.textHeading} shadow` : theme.textSecondary
                    }`}
                >
                    Completed ({completedOrders.length})
                </button>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className={`flex items-center justify-center p-12 ${theme.textSecondary}`}>
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading requests...</span>
                    </div>
                ) : activeTab === "requests" ? (
                    requestOrders.length === 0 ? (
                        <div className={`text-center p-12 ${theme.surfaceBg} rounded-2xl border ${theme.borderLight}`}>
                            <Truck className={`w-12 h-12 ${theme.textMuted} mx-auto mb-3`} />
                            <p className={`font-bold ${theme.textHeading}`}>No pending delivery requests</p>
                            <p className={`text-xs ${theme.textSecondary}`}>New delivery requests will appear here with an alert sound.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {requestOrders.map((ord) => (
                                <div key={ord._id} className={`${theme.surfaceBg} rounded-2xl border-2 border-amber-400 dark:border-amber-600 p-5 shadow-lg space-y-4 relative`}>
                                    <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-3`}>
                                        <span className={`font-black text-sm ${theme.textHeading}`}>{ord.orderNumber}</span>
                                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                            Request Pending
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className={`flex items-center space-x-2 ${theme.textHeading}`}>
                                            <User className="w-4 h-4 text-blue-500" />
                                            <span className="font-semibold">{ord.customerId?.name || "Customer"}</span>
                                        </div>
                                        <div className={`flex items-center space-x-2 ${theme.textSecondary}`}>
                                            <Phone className="w-4 h-4" />
                                            <span>{ord.customerId?.phone || "N/A"}</span>
                                        </div>
                                        <div className={`flex items-start space-x-2 ${theme.textSecondary}`}>
                                            <MapPin className="w-4 h-4 text-rose-500 mt-1 shrink-0" />
                                            <span className="text-xs line-clamp-2">
                                                {[ord.deliveryAddress?.street, ord.deliveryAddress?.city].filter(Boolean).join(", ")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`${theme.inputBg} p-3 rounded-xl flex justify-between items-center text-xs font-semibold ${theme.textHeading}`}>
                                        <span>Delivery Fee: ₹{ord.deliveryFee || 0}</span>
                                        <span className="text-blue-600 dark:text-blue-400">Dist: {ord.distanceKm || 0} km</span>
                                    </div>

                                    <button
                                        onClick={() => handleAcceptRequest(ord._id)}
                                        disabled={actionLoading[ord._id]}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition active:scale-95 disabled:opacity-50"
                                    >
                                        {actionLoading[ord._id] ? "Accepting..." : "Accept Delivery Request"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                ) : activeTab === "active" ? (
                    activeOrders.length === 0 ? (
                        <div className={`text-center p-12 ${theme.surfaceBg} rounded-2xl border ${theme.borderLight}`}>
                            <Package className={`w-12 h-12 ${theme.textMuted} mx-auto mb-3`} />
                            <p className={`font-bold ${theme.textHeading}`}>No active assigned deliveries</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeOrders.map((ord) => {
                                const shopLat = ord.branchId?.location?.coordinates?.[1] || ord.branchId?.address?.latitude;
                                const shopLng = ord.branchId?.location?.coordinates?.[0] || ord.branchId?.address?.longitude;
                                const custLat = ord.deliveryAddress?.latitude;
                                const custLng = ord.deliveryAddress?.longitude;

                                return (
                                    <div key={ord._id} className={`${theme.surfaceBg} rounded-2xl border ${theme.borderLight} p-5 shadow-lg space-y-4`}>
                                        <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-3`}>
                                            <span className={`font-black text-sm ${theme.textHeading}`}>{ord.orderNumber}</span>
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                                ord.deliveryRequestStatus === "PICKED_UP" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                            }`}>
                                                {ord.deliveryRequestStatus === "PICKED_UP" ? "Out for Delivery" : "Available for Pickup"}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className={`font-bold ${theme.textHeading}`}>{ord.customerId?.name} ({ord.customerId?.phone})</div>
                                            <div className={`text-xs ${theme.textSecondary} line-clamp-2`}>
                                                {[ord.deliveryAddress?.street, ord.deliveryAddress?.city].filter(Boolean).join(", ")}
                                            </div>
                                        </div>

                                        {/* Navigation Buttons */}
                                        <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${theme.borderLight}`}>
                                            <button
                                                onClick={() => openGoogleMapsNav(shopLat, shopLng, "Shop Location")}
                                                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 border border-blue-200"
                                            >
                                                <Navigation className="w-3.5 h-3.5" />
                                                <span>Navigate Shop</span>
                                            </button>
                                            <button
                                                onClick={() => openGoogleMapsNav(custLat, custLng, "Customer Address")}
                                                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 border border-emerald-200"
                                            >
                                                <Navigation className="w-3.5 h-3.5" />
                                                <span>Navigate Customer</span>
                                            </button>
                                        </div>

                                        {/* State Change Buttons */}
                                        {ord.deliveryRequestStatus === "ACCEPTED" && (
                                            <button
                                                onClick={() => handleMarkPickedUp(ord._id)}
                                                disabled={actionLoading[ord._id]}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
                                            >
                                                Mark Order as Picked Up
                                            </button>
                                        )}

                                        {ord.deliveryRequestStatus === "PICKED_UP" && (
                                            <button
                                                onClick={() => handleMarkDelivered(ord._id)}
                                                disabled={actionLoading[ord._id]}
                                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"
                                            >
                                                Mark as Delivered (Collect Payment)
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {completedOrders.map((ord) => (
                            <div key={ord._id} className={`${theme.surfaceBg} rounded-2xl border ${theme.borderLight} p-4 opacity-75`}>
                                <div className={`font-bold text-sm ${theme.textHeading}`}>{ord.orderNumber}</div>
                                <div className={`text-xs ${theme.textSecondary}`}>Delivered to: {ord.customerId?.name}</div>
                                <div className="text-xs font-semibold text-emerald-600 mt-2">Completed & Payment Collected</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryManagement;
