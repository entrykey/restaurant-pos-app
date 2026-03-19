import React, { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    Package,
    Palette,
    Save,
    RefreshCw,
    Shield,
    History,
    Search
} from "lucide-react";
import AttributeSettings from "./AttributeSettings";
import UnitSettings from "./UnitSettings";
import CategorySettings from "./CategorySettings";
import AppearanceSettings from "./AppearanceSettings";
import TaxSettings from "./TaxSettings";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { useTheme } from "../../context/ThemeContext";
import CommonTable from "../../components/CommonTable";
import DatePicker from "../../components/ui/DatePicker";
import { settingService, roleService } from "../../services/api";
import CommonSelect from "../../components/ui/CommonSelect";
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
    const { theme } = useTheme();
    const canViewGeneral = hasPermissionFor?.(ROUTE_ACCESS.SETTINGS.module, ROUTE_ACCESS.SETTINGS.resource, ROUTE_ACCESS.SETTINGS.action);
    const canViewAttributes = hasPermissionFor?.('settings', 'inventory_settings', 'manage');
    const canViewAppearance = hasPermissionFor?.('settings', 'settings', 'appearence_settings');
    const isSuperAdmin = currentUser?.isSuperAdmin === true;

    const allTabs = [
        { id: "general", label: "General", icon: Shield, show: isSuperAdmin || canViewGeneral },
        { id: "attributes", label: "Inventory Settings", icon: Package, show: canViewAttributes },
        { id: "appearance", label: "Appearance", icon: Palette, show: canViewAppearance || isSuperAdmin },
        { id: "activity", label: "Activity", icon: History, show: canViewGeneral },
    ];

    // Initialize state properly by picking the first visible tab
    const [activeTab, setActiveTab] = useState(() => {
        const visibleTab = allTabs.find(t => t.show !== false);
        return visibleTab ? visibleTab.id : "";
    });

    const [newTableName, setNewTableName] = useState("");
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableArea, setNewTableArea] = useState("AC");
    const [logSearch, setLogSearch] = useState("");
    const [logDateFilter, setLogDateFilter] = useState(
        new Date().toISOString().split("T")[0]
    );

    // Backend Settings State
    const [backendSettings, setBackendSettings] = useState([]);
    const [originalSettings, setOriginalSettings] = useState([]);
    const [isLoadingBackend, setIsLoadingBackend] = useState(false);
    const [isSavingBackend, setIsSavingBackend] = useState(false);
    const [systemRoles, setSystemRoles] = useState([]);

    // Role Edit State
    const [isRoleEditorOpen, setIsRoleEditorOpen] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState(null);

    useEffect(() => {
        if (activeTab === "general" && (isSuperAdmin || canViewGeneral)) {
            fetchBackendSettings();
            if (isSuperAdmin) {
                fetchSystemRoles();
            }
        }
    }, [activeTab, isSuperAdmin, canViewGeneral]);

    const fetchBackendSettings = async () => {
        setIsLoadingBackend(true);
        try {
            // Respect currently selected shop context
            const shopId = currentUser?.shop_id;
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
    };

    const fetchSystemRoles = async () => {
        try {
            const roles = await roleService.getRoles({ isSystemRole: true });
            setSystemRoles(roles || []);
        } catch (error) {
            console.error("Failed to fetch system roles:", error);
        }
    };

    const handleUpdateBackendSetting = (key, value) => {
        setBackendSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const handleSaveBackendSetting = async (setting) => {
        setIsSavingBackend(true);
        try {
            const shopId = currentUser?.shop_id;
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

    if (!canViewGeneral && !canViewAttributes && !isSuperAdmin) {
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

    const filteredLogs = authLogs.filter((log) => {
        const matchesSearch =
            log.role.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.phone.includes(logSearch);
        const matchesDate = !logDateFilter || log.date === logDateFilter;
        return matchesSearch && matchesDate;
    });

    const tabs = allTabs.filter(t => t.show !== false);

    const renderSettingInput = (setting) => {
        const { key, value, type, meta } = setting;

        if (meta?.inputType === 'select') {
            const options = key === 'DEFAULT_SHOP_OWNER_ROLE' ? systemRoles : (meta.options || []);
            return (
                <div className="flex items-center gap-2 w-full">
                    <CommonSelect
                        options={options}
                        value={value}
                        onChange={(val) => handleUpdateBackendSetting(key, val)}
                        labelKey={key === 'DEFAULT_SHOP_OWNER_ROLE' ? "name" : "label"}
                        valueKey={key === 'DEFAULT_SHOP_OWNER_ROLE' ? "_id" : "value"}
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
                                {backendSettings.filter(s => isSuperAdmin ? s.isSystem : !s.isSystem).map((setting) => (
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

            case "attributes":
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {!isSuperAdmin && (
                            <>
                                <CategorySettings />
                                <TaxSettings />
                            </>
                        )}
                        {isSuperAdmin && (
                            <>
                                <UnitSettings />
                                <AttributeSettings />
                            </>
                        )}
                    </div>
                );

            case "appearance":
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <AppearanceSettings />
                    </div>
                );

            case "activity":
                return (
                    <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 ${theme.primaryIconBg} rounded-2xl ${theme.primaryIconText}`}>
                                    <History size={24} />
                                </div>
                                <h3 className={`text-xl font-bold ${theme.textHeading}`}>Login Activity Logs</h3>
                            </div>
                            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                <div className="relative">
                                    <Search
                                        className={`absolute left-3 top-3 ${theme.textSecondary}`}
                                        size={16}
                                    />
                                    <input
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        placeholder="Search Role/Phone..."
                                        className={`pl-10 p-2.5 border ${theme.inputBorder} rounded-xl ${theme.inputBg} text-sm ${theme.inputFocus} outline-none w-full font-bold ${theme.inputText}`}
                                    />
                                </div>
                                <DatePicker
                                    value={logDateFilter}
                                    onChange={val => setLogDateFilter(val)}
                                />
                            </div>
                        </div>

                        <CommonTable
                            columns={[
                                {
                                    header: "Role", key: "role", render: (value) => (
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${value === "Admin" ? "bg-purple-100 text-purple-600" :
                                            value === "Manager" ? "bg-blue-100 text-blue-600" :
                                                "bg-green-100 text-green-600"
                                            }`}>{value}</span>
                                    )
                                },
                                { header: "Phone", key: "phone", className: `font-bold ${theme.textPrimary}` },
                                { header: "Date", key: "date", className: `${theme.textMuted} text-sm` },
                                { header: "Time", key: "time", className: `font-medium ${theme.textPrimary}` }
                            ]}
                            data={filteredLogs}
                        />
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

            <div className={`inline-flex w-max p-1.5 gap-1 mb-6 shrink-0 no-scrollbar rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm overflow-x-auto`}>
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
