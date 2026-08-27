import React, { useState, useEffect, useCallback } from "react";
import { Wallet, CheckCircle2, Clock, Filter, CreditCard, User, ShieldCheck, RefreshCw, AlertCircle, Calendar } from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import CommonSelect from "../../components/ui/CommonSelect";

const DeliverySettlement = () => {
    const { currentShopId } = useApp();
    const { user } = useAuth();
    const { theme } = useTheme();
    const shopId = currentShopId || user?.shopId || user?.shop_id;

    const [loading, setLoading] = useState(false);
    const [settlementData, setSettlementData] = useState([]);
    const [frequency, setFrequency] = useState("BY_DAY");
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [isSettling, setIsSettling] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const fetchSettlements = useCallback(async () => {
        if (!shopId) return;
        setLoading(true);
        try {
            const res = await api.get("/delivery/settlements", { params: { shopId } });
            if (res.data?.success) {
                setSettlementData(res.data.settlements || []);
                if (res.data.frequency) {
                    setFrequency(res.data.frequency);
                }
            }
        } catch (err) {
            console.error("Error fetching settlements:", err);
        } finally {
            setLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        fetchSettlements();
    }, [fetchSettlements]);

    const handleSettleModalOpen = (partner) => {
        setSelectedPartner(partner);
        setPaymentMethod("CASH");
    };

    const handleConfirmSettle = async () => {
        if (!selectedPartner || !shopId) return;
        setIsSettling(true);
        setMessage({ type: "", text: "" });

        try {
            const pendingOrderIds = selectedPartner.orders
                .filter(o => o.settlementStatus !== "SETTLED")
                .map(o => o._id);

            const res = await api.post("/delivery/settle", {
                shopId,
                partnerId: selectedPartner.partnerId,
                paymentMethod,
                orderIds: pendingOrderIds
            });

            if (res.data?.success) {
                setMessage({ type: "success", text: res.data.message });
                setSelectedPartner(null);
                await fetchSettlements();
            } else {
                setMessage({ type: "error", text: res.data?.message || "Failed to settle balance" });
            }
        } catch (err) {
            setMessage({ type: "error", text: err.response?.data?.message || "Settlement failed" });
        } finally {
            setIsSettling(false);
        }
    };

    const frequencyLabels = {
        BY_ORDER: "By Order",
        BY_DAY: "By Day",
        BY_WEEK: "By Week",
        BY_MONTH: "By Month"
    };

    return (
        <div className={`p-4 md:p-8 h-full flex flex-col ${theme.pageBg} space-y-6`}>
            
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm`}>
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/30">
                        <Wallet className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-black ${theme.textHeading}`}>Delivery Settlement & Collection</h1>
                        <p className={`text-sm font-medium ${theme.textSecondary}`}>
                            Settle customer collections and delivery fees with store delivery partners.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1.5 ${theme.inputBg} rounded-xl text-xs font-bold ${theme.textSecondary} flex items-center space-x-1 border ${theme.inputBorder}`}>
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span>Frequency: {frequencyLabels[frequency] || "By Day"}</span>
                    </div>
                    <button
                        onClick={fetchSettlements}
                        disabled={loading}
                        className={`p-2.5 ${theme.surfaceBg} border ${theme.borderLight} rounded-xl shadow-sm ${theme.textSecondary} hover:${theme.textHeading}`}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Notification message */}
            {message.text && (
                <div className={`p-4 rounded-xl flex items-center space-x-2 text-sm font-medium ${
                    message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{message.text}</span>
                </div>
            )}

            {/* Delivery Partner Ledgers */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className={`flex items-center justify-center p-12 ${theme.textSecondary}`}>
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading settlement ledgers...</span>
                    </div>
                ) : settlementData.length === 0 ? (
                    <div className={`text-center p-12 ${theme.surfaceBg} rounded-2xl border ${theme.borderLight}`}>
                        <ShieldCheck className={`w-12 h-12 ${theme.textMuted} mx-auto mb-3`} />
                        <p className={`font-bold ${theme.textHeading}`}>No delivery settlement records found</p>
                        <p className={`text-xs ${theme.textSecondary}`}>Completed order deliveries will appear here for payment settlement.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {settlementData.map((partner) => (
                            <div key={partner.partnerId} className={`${theme.surfaceBg} rounded-2xl border ${theme.borderLight} p-6 shadow-md space-y-4`}>
                                <div className={`flex justify-between items-start border-b ${theme.borderLight} pb-4`}>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg ${theme.textHeading}`}>{partner.partnerName}</h3>
                                            <p className={`text-xs ${theme.textSecondary}`}>{partner.partnerPhone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-semibold ${theme.textSecondary}`}>Total Delivered</span>
                                        <div className={`text-base font-black ${theme.textHeading}`}>{partner.totalOrders} Orders</div>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div className={`grid grid-cols-3 gap-3 p-3 ${theme.inputBg} rounded-xl text-center border ${theme.inputBorder}`}>
                                    <div>
                                        <span className={`text-[10px] uppercase font-bold ${theme.textSecondary}`}>Customer Cash</span>
                                        <div className={`text-sm font-black ${theme.textHeading}`}>₹{partner.totalCollected.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-emerald-500">Partner Fee</span>
                                        <div className="text-sm font-black text-emerald-600">₹{partner.totalDeliveryFeeEarned.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-blue-500">Shop Net Due</span>
                                        <div className="text-sm font-black text-blue-600 dark:text-blue-400">₹{partner.netShopBalance.toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Settle Action Button */}
                                {partner.pendingOrdersCount > 0 ? (
                                    <button
                                        onClick={() => handleSettleModalOpen(partner)}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
                                    >
                                        <Wallet className="w-5 h-5" />
                                        <span>Settle Balance (₹{partner.netShopBalance.toFixed(2)})</span>
                                    </button>
                                ) : (
                                    <div className="py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl text-center flex items-center justify-center space-x-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>All Orders Settled</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Settle Modal */}
            {selectedPartner && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className={`${theme.surfaceBg} rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border ${theme.borderLight}`}>
                        <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-3`}>
                            <h3 className={`font-bold text-lg ${theme.textHeading}`}>Confirm Delivery Settlement</h3>
                            <button onClick={() => setSelectedPartner(null)} className={`${theme.textSecondary} hover:${theme.textHeading}`}>✕</button>
                        </div>

                        <div className="space-y-2 text-sm">
                            <p className={theme.textSecondary}>
                                Settle collected customer balance with <strong className={theme.textHeading}>{selectedPartner.partnerName}</strong>.
                            </p>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-center space-y-1">
                                <span className="text-xs uppercase font-bold text-emerald-600">Net Amount to Receive by Shop</span>
                                <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">₹{selectedPartner.netShopBalance.toFixed(2)}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${theme.textSecondary}`}>Payment Method Used</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("CASH")}
                                    className={`py-3 rounded-xl font-bold text-sm border transition ${
                                        paymentMethod === "CASH" ? "bg-emerald-600 text-white border-emerald-600 shadow" : `${theme.inputBg} ${theme.textHeading} ${theme.inputBorder}`
                                    }`}
                                >
                                    Cash Payment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("UPI")}
                                    className={`py-3 rounded-xl font-bold text-sm border transition ${
                                        paymentMethod === "UPI" ? "bg-emerald-600 text-white border-emerald-600 shadow" : `${theme.inputBg} ${theme.textHeading} ${theme.inputBorder}`
                                    }`}
                                >
                                    UPI Transfer
                                </button>
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <button
                                onClick={() => setSelectedPartner(null)}
                                className={`flex-1 py-3 ${theme.inputBg} ${theme.textHeading} font-bold rounded-xl border ${theme.inputBorder}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSettle}
                                disabled={isSettling}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition"
                            >
                                {isSettling ? "Settling..." : "Mark as Settled"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliverySettlement;
