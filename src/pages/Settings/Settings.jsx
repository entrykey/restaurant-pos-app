import React, { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    Package,
    Palette,
    Save,
    RefreshCw,
    Shield,
    History,
    Search,
    Wallet,
    ShoppingBag,
    Printer
} from "lucide-react";
import AttributeSettings from "./AttributeSettings";
import UnitSettings from "./UnitSettings";
import CategorySettings from "./CategorySettings";
import AppearanceSettings from "./AppearanceSettings";
import TaxSettings from "./TaxSettings";
import SaleSettings from "./SaleSettings";
import BarcodeBillSettings from "./BarcodeBillSettings";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { useTheme } from "../../context/ThemeContext";
import CommonTable from "../../components/CommonTable";
import DatePicker from "../../components/ui/DatePicker";
import { settingService, roleService, payrollService } from "../../services/api";
import CommonSelect from "../../components/ui/CommonSelect";
import { useApp } from "../../context/AppContext";
import RolePermissionEditor from "./RolePermissionEditor";

const Settings = ({
    settings,
    setSettings,
    tables,
    setTables,
    authLogs,
    hasPermissionFor,
    currentUser,
}) => {
    const { theme, themeName } = useTheme();
    const { activeBranchId, branches, currentShopId, businessTypeData } = useApp();
    const currentBranchId = activeBranchId || (branches.length > 0 ? (branches[0]._id || branches[0].id) : null);
    const canViewGeneral = hasPermissionFor?.(ROUTE_ACCESS.SETTINGS.module, ROUTE_ACCESS.SETTINGS.resource, ROUTE_ACCESS.SETTINGS.action);
    const canViewSaleSettings = hasPermissionFor?.(ROUTE_ACCESS.SALE_SETTINGS.module, ROUTE_ACCESS.SALE_SETTINGS.resource, ROUTE_ACCESS.SALE_SETTINGS.action);
    const canViewAttributes = hasPermissionFor?.('settings', 'inventory_settings', 'manage');
    const canViewAppearance = hasPermissionFor?.('settings', 'settings', 'appearence_settings');
    const canViewPayroll = hasPermissionFor?.(ROUTE_ACCESS.PAYROLL_SETTINGS.module, ROUTE_ACCESS.PAYROLL_SETTINGS.resource, ROUTE_ACCESS.PAYROLL_SETTINGS.action);
    const canViewBarcodeBill = hasPermissionFor?.(ROUTE_ACCESS.BARCODE_BILL_SETTINGS.module, ROUTE_ACCESS.BARCODE_BILL_SETTINGS.resource, ROUTE_ACCESS.BARCODE_BILL_SETTINGS.action);
    const isSuperAdmin = currentUser?.isSuperAdmin === true;

    const allTabs = [
        { id: "general", label: "General", icon: Shield, show: isSuperAdmin || canViewGeneral },
        { id: "sale-settings", label: "Sale Settings", icon: ShoppingBag, show: isSuperAdmin || canViewSaleSettings },
        { id: "payroll", label: "Payroll", icon: Wallet, show: isSuperAdmin || canViewPayroll },
        { id: "attributes", label: "Inventory Settings", icon: Package, show: canViewAttributes },
        { id: "barcode-bill", label: "Barcode & Bill", icon: Printer, show: isSuperAdmin || canViewBarcodeBill },
        { id: "appearance", label: "Appearance", icon: Palette, show: canViewAppearance || isSuperAdmin },
    ];

    // Initialize state properly by picking the first visible tab
    const [activeTab, setActiveTab] = useState(() => {
        const visibleTab = allTabs.find(t => t.show !== false);
        return visibleTab ? visibleTab.id : "";
    });

    const [newTableName, setNewTableName] = useState("");
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableArea, setNewTableArea] = useState("AC");


    // Backend Settings State
    const [backendSettings, setBackendSettings] = useState([]);
    const [originalSettings, setOriginalSettings] = useState([]);
    const [isLoadingBackend, setIsLoadingBackend] = useState(false);
    const [isSavingBackend, setIsSavingBackend] = useState(false);
    const [systemRoles, setSystemRoles] = useState([]);

    // Role Edit State
    const [isRoleEditorOpen, setIsRoleEditorOpen] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [payrollSettings, setPayrollSettings] = useState({
        periodStartDay: 1,
        periodEndDay: 30,
        salaryBasis: 'monthly',
        workingDaysInMonth: 30,
        overtimeRate: 0,
        lateGracePeriod: 0
    });
    const [isSavingPayroll, setIsSavingPayroll] = useState(false);

    const fetchBackendSettings = React.useCallback(async () => {
        setIsLoadingBackend(true);
        try {
            // Respect currently selected shop context
            const shopId = currentShopId || currentUser?.shopId || currentUser?.shopId || currentUser?.shop_id;
            const data = await settingService.getSettings(shopId);
            setBackendSettings(data || []);
            setOriginalSettings(JSON.parse(JSON.stringify(data || []))); // Deep copy

            // Sync with global settings context
            if (data && Array.isArray(data)) {
                const settingsMap = {};
                data.forEach(s => {
                    settingsMap[s.key] = s.value;
                });
                setSettings(prev => ({ ...prev, ...settingsMap }));
            }
        } catch (error) {
            console.error("Failed to fetch backend settings:", error);
        } finally {
            setIsLoadingBackend(false);
        }
    }, [currentShopId, currentUser?.shopId || currentUser?.shop_id, currentUser?.shopId, setSettings]);

    const fetchSystemRoles = React.useCallback(async () => {
        try {
            const roles = await roleService.getRoles({ isSystemRole: true });
            setSystemRoles(roles || []);
        } catch (error) {
            console.error("Failed to fetch system roles:", error);
        }
    }, []);

    const fetchPayrollSettings = React.useCallback(async () => {
        try {
            const shopId = currentShopId || currentUser?.shopId || currentUser?.shop_id || currentUser?.shopId;
            if (!shopId || shopId === 'undefined') return;
            const data = await payrollService.getSettings(shopId);
            if (data) setPayrollSettings(data);
        } catch (error) {
            console.error("Failed to fetch payroll settings:", error);
        }
    }, [currentShopId, currentUser?.shopId || currentUser?.shop_id, currentUser?.shopId]);

    useEffect(() => {
        if (activeTab === "general" && (isSuperAdmin || canViewGeneral)) {
            fetchBackendSettings();
            if (isSuperAdmin) {
                fetchSystemRoles();
            }
        }
        if (activeTab === "payroll" && (isSuperAdmin || canViewPayroll)) {
            fetchPayrollSettings();
        }
    }, [activeTab, isSuperAdmin, canViewGeneral, canViewPayroll, fetchBackendSettings, fetchSystemRoles, fetchPayrollSettings]);

    const handleSavePayrollSettings = async () => {
        setIsSavingPayroll(true);
        try {
            const shopId = currentShopId || currentUser?.shopId || currentUser?.shop_id || currentUser?.shopId;
            console.log("Attempting to save payroll settings for ShopId:", shopId, "Payload:", payrollSettings);
            if (!shopId || shopId === 'undefined') {
                alert(`Configuration Error: Shop ID is missing. Please refresh.`);
                return;
            }
            await payrollService.saveSettings(shopId, payrollSettings);
            alert("Payroll settings saved successfully");
        } catch (error) {
            console.error("Failed to save payroll settings:", error);
            alert("Failed to save payroll settings");
        } finally {
            setIsSavingPayroll(false);
        }
    };

    const handleUpdateBackendSetting = (key, value) => {
        setBackendSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const handleSaveBackendSetting = async (setting) => {
        setIsSavingBackend(true);
        try {
            const shopId = currentShopId || currentUser?.shopId || currentUser?.shop_id || currentUser?.shopId;
            const updatedSetting = await settingService.updateSetting(setting.key, {
                value: setting.value,
                shopId: shopId
            });

            // Update original settings to match the saved value so the button hides
            setOriginalSettings(prev => prev.map(s => s.key === setting.key ? updatedSetting : s));

            // Update global settings context so other components (like POS) reflect the change immediately
            setSettings(prev => ({
                ...prev,
                [setting.key]: setting.value
            }));

            alert(`Setting ${setting.displayString} updated successfully`);
        } catch (error) {
            console.error("Failed to update setting:", error);
            alert("Failed to update setting");
        } finally {
            setIsSavingBackend(false);
        }
    };

    if (!canViewGeneral && !canViewAttributes && !canViewBarcodeBill && !isSuperAdmin) {
        return (
            <div className={`p-8 text-center ${theme.textSecondary} font-bold`}>
                You don't have permission to access settings.
            </div>
        );
    }

    const handleAddTable = () => {
        const nextId =
            tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
        const name = newTableName.trim() || `Table ${nextId}`;
        setTables([
            ...tables,
            {
                id: nextId,
                name,
                status: "available",
                order: null,
                startTime: null,
                capacity: parseInt(newTableCapacity) || 4,
                area: newTableArea || "AC",
                isMaintenance: false,
            },
        ]);
        setNewTableName("");
    };



    const tabs = allTabs.filter(t => t.show !== false);

    const renderSettingInput = (setting) => {
        const { key, value, type, meta } = setting;

        if (meta?.inputType === 'select') {
            const options = key === 'DEFAULT_SHOP_OWNER_ROLE' ? systemRoles.map(r => ({ label: r.name, value: r._id })) : (meta.options || []);
            
            // Binary Toggle for exactly 2 options
            if (options.length === 2 && key !== 'DEFAULT_SHOP_OWNER_ROLE') {
                return (
                    <div 
                        className={`relative w-44 h-11 ${themeName === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'} rounded-2xl flex p-1.5 cursor-pointer selection-none relative`}
                        onClick={() => {
                            const opt0 = typeof options[0] === 'object' ? options[0].value : options[0];
                            const opt1 = typeof options[1] === 'object' ? options[1].value : options[1];
                            const newValue = value === opt0 ? opt1 : opt0;
                            handleUpdateBackendSetting(key, newValue);
                        }}
                    >
                        {/* Sliding Background */}
                        <div 
                            className={`absolute w-[calc(50%-6px)] h-[calc(100%-12px)] ${theme.buttonBg} rounded-xl shadow-lg transition-all duration-300 ease-out`}
                            style={{ 
                                transform: value === (typeof options[1] === 'object' ? options[1].value : options[1]) ? 'translateX(100%)' : 'translateX(0)'
                            }}
                        />
                        
                        {/* Labels */}
                        {options.map((opt) => {
                            const label = typeof opt === 'object' ? opt.label : opt;
                            const optValue = typeof opt === 'object' ? opt.value : opt;
                            return (
                                <div 
                                    key={optValue}
                                    className={`flex-1 flex items-center justify-center z-10 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                                        value === optValue ? 'text-white' : (themeName === 'dark' ? 'text-slate-400' : 'text-slate-500')
                                    }`}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                );
            }

            return (
                <div className="flex items-center gap-2 w-full">
                    <CommonSelect
                        options={options}
                        value={value}
                        onChange={(val) => handleUpdateBackendSetting(key, val)}
                        labelKey={(options.length > 0 && typeof options[0] === 'string') ? null : "label"}
                        valueKey={(options.length > 0 && typeof options[0] === 'string') ? null : "value"}
                        className="flex-1"
                    />
                    {key === 'DEFAULT_SHOP_OWNER_ROLE' && value && (
                        <button
                            onClick={() => { setEditingRoleId(value); setIsRoleEditorOpen(true); }}
                            className={`p-2.5 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all font-bold text-sm whitespace-nowrap`}
                            title="Configure Modules & Permissions for this Role"
                        >
                            <SettingsIcon size={18} />
                        </button>
                    )}
                </div>
            );
        }

        switch (type) {
            case 'boolean':
                return (
                    <button
                        onClick={() => handleUpdateBackendSetting(key, !value)}
                        className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${value ? theme.buttonBg : "bg-gray-300"}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${value ? "translate-x-6" : ""}`} />
                    </button>
                );
            case 'number':
                return (
                    <input
                        type="number"
                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                        value={value}
                        onChange={(e) => handleUpdateBackendSetting(key, parseFloat(e.target.value))}
                    />
                );
            default:
                return (
                    <input
                        className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                        value={value}
                        onChange={(e) => handleUpdateBackendSetting(key, e.target.value)}
                    />
                );
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case "general":
                return (
                    <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className="flex items-center justify-between">
                            <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                                <Shield className={theme.primaryIconText} /> General System Settings
                            </h3>
                            <button
                                onClick={fetchBackendSettings}
                                disabled={isLoadingBackend}
                                className={`p-2 rounded-xl ${theme.inputBg} ${theme.textSecondary} hover:${theme.textPrimary} transition-all`}
                            >
                                <RefreshCw size={18} className={isLoadingBackend ? "animate-spin" : ""} />
                            </button>
                        </div>

                        {isLoadingBackend ? (
                            <div className="py-20 text-center">
                                <RefreshCw className="animate-spin mx-auto mb-4 text-indigo-500" size={40} />
                                <p className={`font-bold ${theme.textSecondary}`}>Loading system settings...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {backendSettings.filter(s => {
                                    const printSettingsKeys = [
                                        'BARCODE_PRINT_SETTINGS', 'BILL_PRINT_SETTINGS', 'PURCHASE_INVOICE_SETTINGS'
                                    ];
                                    if (printSettingsKeys.includes(s.key)) return false;
                                    if (isSuperAdmin) return s.isSystem;
                                    // For shop owners, show them all settings EXCEPT superadmin-only or settings that belong to other tabs
                                    const saleSettingsKeys = [
                                        'SALE_MARKING_TYPE', 'SALE_MARKING_TIME',
                                        'ENABLE_STOCK_ITEMS', 'ENABLE_MANUFACTURED_ITEMS', 'ENABLE_TRADE_ITEMS',
                                        'ALLOW_CREDIT_PAYMENT', 'RESET_INVOICE_NUMBER_YEARLY'
                                    ];
                                    if (['DEFAULT_SHOP_OWNER_ROLE', 'SUBSCRIPTION_METHOD', 'ALLOW_UNSAFE_REGISTRATION'].includes(s.key)) return false;
                                    if (saleSettingsKeys.includes(s.key)) return false;
                                    
                                    // Filter based on business type features
                                    if (s.key === 'ENABLE_STOCK_ITEMS' && businessTypeData?.features?.sellStockItems === false) return false;
                                    if (s.key === 'ENABLE_MANUFACTURED_ITEMS' && businessTypeData?.features?.sellManufacturedItems === false) return false;
                                    if (s.key === 'ENABLE_TRADE_ITEMS' && businessTypeData?.features?.sellTradeItems === false) return false;

                                    return true;
                                }).map((setting) => (
                                    <div key={setting.key} className={`p-6 ${theme.inputBg} rounded-3xl border ${theme.inputBorder} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-black ${theme.textHeading}`}>{setting.displayString}</h4>
                                                {setting.isSystem && (
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase">System</span>
                                                )}
                                            </div>
                                            <p className={`text-xs ${theme.textSecondary} max-w-md`}>{setting.description}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="min-w-[200px]">
                                                {renderSettingInput(setting)}
                                            </div>
                                            {backendSettings.find(s => s.key === setting.key)?.value !== originalSettings.find(s => s.key === setting.key)?.value && (
                                                <button
                                                    onClick={() => handleSaveBackendSetting(setting)}
                                                    disabled={isSavingBackend}
                                                    className={`p-4 ${theme.buttonBg} ${theme.buttonText} rounded-2xl shadow-lg hover:scale-105 transition-all disabled:opacity-50 animate-in zoom-in-50 duration-200`}
                                                    title="Save Changes"
                                                >
                                                    <Save size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {backendSettings.length === 0 && (
                                    <div className="py-10 text-center border-2 border-dashed rounded-3xl border-gray-100 italic text-gray-400 font-bold">
                                        No general settings found in the system.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "sale-settings":
                return (
                    <SaleSettings 
                        backendSettings={backendSettings}
                        handleUpdateBackendSetting={handleUpdateBackendSetting}
                        handleSaveBackendSetting={handleSaveBackendSetting}
                        isSaving={isSavingBackend}
                    />
                );

            case "attributes":
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {isSuperAdmin && <UnitSettings />}
                        {!isSuperAdmin && <CategorySettings />}
                        <AttributeSettings />
                        {isSuperAdmin && <TaxSettings />}
                    </div>
                );

            case "appearance":
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <AppearanceSettings />
                    </div>
                );

            case "barcode-bill":
                return (
                    <BarcodeBillSettings currentUser={currentUser} />
                );



            case "payroll":
                return (
                    <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 ${theme.primaryIconBg} rounded-2xl ${theme.primaryIconText}`}>
                                <Wallet size={24} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Payroll Configuration</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Monthly Cycle Start Day</label>
                                <input
                                    type="number" min="1" max="31"
                                    value={payrollSettings.periodStartDay}
                                    onChange={(e) => setPayrollSettings({ ...payrollSettings, periodStartDay: e.target.value })}
                                    className={`w-full p-4 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-2xl outline-none ${theme.inputFocus} font-bold`}
                                />
                                <p className={`text-[10px] ${theme.textMuted}`}>The date each month when the salary period begins (e.g. 1st or 21st).</p>
                            </div>
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Monthly Cycle End Day</label>
                                <input
                                    type="number" min="1" max="31"
                                    value={payrollSettings.periodEndDay}
                                    onChange={(e) => setPayrollSettings({ ...payrollSettings, periodEndDay: e.target.value })}
                                    className={`w-full p-4 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-2xl outline-none ${theme.inputFocus} font-bold`}
                                />
                                <p className={`text-[10px] ${theme.textMuted}`}>The date each month when the salary period ends.</p>
                            </div>
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Salary Calculation Basis</label>
                                <CommonSelect
                                    options={[
                                        { label: 'Monthly Fixed', value: 'monthly' },
                                        { label: 'Daily Based', value: 'daily' }
                                    ]}
                                    value={payrollSettings.salaryBasis}
                                    onChange={(val) => setPayrollSettings({ ...payrollSettings, salaryBasis: val })}
                                    labelKey="label"
                                    valueKey="value"
                                />
                                <p className={`text-[10px] ${theme.textMuted}`}>{payrollSettings.salaryBasis === 'monthly' ? "Full month salary is fixed; absents are deducted." : "Salary is calculated per day present."}</p>
                            </div>
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Working Days in Month</label>
                                <input
                                    type="number"
                                    value={payrollSettings.workingDaysInMonth}
                                    onChange={(e) => setPayrollSettings({ ...payrollSettings, workingDaysInMonth: e.target.value })}
                                    className={`w-full p-4 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-2xl outline-none ${theme.inputFocus} font-bold`}
                                />
                                <p className={`text-[10px] ${theme.textMuted}`}>Average working days (e.g. 26 or 30). Used for per-day deduction math.</p>
                            </div>
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Overtime Rate Multiplier</label>
                                <input
                                    type="number" step="0.1"
                                    value={payrollSettings.overtimeRate}
                                    onChange={(e) => setPayrollSettings({ ...payrollSettings, overtimeRate: e.target.value })}
                                    className={`w-full p-4 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-2xl outline-none ${theme.inputFocus} font-bold`}
                                />
                                <p className={`text-[10px] ${theme.textMuted}`}>Multiplier for overtime pay (e.g., 1.5 for time-and-a-half). Set to 0 to disable.</p>
                            </div>
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>Late Arrival Grace Period (Mins)</label>
                                <input
                                    type="number"
                                    value={payrollSettings.lateGracePeriod}
                                    onChange={(e) => setPayrollSettings({ ...payrollSettings, lateGracePeriod: e.target.value })}
                                    className={`w-full p-4 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-2xl outline-none ${theme.inputFocus} font-bold`}
                                />
                                <p className={`text-[10px] ${theme.textMuted}`}>Minutes allowed after shift start before being marked late. Set to 0 to disable.</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t flex justify-end">
                            <button
                                onClick={handleSavePayrollSettings}
                                disabled={isSavingPayroll}
                                className={`px-10 py-5 ${theme.buttonBg} ${theme.buttonText} rounded-3xl font-black text-xs uppercase tracking-[0.15em] shadow-xl hover:scale-105 transition-all disabled:opacity-50`}
                            >
                                {isSavingPayroll ? "Saving..." : "Update Payroll Rules"}
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`p-4 md:p-8 h-full overflow-hidden flex flex-col ${theme.pageBg}`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-6 flex items-center shrink-0 ${theme.textHeading}`}>
                <SettingsIcon className={`mr-3 ${theme.primaryIconText}`} /> Control Center
            </h2>

            <div className={`flex w-full xl:w-max p-1.5 gap-1 mb-6 shrink-0 no-scrollbar rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm overflow-x-auto`}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap
                                ${isActive
                                    ? `${theme.buttonBg} ${theme.buttonText} shadow-md`
                                    : `bg-transparent ${theme.textSecondary} hover:${theme.inputBg.replace('bg-', '')} hover:${theme.textPrimary}`
                                }
                            `}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto pb-20 pt-2 custom-scrollbar">
                {renderContent()}
            </div>

            <RolePermissionEditor
                isOpen={isRoleEditorOpen}
                onClose={() => { setIsRoleEditorOpen(false); setEditingRoleId(null); }}
                roleId={editingRoleId}
            />
        </div>
    );
};

export default Settings;
