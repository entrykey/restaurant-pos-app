import React, { useState, useEffect, useCallback } from "react";
import { Truck, Save, RefreshCw, CheckCircle, ShieldAlert, Banknote, Clock, MapPin } from "lucide-react";
import { settingService, roleService } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import CommonSelect from "../../components/ui/CommonSelect";

const DeliverySettings = ({ currentUser }) => {
    const { currentShopId } = useApp();
    const { theme } = useTheme();
    const shopId = currentShopId || currentUser?.shopId || currentUser?.shop_id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [shopRoles, setShopRoles] = useState([]);

    const [deliverySettings, setDeliverySettings] = useState({
        deliveryEnabled: true,
        deliverableRadiusKm: 5,
        autoAccept: false,
        deliveryBoyRoleId: "",
        deliveryFeePerKm: 1,
        settlementFrequency: "BY_DAY"
    });

    const fetchRoles = useCallback(async () => {
        try {
            if (!shopId) return;
            let rolesList = [];

            try {
                const res = await roleService.getRolesByShopId(shopId);
                rolesList = Array.isArray(res) ? res : (res?.data || []);
            } catch (e) {
                console.log("getRolesByShopId failed, trying getRoles with shopId filter", e);
            }

            if (!rolesList || rolesList.length === 0) {
                try {
                    const res = await roleService.getRoles({ shopId });
                    rolesList = Array.isArray(res) ? res : (res?.data || []);
                } catch (e) {
                    console.log("getRoles with shopId filter failed", e);
                }
            }

            if (!rolesList || rolesList.length === 0) {
                try {
                    const res = await roleService.getRoles();
                    rolesList = Array.isArray(res) ? res : (res?.data || []);
                } catch (e) {
                    console.log("getRoles general failed", e);
                }
            }

            setShopRoles(rolesList || []);
        } catch (err) {
            console.error("Failed to fetch shop roles:", err);
        }
    }, [shopId]);

    const fetchDeliverySettings = useCallback(async () => {
        if (!shopId) return;
        setLoading(true);
        try {
            const data = await settingService.getSettingByKey("DELIVERY_SETTINGS", shopId);
            if (data && data.value) {
                setDeliverySettings(prev => ({
                    ...prev,
                    ...data.value
                }));
            }
        } catch (err) {
            console.log("No existing delivery settings found, using defaults.", err);
        } finally {
            setLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        fetchDeliverySettings();
        fetchRoles();
    }, [fetchDeliverySettings, fetchRoles]);

    const handleChange = (key, value) => {
        setDeliverySettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = async () => {
        if (!shopId) {
            setMessage({ type: "error", text: "Shop context not found" });
            return;
        }

        setSaving(true);
        setMessage({ type: "", text: "" });

        try {
            await settingService.updateSetting("DELIVERY_SETTINGS", {
                shopId,
                key: "DELIVERY_SETTINGS",
                displayString: "Delivery Settings",
                description: "Settings for store delivery options, radius, auto accept, and settlement frequency",
                type: "json",
                value: deliverySettings
            });

            setMessage({ type: "success", text: "Delivery settings saved successfully!" });
            setTimeout(() => setMessage({ type: "", text: "" }), 4000);
        } catch (err) {
            console.error("Error saving delivery settings:", err);
            setMessage({ type: "error", text: err.message || "Failed to save delivery settings" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-12 ${theme.textSecondary}`}>
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading Delivery Settings...</span>
            </div>
        );
    }

    const defaultFallbackRoles = [
        { label: "Delivery Partner / Driver (DELIVERY_PARTNER)", value: "DELIVERY_PARTNER" },
        { label: "Delivery Boy (DELIVERY_BOY)", value: "DELIVERY_BOY" },
        { label: "Staff (STAFF)", value: "STAFF" },
        { label: "Manager (MANAGER)", value: "MANAGER" }
    ];

    const fetchedRoleOpts = shopRoles.map(r => ({
        label: `${r.name || r.roleName || 'Role'} (${r.code || r._id})`,
        value: r._id || r.id || r.code
    }));

    const roleOptions = [
        { label: "-- Select Delivery Boy Role --", value: "" },
        ...(fetchedRoleOpts.length > 0 ? fetchedRoleOpts : defaultFallbackRoles)
    ];

    const frequencyOptions = [
        { label: "By Order", value: "BY_ORDER" },
        { label: "By Day (Default)", value: "BY_DAY" },
        { label: "By Week", value: "BY_WEEK" },
        { label: "By Month", value: "BY_MONTH" }
    ];

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div className={`flex items-center justify-between ${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm`}>
                <div className="flex items-center space-x-3">
                    <div className={`p-3 ${theme.primaryIconBg} ${theme.primaryIconText} rounded-xl`}>
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${theme.textHeading}`}>Delivery Settings</h2>
                        <p className={`text-sm ${theme.textSecondary}`}>
                            Configure store delivery availability, radius, auto-acceptance, partner roles, and settlement frequency.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow transition disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{saving ? "Saving..." : "Save Settings"}</span>
                </button>
            </div>

            {/* Notification message */}
            {message.text && (
                <div className={`p-4 rounded-xl flex items-center space-x-2 text-sm font-medium ${
                    message.type === "success" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                    {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Main Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Delivery Enable Toggle */}
                <div className={`${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm space-y-3`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className={`font-semibold ${theme.textHeading}`}>Delivery Available</h3>
                            <p className={`text-xs ${theme.textSecondary}`}>
                                Toggle store visibility for mobile app delivery customers.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={deliverySettings.deliveryEnabled}
                                onChange={(e) => handleChange("deliveryEnabled", e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                {/* 2. Auto Accept Toggle */}
                <div className={`${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm space-y-3`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className={`font-semibold ${theme.textHeading}`}>Auto Accept Online Orders</h3>
                            <p className={`text-xs ${theme.textSecondary}`}>
                                If enabled, orders automatically accept. If disabled, orders require manual accept/reject in Requests tab.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={deliverySettings.autoAccept}
                                onChange={(e) => handleChange("autoAccept", e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                {/* 3. Deliverable Radius */}
                <div className={`${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm space-y-2`}>
                    <div className={`flex items-center space-x-2 font-semibold ${theme.textHeading}`}>
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span>Deliverable Radius (KM)</span>
                    </div>
                    <p className={`text-xs ${theme.textSecondary}`}>
                        Default: 5 km. Shops will only be listed for customers within this distance.
                    </p>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={deliverySettings.deliverableRadiusKm}
                        onChange={(e) => handleChange("deliverableRadiusKm", Number(e.target.value))}
                        className={`w-full px-3.5 py-2 border rounded-xl ${theme.inputBg} ${theme.inputBorder} ${theme.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                </div>

                {/* 4. Delivery Charge Rate per KM */}
                <div className={`${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm space-y-2`}>
                    <div className={`flex items-center space-x-2 font-semibold ${theme.textHeading}`}>
                        <Banknote className="w-4 h-4 text-emerald-500" />
                        <span>Delivery Rate per KM (₹)</span>
                    </div>
                    <p className={`text-xs ${theme.textSecondary}`}>
                        Default: ₹1 per km. Used to calculate distance-based delivery fee.
                    </p>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={deliverySettings.deliveryFeePerKm}
                        onChange={(e) => handleChange("deliveryFeePerKm", Number(e.target.value))}
                        className={`w-full px-3.5 py-2 border rounded-xl ${theme.inputBg} ${theme.inputBorder} ${theme.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                </div>

                {/* 5. Default Delivery Boy Role */}
                <div className={`${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm space-y-2`}>
                    <label className={`block text-sm font-semibold ${theme.textHeading}`}>
                        Default Delivery Partner Role
                    </label>
                    <p className={`text-xs ${theme.textSecondary}`}>
                        Users with this role will receive delivery requests and 1-minute alert sounds.
                    </p>
                    <CommonSelect
                        options={roleOptions}
                        value={deliverySettings.deliveryBoyRoleId}
                        onChange={(val) => handleChange("deliveryBoyRoleId", val)}
                        className="w-full"
                    />
                </div>

                {/* 6. Settlement Frequency */}
                <div className={`${theme.surfaceBg} p-6 rounded-2xl border ${theme.borderLight} shadow-sm space-y-2`}>
                    <div className={`flex items-center space-x-2 font-semibold ${theme.textHeading}`}>
                        <Clock className="w-4 h-4 text-purple-500" />
                        <span>Settlement Frequency</span>
                    </div>
                    <p className={`text-xs ${theme.textSecondary}`}>
                        Default: By Day. Frequency to settle collected payments with delivery partners.
                    </p>
                    <CommonSelect
                        options={frequencyOptions}
                        value={deliverySettings.settlementFrequency}
                        onChange={(val) => handleChange("settlementFrequency", val)}
                        className="w-full"
                    />
                </div>

            </div>
        </div>
    );
};

export default DeliverySettings;
